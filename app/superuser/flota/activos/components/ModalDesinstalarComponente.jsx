'use client';
import { useState } from 'react';
import { Modal, Button, Text, Group, Stack, Alert, Code, Radio, Textarea } from '@mantine/core';
import { IconAlertTriangle, IconTrash, IconArrowBackUp } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function ModalDesinstalarComponente({ opened, onClose, item, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [motivo, setMotivo] = useState('error'); // 'error' | 'desgaste'
    const [observacion, setObservacion] = useState('');

    const handleUninstall = async () => {
        if (!item) return;
        
        setLoading(true);
        try {
            // Enviamos el motivo y la observación por Query Params
            const params = new URLSearchParams({
                id: item.id,
                motivo: motivo,
                nota: observacion
            });

            const response = await fetch(`/api/gestionMantenimiento/componentes/desinstalar?${params.toString()}`, {
                method: 'DELETE',
            });
            const res = await response.json();
            
            if (res.success) {
                const mensaje = motivo === 'error' 
                    ? 'Componente devuelto al inventario' 
                    : 'Componente dado de baja (Desechado)';
                
                notifications.show({ title: 'Procesado', message: mensaje, color: motivo === 'error' ? 'blue' : 'orange' });
                onSuccess();
                onClose();
            } else {
                throw new Error(res.error || 'Error al procesar');
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            title="Retirar Componente" 
            centered
            size="md"
        >
            <Stack>
                {item && (
                    <Stack gap="xs" bg="gray.0" p="sm" style={{ borderRadius: 8 }}>
                        <Text fw={700} size="md">
                            {item.serialActual || `Cantidad: ${item.cantidad}`}
                        </Text>
                        {item.fichaTecnica && (
                            <Text size="xs" c="dimmed">{item.fichaTecnica.nombre}</Text>
                        )}
                    </Stack>
                )}

                <Radio.Group 
                    label="¿Cuál es el motivo del retiro?" 
                    description="Esto define qué pasará con el stock"
                    value={motivo} 
                    onChange={setMotivo}
                    withAsterisk
                >
                    <Stack mt="xs">
                        <Radio 
                            value="error" 
                            label="Fue un error de registro" 
                            description="El repuesto está nuevo. Regresar al Almacén."
                        />
                        <Radio 
                            value="desgaste" 
                            label="Daño o Fin de Vida Útil" 
                            description="El repuesto se retira y se descarta (Chatarra)."
                            color="orange"
                        />
                    </Stack>
                </Radio.Group>

                {motivo === 'desgaste' && (
                    <Textarea 
                        label="Observación (Opcional)"
                        placeholder="Ej: Pinchazo lateral irreparable, Desgaste irregular..."
                        value={observacion}
                        onChange={(e) => setObservacion(e.target.value)}
                    />
                )}

                <Alert 
                    variant="light" 
                    color={motivo === 'error' ? 'blue' : 'orange'} 
                    title={motivo === 'error' ? "Acción: Devolución" : "Acción: Baja de Activo"} 
                    icon={motivo === 'error' ? <IconArrowBackUp/> : <IconTrash/>}
                >
                    {motivo === 'error' 
                        ? "El stock en almacén AUMENTARÁ." 
                        : "El item quedará marcado como 'Retirado' y NO volverá al stock."}
                </Alert>

                <Group justify="right" mt="md">
                    <Button variant="default" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button 
                        color={motivo === 'error' ? 'blue' : 'red'}
                        onClick={handleUninstall} 
                        loading={loading}
                    >
                        Confirmar Retiro
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}