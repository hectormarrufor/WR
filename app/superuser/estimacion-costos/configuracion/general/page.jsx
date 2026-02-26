'use client';

import { useState, useEffect } from 'react';
import { 
    Container, Title, Text, Button, Group, Paper, SimpleGrid, 
    NumberInput, Divider, ThemeIcon, Grid, LoadingOverlay, Tabs, Alert,
    Table, ActionIcon, TextInput, Badge, ScrollArea
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconShieldLock, IconCoin, IconGasStation, IconSettings, IconInfoCircle, IconTrash, IconPlus, IconBuildingBank, IconBriefcase } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function ConfiguracionGlobalPage() {
    const [loading, setLoading] = useState(false);
    const [gastosFijos, setGastosFijos] = useState([]);

    const form = useForm({
        initialValues: {
            // Módulo Mercado
            precioGasoil: 0.50,
            precioPeajePromedio: 20.00,
            viaticoAlimentacionDia: 15.00,
            viaticoHotelNoche: 20.00,
            precioAceiteMotor: 8.50,
            precioAceiteCaja: 11.00,
            precioCauchoChuto: 450.00,
            precioCauchoBatea: 380.00,
            precioBateria: 180.00,

            // Módulo Fijos Mensuales (Tu modelo original)
            gastosOficinaMensual: 500,
            pagosGestoriaPermisos: 200,
            nominaAdministrativaTotal: 1500,
            nominaOperativaFijaTotal: 2000,
            
            // Módulo Flota (Para prorratear)
            cantidadMaquinariaPesada: 18,
            cantidadTransportePesado: 15,
            horasAnualesOperativas: 2000, // Por equipo

            // Módulo Resguardo
            cantidadVigilantes: 4,
            sueldoMensualVigilante: 250,
            horasDiurnas: 12,
            horasNocturnas: 12,
            diasGuardia: 6,
            diasDescanso: 1,
            factorHoraNocturna: 1.35,
            costoSistemaCCTV: 50,
            costoMonitoreoSatelital: 100,

            // Módulo Financiero
            tasaInteresAnual: 5.0,
        }
    });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/configuracion/general');
                if (res.ok) {
                    const data = await res.json();
                    form.setValues(data);
                    setGastosFijos(data.gastosFijos || []);
                }
            } catch (e) {
                notifications.show({ title: 'Error', message: 'Fallo al cargar la configuración', color: 'red' });
            } finally { setLoading(false); }
        };
        load();
    }, []);

    // --- CÁLCULOS EN TIEMPO REAL PARA EL FRONTEND ---
    // 1. Gastos Estáticos Mensuales (multiplicados x12 para el año)
    const mensualEstatico = (form.values.gastosOficinaMensual || 0) + 
                            (form.values.pagosGestoriaPermisos || 0) + 
                            (form.values.nominaAdministrativaTotal || 0) + 
                            (form.values.nominaOperativaFijaTotal || 0);
    const anualEstatico = mensualEstatico * 12;

    // 2. Gastos Dinámicos Anuales (Tabla)
    const anualDinamico = gastosFijos.reduce((sum, g) => sum + (Number(g.montoAnual) || 0), 0);

    // 3. Prorrateo Overhead
    const granTotalAnual = anualEstatico + anualDinamico;
    const flotaTotal = (Number(form.values.cantidadMaquinariaPesada) || 0) + (Number(form.values.cantidadTransportePesado) || 0);
    const horasTotalesFlotaAnual = flotaTotal * (Number(form.values.horasAnualesOperativas) || 2000);
    
    const overheadPorHora = horasTotalesFlotaAnual > 0 ? (granTotalAnual / horasTotalesFlotaAnual) : 0;

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const res = await fetch('/api/configuracion/general', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ ...values, gastosFijos })
            });
            const data = await res.json();
            
            if (res.ok) {
                notifications.show({ title: 'Éxito', message: 'Configuración guardada y matrices actualizadas', color: 'green' });
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally { setLoading(false); }
    };

    return (
        <Container size="xl" py="xl">
            <Group mb="lg">
                <ThemeIcon size={40} radius="md" color="blue"><IconSettings /></ThemeIcon>
                <div>
                    <Title order={2}>Configuración Maestra DADICA</Title>
                    <Text c="dimmed">Parámetros globales para cálculo de fletes y actualización en lote de matrices.</Text>
                </div>
            </Group>

            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Paper withBorder radius="md" p="md" pos="relative">
                    <LoadingOverlay visible={loading} />
                    
                    <Tabs defaultValue="mercado" keepMounted={false}>
                        <Tabs.List mb="md">
                            <Tabs.Tab value="mercado" leftSection={<IconGasStation size={18}/>}>Mercado / Operativos</Tabs.Tab>
                            <Tabs.Tab value="fijos" leftSection={<IconBriefcase size={18}/>}>Gastos Mensuales (Fijos)</Tabs.Tab>
                            <Tabs.Tab value="dinamicos" leftSection={<IconBuildingBank size={18}/>}>Gastos Anuales (Extra)</Tabs.Tab>
                            <Tabs.Tab value="resguardo" leftSection={<IconShieldLock size={18}/>}>Resguardo (Seguridad)</Tabs.Tab>
                        </Tabs.List>

                        {/* TAB 1: MERCADO */}
                        <Tabs.Panel value="mercado">
                            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
                                <NumberInput label="Precio Gasoil (Litro)" prefix="$" decimalScale={3} {...form.getInputProps('precioGasoil')} />
                                <NumberInput label="Peaje Promedio" prefix="$" decimalScale={2} {...form.getInputProps('precioPeajePromedio')} />
                                <NumberInput label="Viático Alimentación (Día)" prefix="$" decimalScale={2} {...form.getInputProps('viaticoAlimentacionDia')} />
                                <NumberInput label="Viático Pernocta (Hotel)" prefix="$" decimalScale={2} {...form.getInputProps('viaticoHotelNoche')} />
                                <Divider my="xs" label="Repuestos (Actualiza Matrices)" labelPosition="center" style={{gridColumn: '1/-1'}} />
                                <NumberInput label="Caucho Chuto (295/80 R22.5)" prefix="$" decimalScale={2} {...form.getInputProps('precioCauchoChuto')} />
                                <NumberInput label="Caucho Batea (12R 22.5)" prefix="$" decimalScale={2} {...form.getInputProps('precioCauchoBatea')} />
                                <NumberInput label="Aceite Motor (Litro)" prefix="$" decimalScale={2} {...form.getInputProps('precioAceiteMotor')} />
                                <NumberInput label="Batería 1100 Amp" prefix="$" decimalScale={2} {...form.getInputProps('precioBateria')} />
                            </SimpleGrid>
                        </Tabs.Panel>

                        {/* TAB 2: GASTOS FIJOS MENSUALES */}
                        <Tabs.Panel value="fijos">
                            <Alert icon={<IconInfoCircle size={16}/>} color="blue" mb="md">Estos son los gastos rutinarios base. Se multiplicarán por 12 para el cálculo anual.</Alert>
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                                <NumberInput label="Gastos Oficina Mensual" description="Alquiler, Luz, Internet" prefix="$" {...form.getInputProps('gastosOficinaMensual')} />
                                <NumberInput label="Gestoría y Permisos Base" description="Gestor, Trámites regulares" prefix="$" {...form.getInputProps('pagosGestoriaPermisos')} />
                                <NumberInput label="Nómina Administrativa" description="Gerentes, Secretarias, Contables" prefix="$" {...form.getInputProps('nominaAdministrativaTotal')} />
                                <NumberInput label="Nómina Operativa Fija" description="Mecánicos de planta (no choferes)" prefix="$" {...form.getInputProps('nominaOperativaFijaTotal')} />
                            </SimpleGrid>
                        </Tabs.Panel>

                        {/* TAB 3: GASTOS DINÁMICOS ANUALES */}
                        <Tabs.Panel value="dinamicos">
                            <Alert icon={<IconBuildingBank size={16}/>} color="violet" mb="md">Agrega aquí pagos anuales esporádicos (RACDA, Póliza RCV Flota, Timbres Fiscales).</Alert>
                            <ScrollArea h={250}>
                                <Table striped highlightOnHover withTableBorder>
                                    <Table.Thead bg="gray.1">
                                        <Table.Tr>
                                            <Table.Th>Descripción del Gasto Anual</Table.Th>
                                            <Table.Th style={{ width: 200, textAlign: 'right' }}>Costo Total ($)</Table.Th>
                                            <Table.Th style={{ width: 80 }}></Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {gastosFijos.map((gasto, i) => (
                                            <Table.Tr key={i}>
                                                <Table.Td>
                                                    <TextInput variant="unstyled" placeholder="Ej: Póliza RCV Flota" value={gasto.descripcion} onChange={(e) => {
                                                        const n = [...gastosFijos]; n[i].descripcion = e.target.value; setGastosFijos(n);
                                                    }} />
                                                </Table.Td>
                                                <Table.Td>
                                                    <NumberInput variant="unstyled" prefix="$" value={gasto.montoAnual} onChange={(val) => {
                                                        const n = [...gastosFijos]; n[i].montoAnual = val; setGastosFijos(n);
                                                    }} styles={{ input: { textAlign: 'right', fontWeight: 600 } }} />
                                                </Table.Td>
                                                <Table.Td ta="center">
                                                    <ActionIcon color="red" variant="subtle" onClick={() => setGastosFijos(gastosFijos.filter((_, idx) => idx !== i))}><IconTrash size={16}/></ActionIcon>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </ScrollArea>
                            <Button mt="sm" variant="light" leftSection={<IconPlus size={16}/>} onClick={() => setGastosFijos([...gastosFijos, { descripcion: '', montoAnual: 0 }])} color="violet">Añadir Gasto Anual</Button>
                        </Tabs.Panel>

                        {/* TAB 4: RESGUARDO (Mantenido fiel a tu modelo) */}
                        <Tabs.Panel value="resguardo">
                            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
                                <NumberInput label="Cantidad Vigilantes" {...form.getInputProps('cantidadVigilantes')} />
                                <NumberInput label="Sueldo Base ($)" prefix="$" {...form.getInputProps('sueldoMensualVigilante')} />
                                <NumberInput label="Factor Nocturno" description="Ej: 1.35 = 35% recargo" decimalScale={2} {...form.getInputProps('factorHoraNocturna')} />
                                <NumberInput label="Costo Mensual CCTV" prefix="$" {...form.getInputProps('costoSistemaCCTV')} />
                                <NumberInput label="Costo Monitoreo Satelital" prefix="$" {...form.getInputProps('costoMonitoreoSatelital')} />
                            </SimpleGrid>
                        </Tabs.Panel>
                    </Tabs>

                    <Divider my="xl" />

                    {/* PANEL INFORMATIVO DE OVERHEAD */}
                    <Paper bg="gray.0" p="md" radius="md" withBorder mb="lg">
                        <Grid align="center">
                            <Grid.Col span={{ base: 12, md: 4 }}>
                                <NumberInput label="Cant. Chutos / Camiones" {...form.getInputProps('cantidadTransportePesado')} />
                                <NumberInput label="Cant. Maquinaria Pesada" mt="sm" {...form.getInputProps('cantidadMaquinariaPesada')} />
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 8 }}>
                                <Group justify="flex-end" gap="xl">
                                    <div style={{ textAlign: 'right' }}>
                                        <Text size="xs" c="dimmed" fw={700}>Total Gastos Administrativos (Año):</Text>
                                        <Text size="xl" fw={800}>${granTotalAnual.toLocaleString('en-US')}</Text>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <Text size="xs" c="dimmed" fw={700}>Overhead cobrado al Flete:</Text>
                                        <Badge size="xl" color="violet" variant="filled">
                                            + ${overheadPorHora.toFixed(2)} / Hora
                                        </Badge>
                                    </div>
                                </Group>
                            </Grid.Col>
                        </Grid>
                    </Paper>

                    <Group justify="flex-end">
                        <Button size="lg" type="submit" color="teal" leftSection={<IconSettings size={20}/>}>
                            Guardar y Aplicar Batch a Flota
                        </Button>
                    </Group>
                </Paper>
            </form>
        </Container>
    );
}