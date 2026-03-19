'use client';
import { useState, useMemo } from 'react';
import {
    Modal, Button, TextInput, NumberInput, Select, 
    Stack, Group, Text, Paper, Divider, ThemeIcon, Badge
} from '@mantine/core';
import { IconSettings, IconEngine, IconTools, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function ModalDetallarFalla({ opened, onClose, hallazgo, activo, onSuccess }) {
    const [loading, setLoading] = useState(false);

    // 1. Estado para la caracterización
    const [datos, setDatos] = useState({
        subsistemaId: '',          // ID si ya existe
        nuevoSubsistemaNombre: '', // Texto si es nuevo
        nombrePieza: '',           // Nombre del componente (Inyector, Turbo, etc)
        cantidadSlots: 1,          // ¿Cuántos lleva este vehículo? (6 inyectores, 1 turbo)
        impacto: hallazgo?.impacto || 'Operativo'
    });

    // 2. Opciones de subsistemas ya existentes en este activo
    const subsistemasExistentes = activo.subsistemasInstancia?.map(sub => ({
        value: sub.id.toString(),
        label: sub.nombre
    })) || [];

    const opcionesSubsistemas = [
        { value: 'NUEVO', label: '+ CREAR NUEVO ÁREA/SUBSISTEMA' },
        ...subsistemasExistentes
    ];

    const handleSubmit = async () => {
        if (!datos.subsistemaId && !datos.nuevoSubsistemaNombre) {
            return notifications.show({ title: 'Atención', message: 'Debe seleccionar o nombrar un subsistema', color: 'orange' });
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/gestionMantenimiento/hallazgos/${hallazgo.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activoId: activo.id,
                    vehiculoId: activo.vehiculoInstancia?.vehiculoId, // Para actualizar la plantilla global
                    ...datos
                })
            });

            const data = await res.json();
            if (data.success) {
                notifications.show({ title: 'Falla Caracterizada', message: 'Se ha actualizado la anatomía del activo.', color: 'green' });
                onSuccess(); // Recarga el ActivoDetalle
                onClose();
            } else {
                throw new Error(data.error);
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
            title={<Text fw={900} size="lg" tt="uppercase">Detallar Hallazgo #{hallazgo?.id}</Text>}
            size="md"
            centered
        >
            <Stack>
                <Paper withBorder p="md" bg="blue.0">
                    <Text size="xs" fw={700} c="blue.9" tt="uppercase">Reporte Original:</Text>
                    <Text fw={800} size="sm" c="dark.8">"{hallazgo?.descripcion}"</Text>
                </Paper>

                <Divider label="Vincular a la anatomía del equipo" labelPosition="center" />

                {/* SELECCIÓN DE SUBSISTEMA */}
                <Select
                    label="¿A qué área pertenece esta falla?"
                    placeholder="Seleccione área de incidencia"
                    data={opcionesSubsistemas}
                    value={datos.subsistemaId}
                    onChange={(val) => setDatos({ ...datos, subsistemaId: val })}
                    leftSection={<IconEngine size={18} />}
                />

                {/* SI ES NUEVO, PEDIMOS EL NOMBRE */}
                {datos.subsistemaId === 'NUEVO' && (
                    <TextInput
                        label="Nombre del Nuevo Subsistema"
                        placeholder="Ej: Motor, Sistema Hidráulico, Aire Acondicionado..."
                        value={datos.nuevoSubsistemaNombre}
                        onChange={(e) => setDatos({ ...datos, nuevoSubsistemaNombre: e.target.value })}
                        autoFocus
                    />
                )}

                {/* DETALLE DEL COMPONENTE / PIEZA */}
                <Paper withBorder p="md" radius="sm">
                    <Stack gap="sm">
                        <TextInput
                            label="Componente Específico (Opcional)"
                            placeholder="Ej: Inyector, Alternador, Filtro..."
                            description="Si conoces la pieza exacta, nómbrala aquí."
                            value={datos.nombrePieza}
                            onChange={(e) => setDatos({ ...datos, nombrePieza: e.target.value })}
                            leftSection={<IconSettings size={18} />}
                        />

                        {/* Si la pieza es nueva, definimos su 'población' en el camión */}
                        {datos.nombrePieza && (
                            <NumberInput
                                label={`¿Cuántos "${datos.nombrePieza}" tiene este equipo en total?`}
                                description="Esto creará los espacios (slots) para los seriales."
                                min={1}
                                value={datos.cantidadSlots}
                                onChange={(val) => setDatos({ ...datos, cantidadSlots: val })}
                            />
                        )}
                    </Stack>
                </Paper>

                <Group justify="flex-end" mt="xl">
                    <Button variant="subtle" color="gray" onClick={onClose}>Cancelar</Button>
                    <Button 
                        color="blue.7" 
                        leftSection={<IconCheck size={18} />} 
                        onClick={handleSubmit}
                        loading={loading}
                    >
                        GUARDAR Y VINCULAR
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}