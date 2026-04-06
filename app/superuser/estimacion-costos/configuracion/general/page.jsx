'use client';

import { useState, useEffect } from 'react';
import {
    Container, Title, Text, Button, Group, Paper, SimpleGrid,
    NumberInput, Divider, ThemeIcon, Grid, LoadingOverlay, Tabs, Alert,
    Table, ActionIcon, TextInput, Badge, ScrollArea
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconShieldLock, IconGasStation, IconSettings, IconInfoCircle, IconTrash, IconPlus, IconBuildingBank, IconBriefcase, IconTruck, IconUsers } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function ConfiguracionGlobalPage() {
    const [loading, setLoading] = useState(false);
    const [gastosFijos, setGastosFijos] = useState([]);

    const form = useForm({
        initialValues: {
            // Módulo Mercado y Operativos
            precioGasoil: 0.50,
            
            // 🔥 Tarifas de Peaje por Eje (En Bolívares) 🔥
            tarifaPeaje2Ejes: 0,
            tarifaPeaje3Ejes: 0,
            tarifaPeaje4Ejes: 0,
            tarifaPeaje5Ejes: 160.00,
            tarifaPeaje6Ejes: 0,

            viaticoAlimentacionDia: 15.00,
            viaticoHotelNoche: 20.00,
            sueldoDiarioChofer: 25.00,
            sueldoDiarioAyudante: 15.00,

            precioAceiteMotorMin: 7.50, precioAceiteMotorMax: 9.50,
            precioAceiteCajaMin: 10.00, precioAceiteCajaMax: 12.00,
            precioCauchoMin: 350.00, precioCauchoMax: 450.00,
            precioBateriaMin: 150.00, precioBateriaMax: 210.00,

            // Gastos Fijos (Solo los manuales)
            gastosOficinaMensual: 500,
            pagosGestoriaPermisos: 200,

            // 🔥 VALORES AUTOMÁTICOS (Solo lectura) 🔥
            nominaAdministrativaTotal: 0,
            nominaOperativaFijaTotal: 0,
            valorFlotaTotal: 0,
            valorFlotaActiva: 0,       
            cantidadTotalUnidades: 0,
            cantidadUnidadesActivas: 0, 
            horasTotalesFlota: 0,
            costoAdministrativoPorHora: 0,

            // Módulo Resguardo
            cantidadVigilantes: 4,
            sueldoMensualVigilante: 250,
            horasDiurnas: 12, horasNocturnas: 12,
            diasGuardia: 6, diasDescanso: 1,
            factorHoraNocturna: 1.35,
            costoSistemaCCTV: 50,
            costoMonitoreoSatelital: 100,
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // =========================================================================
    // 🔥 CÁLCULOS EN TIEMPO REAL PARA VISUALIZACIÓN 🔥
    // =========================================================================

    // 1. Gastos de Estructura Mensual
    const oficinaMensual = Number(form.values.gastosOficinaMensual) || 0;
    const gestoriaMensual = Number(form.values.pagosGestoriaPermisos) || 0;

    // 2. Resguardo Mensual
    const cantVigilantes = Number(form.values.cantidadVigilantes) || 0;
    const sueldoVigilante = Number(form.values.sueldoMensualVigilante) || 0;
    const costoVigilancia = cantVigilantes * sueldoVigilante;
    const mensualResguardo = costoVigilancia + (Number(form.values.costoSistemaCCTV) || 0) + (Number(form.values.costoMonitoreoSatelital) || 0);

    // 3. Nóminas Automáticas Mensuales
    const nominaAdminMensual = Number(form.values.nominaAdministrativaTotal) || 0;
    const nominaOpeMensual = Number(form.values.nominaOperativaFijaTotal) || 0;

    // 🔥 Llevamos todo a su proyección ANUAL 🔥
    const estructuraAnual = (oficinaMensual + gestoriaMensual + mensualResguardo) * 12;
    const nominaAdminAnual = nominaAdminMensual * 12;
    const nominaOpeAnual = nominaOpeMensual * 12;

    // 4. Gastos Dinámicos Anuales (Pólizas, RACDA, etc)
    const anualDinamico = gastosFijos.reduce((sum, g) => sum + (Number(g.montoAnual) || 0), 0);

    // 🔥 GRAN TOTAL ANUAL DE LA EMPRESA 🔥
    const granTotalAnual = estructuraAnual + nominaAdminAnual + nominaOpeAnual + anualDinamico;

    // Prorrateo Overhead Global
    const horasTotales = Number(form.values.horasTotalesFlota) || 1; // Evitar dividir por cero
    const overheadPorHoraReferencia = granTotalAnual / horasTotales;

    // =========================================================================

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const res = await fetch('/api/configuracion/general', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...values, gastosFijos })
            });
            const data = await res.json();

            if (res.ok) {
                notifications.show({ title: 'Éxito', message: 'Configuración guardada y matrices actualizadas', color: 'green' });
                form.setFieldValue('costoAdministrativoPorHora', data.overheadCalculado);
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
                    <Text c="dimmed">Parámetros globales, nómina automática y actualización de matrices.</Text>
                </div>
            </Group>

            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Paper withBorder radius="md" p="md" pos="relative">
                    <LoadingOverlay visible={loading} />

                    <Tabs defaultValue="mercado" keepMounted={false}>
                        <Tabs.List mb="md">
                            <Tabs.Tab value="mercado" leftSection={<IconGasStation size={18} />}>Mercado / Operativos</Tabs.Tab>
                            <Tabs.Tab value="fijos" leftSection={<IconBriefcase size={18} />}>Gastos Mensuales (Fijos)</Tabs.Tab>
                            <Tabs.Tab value="dinamicos" leftSection={<IconBuildingBank size={18} />}>Gastos Anuales (Extra)</Tabs.Tab>
                            <Tabs.Tab value="resguardo" leftSection={<IconShieldLock size={18} />}>Resguardo (Seguridad)</Tabs.Tab>
                        </Tabs.List>

                        {/* TAB 1: MERCADO Y OPERATIVOS */}
                        <Tabs.Panel value="mercado">
                            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="sm">
                                <NumberInput label="Precio Gasoil (Litro)" prefix="$" decimalScale={3} {...form.getInputProps('precioGasoil')} />
                                <NumberInput label="Sueldo Diario Chofer" description="Tarifa plana por día de viaje" prefix="$" decimalScale={2} {...form.getInputProps('sueldoDiarioChofer')} />
                                <NumberInput label="Sueldo Diario Ayudante" description="Tarifa plana por día de viaje" prefix="$" decimalScale={2} {...form.getInputProps('sueldoDiarioAyudante')} />
                                <NumberInput label="Viático Comida (Día)" prefix="$" decimalScale={2} {...form.getInputProps('viaticoAlimentacionDia')} />
                                <NumberInput label="Viático Hotel (Noche)" prefix="$" decimalScale={2} {...form.getInputProps('viaticoHotelNoche')} />
                            </SimpleGrid>

                            {/* 🔥 PREFIJO CAMBIADO A BS PARA LOS PEAJES 🔥 */}
                            <Divider my="md" label="Tarifas Nacionales de Peaje (En Bolívares)" labelPosition="center" />
                            
                            <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="sm" mb="xl">
                                <NumberInput label="2 Ejes (350/750)" prefix="Bs. " decimalScale={2} {...form.getInputProps('tarifaPeaje2Ejes')} />
                                <NumberInput label="3 Ejes" prefix="Bs. " decimalScale={2} {...form.getInputProps('tarifaPeaje3Ejes')} />
                                <NumberInput label="4 Ejes" prefix="Bs. " decimalScale={2} {...form.getInputProps('tarifaPeaje4Ejes')} />
                                <NumberInput label="5 Ejes (Estándar)" prefix="Bs. " decimalScale={2} {...form.getInputProps('tarifaPeaje5Ejes')} />
                                <NumberInput label="6 Ejes" prefix="Bs. " decimalScale={2} {...form.getInputProps('tarifaPeaje6Ejes')} />
                            </SimpleGrid>

                            <Divider my="xs" label="Rango de Repuestos (Actualiza todas las Matrices)" labelPosition="center" />

                            <Table striped highlightOnHover verticalSpacing="sm">
                                <Table.Thead bg="gray.1">
                                    <Table.Tr>
                                        <Table.Th>Insumo / Repuesto</Table.Th>
                                        <Table.Th style={{ width: 180 }}>Costo Mínimo ($)</Table.Th>
                                        <Table.Th style={{ width: 180 }}>Costo Máximo ($)</Table.Th>
                                        <Table.Th style={{ width: 150, textAlign: 'right' }}>Promedio (Unitario)</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {[
                                        { label: 'Cauchos Flota', min: 'precioCauchoMin', max: 'precioCauchoMax' },
                                        { label: 'Aceite Motor (Litro)', min: 'precioAceiteMotorMin', max: 'precioAceiteMotorMax' },
                                        { label: 'Aceite Caja (Litro)', min: 'precioAceiteCajaMin', max: 'precioAceiteCajaMax' },
                                        { label: 'Batería 1100 Amp', min: 'precioBateriaMin', max: 'precioBateriaMax' },
                                    ].map((item, idx) => {
                                        const prom = ((Number(form.values[item.min]) || 0) + (Number(form.values[item.max]) || 0)) / 2;
                                        return (
                                            <Table.Tr key={idx}>
                                                <Table.Td fw={600}>{item.label}</Table.Td>
                                                <Table.Td><NumberInput variant="unstyled" prefix="$" decimalScale={2} c="green.9" {...form.getInputProps(item.min)} /></Table.Td>
                                                <Table.Td><NumberInput variant="unstyled" prefix="$" decimalScale={2} c="red.9" {...form.getInputProps(item.max)} /></Table.Td>
                                                <Table.Td ta="right" fw={800} c="blue.8">${prom.toFixed(2)}</Table.Td>
                                            </Table.Tr>
                                        );
                                    })}
                                </Table.Tbody>
                            </Table>
                        </Tabs.Panel>

                        {/* TAB 2: GASTOS FIJOS MENSUALES */}
                        <Tabs.Panel value="fijos">
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                                {/* Campos Manuales */}
                                <NumberInput label="Gastos Oficina Mensual" description="Alquiler, Luz, Internet" prefix="$" {...form.getInputProps('gastosOficinaMensual')} />
                                <NumberInput label="Gestoría y Permisos Base" description="Gestor, Trámites regulares" prefix="$" {...form.getInputProps('pagosGestoriaPermisos')} />

                                {/* Campos Automáticos (Solo Lectura) */}
                                <Paper p="sm" radius="md" bg="gray.0" withBorder>
                                    <Group>
                                        <ThemeIcon color="violet" variant="light"><IconUsers size={20} /></ThemeIcon>
                                        <div style={{ flex: 1 }}>
                                            <Text size="sm" fw={600}>Nómina Administrativa (Auto)</Text>
                                            <Text size="xs" c="dimmed">Presidencia, IT, Administración</Text>
                                        </div>
                                        <Text fw={800} size="lg" c="violet.9">${nominaAdminMensual.toLocaleString('en-US')}</Text>
                                    </Group>
                                </Paper>

                                <Paper p="sm" radius="md" bg="gray.0" withBorder>
                                    <Group>
                                        <ThemeIcon color="teal" variant="light"><IconSettings size={20} /></ThemeIcon>
                                        <div style={{ flex: 1 }}>
                                            <Text size="sm" fw={600}>Nómina Operativa Fija (Auto)</Text>
                                            <Text size="xs" c="dimmed">Mecánicos, Taller, Logística</Text>
                                        </div>
                                        <Text fw={800} size="lg" c="teal.9">${nominaOpeMensual.toLocaleString('en-US')}</Text>
                                    </Group>
                                </Paper>
                            </SimpleGrid>
                        </Tabs.Panel>

                        {/* TAB 3: GASTOS DINÁMICOS ANUALES */}
                        <Tabs.Panel value="dinamicos">
                            <Alert icon={<IconBuildingBank size={16} />} color="violet" mb="md">Agrega aquí pagos anuales esporádicos (RACDA, Póliza RCV Flota, Timbres Fiscales).</Alert>
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
                                                    <ActionIcon color="red" variant="subtle" onClick={() => setGastosFijos(gastosFijos.filter((_, idx) => idx !== i))}><IconTrash size={16} /></ActionIcon>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </ScrollArea>
                            <Button mt="sm" variant="light" leftSection={<IconPlus size={16} />} onClick={() => setGastosFijos([...gastosFijos, { descripcion: '', montoAnual: 0 }])} color="violet">Añadir Gasto Anual</Button>
                        </Tabs.Panel>

                        {/* TAB 4: RESGUARDO */}
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

                    {/* 🔥 PANEL INFORMATIVO (BOTTOM-UP EXACTO) 🔥 */}
                    <Paper bg="gray.0" p="md" radius="md" withBorder mb="lg">
                        <Grid align="center">
                            <Grid.Col span={{ base: 12, md: 5 }}>
                                <Alert icon={<IconTruck size={16} />} color="blue" variant="light" p="md">
                                    <Title order={5} mb="xs">Sistema de Costeo (ABC)</Title>
                                    <Text size="sm">
                                        El overhead se calcula dividiendo los gastos totales de la empresa (Oficina, Resguardo y <b>Nóminas Fijas Anualizadas</b>) entre la sumatoria de las <b>Horas Anuales Estimadas</b> de los equipos.
                                    </Text>
                                </Alert>
                            </Grid.Col>

                            <Grid.Col span={{ base: 12, md: 7 }}>
                                <Group justify="flex-end" gap="xl">
                                    {/* SECCIÓN HORAS Y VALOR DE FLOTA */}
                                    <div style={{ textAlign: 'right', paddingRight: '15px', borderRight: '1px solid #dee2e6' }}>
                                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">Músculo Operativo (Produciendo)</Text>
                                        <Text size="lg" fw={800} c="indigo.9">
                                            {form.values.cantidadUnidadesActivas} Equipos / {Number(form.values.horasTotalesFlota || 0).toLocaleString('en-US')} hr
                                        </Text>
                                        <Text size="xl" fw={900} c="blue.9">
                                            ${Number(form.values.valorFlotaActiva || 0).toLocaleString('en-US')}
                                        </Text>

                                        <Text size="xs" c="dimmed" fw={700} tt="uppercase" mt="sm">Patrimonio Total (Incluye Inactivos)</Text>
                                        <Text size="sm" fw={700} c="gray.7">
                                            {form.values.cantidadTotalUnidades} Equipos Físicos
                                        </Text>
                                        <Text size="md" fw={800} c="gray.8">
                                            ${Number(form.values.valorFlotaTotal || 0).toLocaleString('en-US')}
                                        </Text>
                                    </div>

                                    {/* SECCIÓN OVERHEAD CON DESGLOSE */}
                                    <div style={{ textAlign: 'right' }}>
                                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">Estructura + Resguardo</Text>
                                        <Text size="sm" fw={600}>${(estructuraAnual + anualDinamico).toLocaleString('en-US')} / año</Text>

                                        <Text size="xs" c="dimmed" fw={700} tt="uppercase" mt="xs">Nóminas (Admin + Operativa)</Text>
                                        {/* Si la nómina viene en 0, se pondrá en rojo para alertarte */}
                                        <Text size="sm" fw={700} c={(nominaAdminAnual + nominaOpeAnual) > 0 ? "teal.7" : "red.6"}>
                                            + ${(nominaAdminAnual + nominaOpeAnual).toLocaleString('en-US')} / año
                                        </Text>

                                        <Divider my="sm" />

                                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">Gasto Total Empresa</Text>
                                        <Text size="lg" fw={800}>${granTotalAnual.toLocaleString('en-US')}</Text>

                                        <Text size="xs" c="dimmed" fw={700} tt="uppercase" mt="sm">Overhead Aplicable</Text>
                                        <Badge size="xl" color="violet" variant="filled">
                                            + ${overheadPorHoraReferencia.toFixed(2)} / Hora
                                        </Badge>
                                    </div>
                                </Group>
                            </Grid.Col>
                        </Grid>
                    </Paper>

                    <Group justify="flex-end">
                        <Button size="lg" type="submit" color="teal" leftSection={<IconSettings size={20} />}>
                            Guardar y Aplicar Batch a Flota
                        </Button>
                    </Group>
                </Paper>
            </form>
        </Container>
    );
}