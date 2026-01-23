"use client";
import { useState, useEffect } from "react";
import { 
    Modal, Button, Select, Text, Group, Stack, NumberInput, 
    Textarea, Alert, LoadingOverlay 
} from "@mantine/core";
import { IconAlertCircle, IconWallet } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

export default function ModalConfirmarPago({ opened, onClose, empleado, totalPagar, moneda, onPagoSuccess }) {
    const [cuentas, setCuentas] = useState([]);
    const [loadingCuentas, setLoadingCuentas] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [cuentaId, setCuentaId] = useState(null);
    const [monto, setMonto] = useState(totalPagar || 0);
    const [notas, setNotas] = useState("");

    // Actualizar monto si cambia el empleado seleccionado
    useEffect(() => {
        if (totalPagar) setMonto(totalPagar);
    }, [totalPagar]);

    // Cargar Cuentas Bancarias al abrir
    useEffect(() => {
        if (opened) {
            setLoadingCuentas(true);
            fetch('/api/tesoreria/cuentas-bancarias') // Ajusta tu endpoint de cuentas
                .then(res => res.json())
                .then(data => {
                    // Filtrar solo las que tengan la misma moneda del pago (opcional pero recomendado)
                    // const cuentasCompatibles = data.filter(c => c.moneda === moneda);
                    setCuentas(data); 
                })
                .catch(err => console.error(err))
                .finally(() => setLoadingCuentas(false));
        }
    }, [opened, moneda]);

    const handleConfirmar = async () => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/rrhh/pagos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    empleadoId: empleado.id,
                    monto: monto,
                    moneda: moneda,
                    cuentaBancariaId: cuentaId, // Puede ser null
                    detalles: notas,
                    fecha: new Date()
                })
            });

            if (!res.ok) throw new Error("Error al registrar pago");

            notifications.show({ 
                title: 'Éxito', 
                message: cuentaId ? 'Pago registrado y descontado.' : 'Gasto registrado como Pendiente.', 
                color: 'green' 
            });
            
            onPagoSuccess(empleado.id); // Avisar al padre para actualizar UI
            onClose(); // Cerrar modal

        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setSubmitting(false);
        }
    };

    const hayCuentas = cuentas.length > 0;

    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            title={`Procesar Pago: ${empleado?.nombre} ${empleado?.apellido}`}
            centered
        >
            <LoadingOverlay visible={submitting} />
            
            <Stack>
                {/* Resumen */}
                <Group justify="space-between" bg="gray.1" p="sm" style={{ borderRadius: 8 }}>
                    <Text fw={500}>Monto a Pagar:</Text>
                    <Text fw={700} size="lg" c="green">
                        {moneda === 'bcv' ? 'Bs.' : '$'} {Number(monto).toLocaleString()}
                    </Text>
                </Group>

                {/* Selección de Cuenta */}
                {loadingCuentas ? (
                    <Text size="sm" c="dimmed">Cargando cuentas...</Text>
                ) : hayCuentas ? (
                    <Select
                        label="Cuenta Bancaria (Origen)"
                        placeholder="Selecciona cuenta para debitar"
                        data={cuentas.map(c => ({ 
                            value: String(c.id), 
                            label: `${c.nombreBanco} - ${c.moneda} (Saldo: ${c.saldoActual})` 
                        }))}
                        value={cuentaId}
                        onChange={setCuentaId}
                        clearable
                        description="Si lo dejas vacío, el gasto quedará como 'Pendiente por Pagar'."
                    />
                ) : (
                    <Alert variant="light" color="orange" title="Sin cuentas bancarias" icon={<IconAlertCircle />}>
                        No hay cuentas bancarias registradas. Puedes hacer la acción de pagar y <b>luego asignar una cuenta bancaria</b>.
                        Se registrará el gasto como "Pendiente".
                    </Alert>
                )}

                <Textarea 
                    label="Notas / Referencia"
                    placeholder="Ej: Pago nómina semana 42"
                    value={notas}
                    onChange={(e) => setNotas(e.currentTarget.value)}
                />

                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={onClose}>Cancelar</Button>
                    <Button 
                        color={!cuentaId ? "orange" : "blue"} 
                        leftSection={!cuentaId ? <IconAlertCircle size={16}/> : <IconWallet size={16}/>}
                        onClick={handleConfirmar}
                        loading={submitting}
                    >
                        {!cuentaId ? "Registrar como Pendiente" : "Confirmar Pago"}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}