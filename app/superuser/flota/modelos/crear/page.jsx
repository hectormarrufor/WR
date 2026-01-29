// app/superuser/flota/activos/crear/page.jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Stepper, Button, Group, Title, Paper, Text,
    SimpleGrid, UnstyledButton, rem, ThemeIcon,
    Stack
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
    IconTruck, IconTruckLoading, IconBackhoe,
    IconBuilding,
    IconAirConditioning
} from '@tabler/icons-react';
import ModeloActivoForm from '../components/ModeloActivoForm';

// IMPORTA TU NUEVO COMPONENTE

// Componente visual para seleccionar tipo
const TipoSelector = ({ value, onChange }) => {
    const tipos = [
        { id: 'Vehiculo', label: 'Vehículo', icon: IconTruck, desc: 'Camiones, Chutos, Vans' },
        { id: 'Remolque', label: 'Remolque', icon: IconTruckLoading, desc: 'Bateas, Lowboys, Cisternas' },
        { id: 'Maquina', label: 'Máquina', icon: IconBackhoe, desc: 'Retroexcavadoras, Taladros' },
        { id: 'Inmueble', label: 'Inmueble', icon: IconBuilding, desc: 'Edificios, Oficinas, Almacenes' },
        { id: 'Equipo', label: 'Equipo', icon: IconAirConditioning, desc: 'Bombas, Aires Acondicionados, Planta electrica' },

    ];

    return (
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {tipos.map((item) => (
                <UnstyledButton
                    key={item.id}
                    onClick={() => onChange(item.id)}
                    data-checked={value === item.id}
                    style={(theme) => ({
                        padding: theme.spacing.xl,
                        borderRadius: theme.radius.md,
                        border: `2px solid ${value === item.id ? theme.colors.blue[6] : theme.colors.gray[2]}`,
                        backgroundColor: value === item.id ? theme.colors.blue[0] : 'transparent',
                        transition: 'all 0.2s ease',
                    })}
                >
                    <Group justify="center" mb="md">
                        <ThemeIcon size={60} variant="light" color={value === item.id ? 'blue' : 'gray'}>
                            <item.icon style={{ width: rem(32), height: rem(32) }} />
                        </ThemeIcon>
                    </Group>
                    <Text align="center" fw={700} size="lg" c={value === item.id ? 'blue' : 'dark'}>
                        {item.label}
                    </Text>
                    <Text align="center" size="sm" c="dimmed" mt="xs">{item.desc}</Text>
                </UnstyledButton>
            ))}
        </SimpleGrid>
    );
};

export default function CrearModeloPage() {
    const router = useRouter();
    const [active, setActive] = useState(0);
    const [loading, setLoading] = useState(false);

    // ESTADO NUEVO: Almacena la plantilla completa (con subsistemas)
    const [modeloFullData, setModeloFullData] = useState(null);

    // El form del padre SOLO maneja el contexto inicial
    const form = useForm({
        initialValues: {
            tipoActivo: '',
        },
        validate: {
            tipoActivo: (value) => !value ? 'Seleccione un tipo' : null,
        }
    });

    const handleNext = () => {
     if (active === 0) {
         if (!form.values.tipoActivo) return form.validateField('tipoActivo');
         setActive(1);
     } else if (active === 1) {
         
     }
  };

  const handlePrev = () => {
    setActive((curr) => (curr > 0 ? curr - 1 : curr));
  };

    return (
        <Paper>
            <Stack gap="lg" p="md">
                <Group justify="space-between">
                    <Title order={2}>Crear Nuevo Modelo</Title>
                    <Button variant="subtle" onClick={() => router.back()}>Cancelar</Button>
                </Group>

                <Paper p="xl" radius="md" withBorder>

                    {/* USAMOS EL STEPPER DEL PADRE SOLO PARA LA SELECCIÓN DE CONTEXTO */}
                    <Stepper active={active} onStepClick={null} allowNextStepsSelect={false}>
                        <Stepper.Step label="Tipo" description="Categoría del activo">
                            <Stack mt="xl" align="center">
                                <Text size="lg" mb="md">¿Qué tipo de Modelo deseas registrar?</Text>
                                <TipoSelector
                                    value={form.values.tipoActivo}
                                    onChange={(val) => {
                                        form.setFieldValue('tipoActivo', val);
                                    }}
                                />
                            </Stack>
                        </Stepper.Step>

                        <Stepper.Step label="Modelo" description="Crear Modelo">
                            <ModeloActivoForm
                                tipoPreseleccionado={form.values.tipoActivo}
                                onSuccess={(nuevoModelo) => {
                                    notifications.show({ title: 'Éxito', message: 'Modelo creado correctamente', color: 'green' });
                                    router.push(`/superuser/flota/modelos`);
                                }}
                                onCancel={() => setActive(0)}
                            />
                        </Stepper.Step>
                    </Stepper>

                    {/* BOTONES DE NAVEGACIÓN DEL PADRE (SOLO VISIBLES EN PASOS 0 y 1) */}
                    {active < 2 && (
                        <Group justify="right" mt="xl">
                            {active > 0 && <Button variant="default" onClick={handlePrev}>Atrás</Button>}
                            <Button onClick={handleNext} loading={loading}>Siguiente</Button>
                        </Group>
                    )}

                </Paper>

            </Stack>
        </Paper>
    );
}