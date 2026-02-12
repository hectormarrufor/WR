'use client';

import { useState, useEffect } from 'react';
import { 
    Container, Title, Text, Button, Group, Paper, SimpleGrid, 
    NumberInput, Divider, ThemeIcon, Grid, LoadingOverlay, Tabs, Alert
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconShieldLock, IconCoin, IconGasStation, IconSettings, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function ConfiguracionGlobalPage() {
    const [loading, setLoading] = useState(false);
    const [resguardoInfo, setResguardoInfo] = useState(null);

    const form = useForm({
        initialValues: {
            // Resguardo
            cantidadVigilantes: 4,
            sueldoMensualVigilante: 200,
            costoSistemaSeguridad: 150,
            
            // Flota
            cantidadMaquinariaPesada: 18,
            cantidadTransportePesado: 15,

            // Posesión / RRHH
            tasaInteresAnual: 5,
            sueldoChoferBase: 400,
            
            // Mercado
            precioGasoil: 0.50,
            precioAceiteMotor: 8.50,
            precioAceiteCaja: 11.00,
            precioCauchoChuto: 450.00,
            precioCauchoBatea: 380.00,
            precioBateria: 180.00
        }
    });

    // Cargar datos al inicio
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/configuracion/general');
                const data = await res.json();
                if(data) form.setValues(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const res = await fetch('/api/configuracion/general', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(values)
            });
            const data = await res.json();
            
            if (res.ok) {
                notifications.show({ title: 'Configuración Guardada', message: 'Se han recalculado todos los costos de la flota.', color: 'green' });
                setResguardoInfo(data.resguardoCalculado);
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
            <Group mb="lg">
                <ThemeIcon size={40} radius="md" color="blue"><IconSettings /></ThemeIcon>
                <div>
                    <Title order={2}>Configuración Maestra de Costos</Title>
                    <Text c="dimmed">Define las variables globales que alimentan el cálculo de fletes (Manual DADICA).</Text>
                </div>
            </Group>

            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Paper withBorder radius="md" p="md" pos="relative">
                    <LoadingOverlay visible={loading} />
                    
                    <Tabs defaultValue="mercado" keepMounted={false}>
                        <Tabs.List mb="md">
                            <Tabs.Tab value="mercado" leftSection={<IconGasStation size={18}/>}>Precios de Mercado (2026)</Tabs.Tab>
                            <Tabs.Tab value="resguardo" leftSection={<IconShieldLock size={18}/>}>Resguardo y Vigilancia</Tabs.Tab>
                            <Tabs.Tab value="rrhh" leftSection={<IconCoin size={18}/>}>RRHH y Financiero</Tabs.Tab>
                        </Tabs.List>

                        {/* --- TAB: MERCADO (LO QUE MÁS CAMBIA) --- */}
                        <Tabs.Panel value="mercado">
                            <Alert icon={<IconInfoCircle size={16}/>} title="Impacto Automático" color="blue" mb="md">
                                Al cambiar estos precios, el sistema actualizará automáticamente todas las estructuras de costos (Matrices) de Chutos, Bateas y Maquinaria.
                            </Alert>
                            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
                                <NumberInput 
                                    label="Precio Gasoil (Litro)" 
                                    prefix="$" decimalScale={3} 
                                    {...form.getInputProps('precioGasoil')} 
                                />
                                <NumberInput 
                                    label="Aceite Motor 15W40 (Litro)" 
                                    description="Precio promedio mercado"
                                    prefix="$" decimalScale={2} 
                                    {...form.getInputProps('precioAceiteMotor')} 
                                />
                                <NumberInput 
                                    label="Aceite Caja/Transmisión (Litro)" 
                                    prefix="$" decimalScale={2} 
                                    {...form.getInputProps('precioAceiteCaja')} 
                                />
                                <Divider my="xs" label="Neumáticos y Baterías" labelPosition="center" style={{gridColumn: '1/-1'}} />
                                <NumberInput 
                                    label="Caucho Chuto (295/80 R22.5)" 
                                    description="Direccional / Tracción"
                                    prefix="$" decimalScale={2} 
                                    {...form.getInputProps('precioCauchoChuto')} 
                                />
                                <NumberInput 
                                    label="Caucho Batea (12R 22.5)" 
                                    prefix="$" decimalScale={2} 
                                    {...form.getInputProps('precioCauchoBatea')} 
                                />
                                <NumberInput 
                                    label="Batería (1100 Amp)" 
                                    prefix="$" decimalScale={2} 
                                    {...form.getInputProps('precioBateria')} 
                                />
                            </SimpleGrid>
                        </Tabs.Panel>

                        {/* --- TAB: RESGUARDO (MANUAL DADICA) --- */}
                        <Tabs.Panel value="resguardo">
                            <Grid gutter="xl">
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <Title order={4} mb="sm">Costos de Seguridad</Title>
                                    <SimpleGrid cols={2}>
                                        <NumberInput label="Cantidad Vigilantes" {...form.getInputProps('cantidadVigilantes')} />
                                        <NumberInput label="Sueldo Mensual ($)" prefix="$" {...form.getInputProps('sueldoMensualVigilante')} />
                                        <NumberInput 
                                            label="Sistemas (Cámaras/GPS)" 
                                            description="Costo mensual total"
                                            prefix="$" 
                                            style={{gridColumn: '1/-1'}}
                                            {...form.getInputProps('costoSistemaSeguridad')} 
                                        />
                                    </SimpleGrid>
                                </Grid.Col>
                                <Grid.Col span={{ base: 12, md: 6 }}>
                                    <Title order={4} mb="sm">Dimensión de Flota (Prorrateo)</Title>
                                    <Text size="sm" c="dimmed" mb="xs">
                                        Estos valores dividen el costo de seguridad entre las unidades activas.
                                    </Text>
                                    <SimpleGrid cols={2}>
                                        <NumberInput label="N° Maquinaria Pesada" {...form.getInputProps('cantidadMaquinariaPesada')} />
                                        <NumberInput label="N° Transporte Carga" {...form.getInputProps('cantidadTransportePesado')} />
                                    </SimpleGrid>
                                    
                                    {resguardoInfo && (
                                        <Paper bg="blue.1" p="sm" mt="lg" radius="md">
                                            <Text fw={700} c="blue.9" ta="center">
                                                Costo Resguardo Calculado: ${resguardoInfo} / Hora
                                            </Text>
                                        </Paper>
                                    )}
                                </Grid.Col>
                            </Grid>
                        </Tabs.Panel>

                        {/* --- TAB: FINANCIERO --- */}
                        <Tabs.Panel value="rrhh">
                            <SimpleGrid cols={2} mt="md">
                                <NumberInput 
                                    label="Tasa Interés Anual (%)" 
                                    description="Para cálculo de Costo de Oportunidad (Posesión)"
                                    suffix="%" 
                                    {...form.getInputProps('tasaInteresAnual')} 
                                />
                                <NumberInput 
                                    label="Sueldo Base Chofer ($)" 
                                    description="Referencia para estimaciones"
                                    prefix="$" 
                                    {...form.getInputProps('sueldoChoferBase')} 
                                />
                            </SimpleGrid>
                        </Tabs.Panel>
                    </Tabs>

                    <Divider my="xl" />

                    <Group justify="flex-end">
                        <Button size="lg" type="submit" color="teal" leftSection={<IconSettings size={20}/>}>
                            Guardar y Recalcular Costos
                        </Button>
                    </Group>
                </Paper>
            </form>
        </Container>
    );
}