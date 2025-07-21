// app/superuser/flota/[id]/nuevaInspeccion/InspeccionForm.jsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
    TextInput, Button, Group, Box, Paper, Title, Grid, Select, Textarea, NumberInput, Radio, Stack, Divider, Center, Loader, Text,
    SimpleGrid
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { IconAlertCircle, IconCheck, IconExclamationCircle, IconX } from '@tabler/icons-react';
import { httpPost } from '../../../../ApiFunctions/httpServices';

// Componente para agrupar la lógica de cada sistema inspeccionado
function SistemaInspeccionField({ form, sistemaKey, label }) {
    return (
        <Paper withBorder p="md" radius="md" mb="md">
            <Title order={5} mb="sm">{label}</Title>
            <Radio.Group
                name={`${sistemaKey}.estado`}
                label="Estado"
                required
                {...form.getInputProps(`${sistemaKey}.estado`)}
            >
                <Group mt="xs">
                    <Radio value="Operativo" label="Operativo" icon={IconCheck} color="green" />
                    <Radio value="Advertencia" label="Advertencia" icon={IconExclamationCircle} color="orange" />
                    <Radio value="Fallo Crítico" label="Fallo Crítico" icon={IconX} color="red" />
                    <Radio value="No Aplica" label="No Aplica" />
                </Group>
            </Radio.Group>

            {(form.values[sistemaKey]?.estado === 'Advertencia' || form.values[sistemaKey]?.estado === 'Fallo Crítico') && (
                <Textarea
                    label="Descripción del Hallazgo / Notas"
                    placeholder="Describe el problema encontrado o la advertencia."
                    required
                    autosize
                    minRows={2}
                    {...form.getInputProps(`${sistemaKey}.notas`)}
                    mt="sm"
                />
            )}
        </Paper>
    );
}

export function InspeccionForm({ vehiculoId, lastInspectionData = null }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        initialValues: {
            fechaInspeccion: new Date(),
            kilometrajeInspeccion: 0,
            horometro: 0,
            inspector: '', // Nombre del inspector o ID de empleado
            observacionesGenerales: '',

            // Niveles de Líquidos
            liquidoLimpiaparabrisas: { estado: 'Operativo', notas: '' },
            liquidoRefrigerante: { estado: 'Operativo', notas: '' },
            aceiteMotor: { estado: 'Operativo', notas: '' },
            aceiteTransmision: { estado: 'Operativo', notas: '' },
            aceiteDireccion: { estado: 'Operativo', notas: '' },
            liquidoFrenos: { estado: 'Operativo', notas: '' },

            // Otros Sistemas
            luces: { estado: 'Operativo', notas: '' },
            frenos: { estado: 'Operativo', notas: '' },
            neumaticos: { estado: 'Operativo', notas: '' },
            motor: { estado: 'Operativo', notas: '' },
            transmision: { estado: 'Operativo', notas: '' },
            direccion: { estado: 'Operativo', notas: '' },
            suspension: { estado: 'Operativo', notas: '' },
            bateria: { estado: 'Operativo', notas: '' },
            chasis: { estado: 'Operativo', notas: '' },
            sistemaHidraulico: { estado: 'No Aplica', notas: '' }, // Para equipos pesados
            equiposEspeciales: { estado: 'No Aplica', notas: '' }, // Para coiled tubing, snubbing, etc.
        },
        validate: {
            fechaInspeccion: (value) => (value ? null : 'La fecha de inspección es requerida'),
            kilometrajeInspeccion: (value) => (value >= 0 ? null : 'El kilometraje debe ser un número positivo'),
            horometro: (value) => (value >= 0 ? null : 'El horómetro debe ser un número positivo'),
            inspector: (value) => (value ? null : 'El nombre del inspector es requerido'),

            // Validaciones para los estados de los sistemas, si son 'Advertencia' o 'Fallo Crítico' requieren notas
            'liquidoLimpiaparabrisas.notas': (value, values) => (values.liquidoLimpiaparabrisas.estado !== 'Operativo' && values.liquidoLimpiaparabrisas.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
            'liquidoRefrigerante.notas': (value, values) => (values.liquidoRefrigerante.estado !== 'Operativo' && values.liquidoRefrigerante.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
            'aceiteMotor.notas': (value, values) => (values.aceiteMotor.estado !== 'Operativo' && values.aceiteMotor.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
            'aceiteTransmision.notas': (value, values) => (values.aceiteTransmision.estado !== 'Operativo' && values.aceiteTransmision.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
            'aceiteDireccion.notas': (value, values) => (values.aceiteDireccion.estado !== 'Operativo' && values.aceiteDireccion.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
            'liquidoFrenos.notas': (value, values) => (values.liquidoFrenos.estado !== 'Operativo' && values.liquidoFrenos.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),

            'luces.notas': (value, values) => (values.luces.estado !== 'Operativo' && values.luces.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
            'frenos.notas': (value, values) => (values.frenos.estado !== 'Operativo' && values.frenos.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
            'neumaticos.notas': (value, values) => (values.neumaticos.estado !== 'Operativo' && values.neumaticos.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
            'motor.notas': (value, values) => (values.motor.estado !== 'Operativo' && values.motor.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
            'transmision.notas': (value, values) => (values.transmision.estado !== 'Operativo' && values.transmision.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
            'direccion.notas': (value, values) => (values.direccion.estado !== 'Operativo' && values.direccion.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
            'suspension.notas': (value, values) => (values.suspension.estado !== 'Operativo' && values.suspension.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
            'bateria.notas': (value, values) => (values.bateria.estado !== 'Operativo' && values.bateria.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
            'chasis.notas': (value, values) => (values.chasis.estado !== 'Operativo' && values.chasis.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
            'sistemaHidraulico.notas': (value, values) => (values.sistemaHidraulico.estado !== 'Operativo' && values.sistemaHidraulico.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
            'equiposEspeciales.notas': (value, values) => (values.equiposEspeciales.estado !== 'Operativo' && values.equiposEspeciales.estado !== 'No Aplica' && !value ? 'La descripción del hallazgo es requerida' : null),
        },
    });

    useEffect(() => {
        // Si hay datos de la última inspección, precargarlos (especialmente kilometraje y horometro)
        if (lastInspectionData) {
            form.setValues({
                kilometrajeInspeccion: lastInspectionData.kilometrajeInspeccion,
                horometro: lastInspectionData.horometro,
                // No pre-cargar estados de sistemas, ya que son para una nueva inspección
            });
        }
        setLoading(false);
    }, [lastInspectionData]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = async (values) => {
        setIsSubmitting(true);

        const payload = {
            vehiculoId: parseInt(vehiculoId),
            fechaInspeccion: values.fechaInspeccion.toISOString(),
            kilometrajeInspeccion: parseInt(values.kilometrajeInspeccion),
            horometro: parseInt(values.horometro),
            inspector: values.inspector,
            observacionesGenerales: values.observacionesGenerales,

            // Recopilar los hallazgos y el estado general de los sistemas
            estadosSistemas: [
                // Niveles de Líquidos
                { nombreSistema: 'Líquido Limpiaparabrisas', estado: values.liquidoLimpiaparabrisas.estado, notas: values.liquidoLimpiaparabrisas.notas },
                { nombreSistema: 'Líquido Refrigerante', estado: values.liquidoRefrigerante.estado, notas: values.liquidoRefrigerante.notas },
                { nombreSistema: 'Aceite de Motor', estado: values.aceiteMotor.estado, notas: values.aceiteMotor.notas },
                { nombreSistema: 'Aceite de Transmisión', estado: values.aceiteTransmision.estado, notas: values.aceiteTransmision.notas },
                { nombreSistema: 'Aceite de Dirección', estado: values.aceiteDireccion.estado, notas: values.aceiteDireccion.notas },
                { nombreSistema: 'Líquido de Frenos', estado: values.liquidoFrenos.estado, notas: values.liquidoFrenos.notas },

                // Otros Sistemas
                { nombreSistema: 'Luces', estado: values.luces.estado, notas: values.luces.notas },
                { nombreSistema: 'Frenos', estado: values.frenos.estado, notas: values.frenos.notas },
                { nombreSistema: 'Neumáticos', estado: values.neumaticos.estado, notas: values.neumaticos.notas },
                { nombreSistema: 'Motor', estado: values.motor.estado, notas: values.motor.notas },
                { nombreSistema: 'Transmisión', estado: values.transmision.estado, notas: values.transmision.notas },
                { nombreSistema: 'Dirección', estado: values.direccion.estado, notas: values.direccion.notas },
                { nombreSistema: 'Suspensión', estado: values.suspension.estado, notas: values.suspension.notas },
                { nombreSistema: 'Batería', estado: values.bateria.estado, notas: values.bateria.notas },
                { nombreSistema: 'Chasis', estado: values.chasis.estado, notas: values.chasis.notas },
                { nombreSistema: 'Sistema Hidráulico', estado: values.sistemaHidraulico.estado, notas: values.sistemaHidraulico.notas },
                { nombreSistema: 'Equipos Especiales', estado: values.equiposEspeciales.estado, notas: values.equiposEspeciales.notas },
            ].filter(s => s.estado !== 'Operativo' && s.estado !== 'No Aplica' || s.notas), // Filtrar solo los que tienen advertencias/fallos o notas explicitas
        };

        try {
            const response = await httpPost(`/api/vehiculos/inspecciones`, payload); // Usar la ruta general de inspecciones

            if (response.error) {
                throw new Error(response.error);
            }

            notifications.show({
                title: 'Éxito',
                message: 'Inspección registrada exitosamente.',
                color: 'green',
            });
            router.push(`/superuser/flota/${vehiculoId}`);
        } catch (error) {
            console.error('Error al registrar inspección:', error);
            notifications.show({
                title: 'Error',
                message: `Error al registrar inspección: ${error.message}`,
                color: 'red',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Center style={{ height: '400px' }}>
                <Loader size="lg" />
                <Text ml="md">Cargando datos de la última inspección...</Text>
            </Center>
        );
    }

    return (
        <Box mx="auto" py="md">
            {/* <Title order={2} mb="lg">Registrar Nueva Inspección</Title> */}
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Paper withBorder shadow="md" p="md" mb="lg">
                    <Title order={4} mb="sm">Información General de la Inspección</Title>
                    <Grid gutter="md">
                        <Grid.Col span={{ base: 12, md: 4 }}>
                            <DatePickerInput
                                label="Fecha de Inspección"
                                placeholder="Selecciona la fecha"
                                valueFormat="DD/MM/YYYY"
                                maxDate={new Date()}
                                {...form.getInputProps('fechaInspeccion')}
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 4 }}>
                            <NumberInput
                                label="Kilometraje Actual"
                                placeholder="Ej. 125000"
                                min={lastInspectionData?.kilometrajeInspeccion || 0} // No permitir kilometraje menor al último
                                step={1}
                                {...form.getInputProps('kilometrajeInspeccion')}
                            />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 4 }}>
                            <NumberInput
                                label="Horómetro Actual (si aplica)"
                                placeholder="Ej. 2500"
                                min={lastInspectionData?.horometro || 0}
                                step={1}
                                {...form.getInputProps('horometro')}
                            />
                        </Grid.Col>
                        <Grid.Col span={12}>
                            <TextInput
                                label="Inspector / Realizado Por"
                                placeholder="Nombre del técnico o inspector"
                                {...form.getInputProps('inspector')}
                            />
                        </Grid.Col>
                        <Grid.Col span={12}>
                            <Textarea
                                label="Observaciones Generales"
                                placeholder="Notas sobre el estado general del vehículo durante la inspección"
                                autosize
                                minRows={2}
                                {...form.getInputProps('observacionesGenerales')}
                            />
                        </Grid.Col>
                    </Grid>
                </Paper>

                <Paper withBorder shadow="md" p="md" mb="lg">
                    <Title order={4} mb="sm">Niveles de Líquidos</Title>
                    <Text c="dimmed" mb="md">Verifica el nivel y estado de los líquidos del vehículo.</Text>
                    <SimpleGrid cols={5}>
                        <SistemaInspeccionField form={form} sistemaKey="liquidoLimpiaparabrisas" label="Líquido Limpiaparabrisas" />
                        <SistemaInspeccionField form={form} sistemaKey="liquidoRefrigerante" label="Líquido Refrigerante" />
                        <SistemaInspeccionField form={form} sistemaKey="aceiteMotor" label="Aceite de Motor" />
                        <SistemaInspeccionField form={form} sistemaKey="aceiteTransmision" label="Aceite de Transmisión" />
                        <SistemaInspeccionField form={form} sistemaKey="aceiteDireccion" label="Aceite de Dirección Asistida" />
                        <SistemaInspeccionField form={form} sistemaKey="liquidoFrenos" label="Líquido de Frenos" />
                    </SimpleGrid>
                </Paper>

                <Paper withBorder shadow="md" p="md" mb="lg">
                    <Title order={4} mb="sm">Estado por Otros Sistemas (Detalles y Hallazgos)</Title>
                    <Text c="dimmed" mb="md">Para cada sistema, selecciona su estado. Si hay una Advertencia o Fallo Crítico, describe el hallazgo.</Text>

                    <SimpleGrid cols={5}>
                        <SistemaInspeccionField form={form} sistemaKey="motor" label="Motor y Tren Motriz" />
                        <SistemaInspeccionField form={form} sistemaKey="transmision" label="Transmisión y Embrague" />
                        <SistemaInspeccionField form={form} sistemaKey="frenos" label="Sistema de Frenos" />
                        <SistemaInspeccionField form={form} sistemaKey="neumaticos" label="Neumáticos y Ruedas" />
                        <SistemaInspeccionField form={form} sistemaKey="luces" label="Sistema de Iluminación" />
                        <SistemaInspeccionField form={form} sistemaKey="direccion" label="Sistema de Dirección" />
                        <SistemaInspeccionField form={form} sistemaKey="suspension" label="Sistema de Suspensión" />
                        <SistemaInspeccionField form={form} sistemaKey="bateria" label="Sistema Eléctrico y Batería" />
                        <SistemaInspeccionField form={form} sistemaKey="chasis" label="Chasis y Carrocería" />
                        {/* Campos condicionales para equipos pesados/especializados */}
                        <SistemaInspeccionField form={form} sistemaKey="sistemaHidraulico" label="Sistema Hidráulico (si aplica)" />
                        <SistemaInspeccionField form={form} sistemaKey="equiposEspeciales" label="Equipos Especiales (CT, Snubbing, etc.)" />
                    </SimpleGrid>
                </Paper>

                <Group justify="flex-end" mt="xl">
                    <Button variant="default" onClick={() => router.push(`/superuser/flota/${vehiculoId}`)}>
                        Cancelar
                    </Button>
                    <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
                        Registrar Inspección
                    </Button>
                </Group>
            </form>
        </Box>
    );
}