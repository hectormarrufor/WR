'use client';

import { useState, useEffect } from 'react';
import {
    Container, Title, Text, Button, Group, SimpleGrid, Card,
    Badge, Modal, TextInput, Select, ActionIcon, LoadingOverlay, Stack, Divider
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus, IconTruck, IconSettings, IconArrowRight, IconRefresh, IconDatabaseImport } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

// Importamos tu componente editor
import MatrizEditor from './MatrizEditor'; // Asegúrate de la ruta correcta

export default function ConfiguracionCostosPage() {
    const [matrices, setMatrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null); // ID de la matriz que estamos editando
    const [modalOpen, setModalOpen] = useState(false); // Modal para CREAR nueva

    // Formulario para crear nueva matriz
    const form = useForm({
        initialValues: { nombre: '', tipoActivo: 'Vehiculo' },
        validate: {
            nombre: (val) => (val.length < 3 ? 'Nombre muy corto' : null),
            tipoActivo: (val) => (!val ? 'Requerido' : null),
        },
    });

    // 1. Cargar lista de matrices
    const fetchMatrices = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/configuracion/matriz');
            const data = await res.json();
            setMatrices(data);
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'No se pudieron cargar los perfiles', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMatrices(); }, []);

    // 2. Manejar creación
    const handleCreate = async (values) => {
        try {
            const res = await fetch('/api/configuracion/matriz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });
            const nueva = await res.json();

            if (res.ok) {
                notifications.show({ title: 'Creado', message: 'Perfil de costos creado', color: 'green' });
                await fetchMatrices(); // Recargar lista
                setSelectedId(nueva.id); // Seleccionar automáticamente
                setModalOpen(false);
                form.reset();
            } else {
                throw new Error(nueva.error);
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        }
    };

    const cargarValoresVenezuela = async () => {
        if (!confirm("⚠️ ¿Estás seguro? \n\nEsto sobrescribirá las estructuras de costos con los valores de mercado 'Venezuela 2026' (Precios de Aceites, Cauchos, Repuestos).\n\nCualquier edición manual previa en estos perfiles se perderá.")) {
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/configuracion/matriz/seed', { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                notifications.show({
                    title: 'Base de Datos Actualizada',
                    message: 'Se han cargado los precios de mercado 2026.',
                    color: 'teal',
                    autoClose: 5000
                });
                fetchMatrices(); // Refrescar la pantalla
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
        <Container size="xl" py="xl">
            <Stack gap="lg">

                {/* CABECERA DE LA PÁGINA */}
                <Group justify="space-between" align="flex-end">
                    <div>
                        <Title order={2}>Matrices de Costo Operativo</Title>
                        <Text c="dimmed">Gestiona las estructuras de costos (Insumos, Repuestos) para cada tipo de activo.</Text>
                    </div>
                    {/* EL BOTÓN NUEVO AQUÍ */}
                    <Button
                        color="red"
                        variant="light"
                        leftSection={<IconDatabaseImport size={18} />}
                        onClick={cargarValoresVenezuela}
                    >
                        Restaurar Valores Vzla 2026
                    </Button>
                    <Button leftSection={<IconPlus size={18} />} onClick={() => setModalOpen(true)}>
                        Nuevo Perfil
                    </Button>
                </Group>

                {/* GRID DE PERFILES (TARJETAS) */}
                <SimpleGrid cols={{ base: 1, sm: 3, md: 4 }}>
                    {loading ? <Text>Cargando...</Text> : matrices.map((matriz) => (
                        <Card
                            key={matriz.id}
                            withBorder
                            shadow="sm"
                            padding="lg"
                            radius="md"
                            style={{
                                cursor: 'pointer',
                                borderColor: selectedId === matriz.id ? '#228be6' : undefined,
                                backgroundColor: selectedId === matriz.id ? '#e7f5ff' : undefined
                            }}
                            onClick={() => setSelectedId(matriz.id)}
                        >
                            <Group justify="space-between" mb="xs">
                                <Badge
                                    color={matriz.tipoActivo === 'Vehiculo' ? 'blue' : matriz.tipoActivo === 'Remolque' ? 'orange' : 'gray'}
                                >
                                    {matriz.tipoActivo}
                                </Badge>
                                <IconSettings size={16} color="gray" />
                            </Group>

                            <Text fw={700} size="md" lineClamp={1} title={matriz.nombre}>
                                {matriz.nombre}
                            </Text>

                            <Group mt="md" align="flex-end" gap={4}>
                                <Text size="xl" fw={700} c="teal">
                                    ${matriz.totalCostoKm?.toFixed(3) || '0.000'}
                                </Text>
                                <Text size="xs" c="dimmed" mb={4}>/ Km</Text>
                            </Group>
                        </Card>
                    ))}
                </SimpleGrid>

                <Divider my="sm" />

                {/* ÁREA DE EDICIÓN (AQUÍ VA TU COMPONENTE) */}
                {selectedId ? (
                    <div style={{ minHeight: 500 }}>
                        {/* Aquí pasamos el ID seleccionado al editor que creamos antes */}
                        <MatrizEditor matrizId={selectedId} />
                    </div>
                ) : (
                    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa', borderRadius: 8, border: '1px dashed #dee2e6' }}>
                        <Stack align="center" gap="xs">
                            <IconTruck size={48} color="#adb5bd" />
                            <Text c="dimmed">Selecciona un perfil arriba para editar sus costos</Text>
                        </Stack>
                    </div>
                )}
            </Stack>

            {/* MODAL PARA CREAR NUEVO PERFIL */}
            <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Crear Nuevo Perfil de Costos">
                <form onSubmit={form.onSubmit(handleCreate)}>
                    <TextInput
                        label="Nombre del Perfil"
                        placeholder="Ej: Chuto Mack Vision 2026"
                        mb="md"
                        required
                        {...form.getInputProps('nombre')}
                    />
                    <Select
                        label="Tipo de Activo"
                        data={['Vehiculo', 'Remolque', 'Maquina']}
                        mb="xl"
                        required
                        {...form.getInputProps('tipoActivo')}
                    />
                    <Button fullWidth type="submit">Crear y Editar</Button>
                </form>
            </Modal>
        </Container>
    );
}