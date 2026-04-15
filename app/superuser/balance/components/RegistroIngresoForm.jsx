'use client';

import { useState, useMemo, useEffect } from 'react';
import {
    Stack, Group, Button, TextInput, NumberInput,
    Select, LoadingOverlay, Text, Divider, Switch, Paper, SimpleGrid, Badge
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
    IconCheck, IconCalendar, IconCoin, IconReceipt2, 
    IconTags, IconTruck, IconReceiptTax, IconCalculator 
} from '@tabler/icons-react';
import dayjs from 'dayjs';

const ORIGENES_INGRESO = ['Flete', 'Servicio ODT', 'Venta Activo', 'Otros'];

export default function RegistroIngresoForm({ onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [tasaManual, setTasaManual] = useState(false);

    const form = useForm({
        initialValues: {
            fecha: new Date(),
            tipoOrigen: 'Otros',
            fleteId: '',
            descripcion: '',
            monedaOperacion: 'USD',
            tasaCambio: 1,
            montoBaseInput: 0, // El monto bruto del flete/servicio
            esFacturado: false,
            // Fiscal
            aplicaIgtf: false,
            esAgenteRetencion: false, // ¿El CLIENTE nos retiene?
            porcentajeRetIva: 75,      // 75% o 100%
            porcentajeRetIslr: 2,      // 2% servicios transporte
            referencia: ''
        },
        validate: {
            fecha: (val) => (!val ? 'Requerido' : null),
            montoBaseInput: (val) => (val <= 0 ? 'Monto inválido' : null),
            tasaCambio: (val) => (val <= 0 ? 'Tasa inválida' : null),
            fleteId: (val, values) => (values.tipoOrigen === 'Flete' && !val ? 'Requerido' : null)
        }
    });

    // 🔥 MOTOR DE CÁLCULO FISCAL DINÁMICO 🔥
    const calculos = useMemo(() => {
        const base = parseFloat(form.values.montoBaseInput) || 0;
        const tasa = parseFloat(form.values.tasaCambio) || 1;
        const esUSD = form.values.monedaOperacion === 'USD';

        // 1. Convertimos base a USD siempre para el cálculo maestro
        const baseUsd = esUSD ? base : base / tasa;

        let iva = 0;
        let igtf = 0;
        let retIva = 0;
        let retIslr = 0;
        let municipal = baseUsd * 0.03; // 3% Alcaldía fijo sobre base

        if (form.values.esFacturado) {
            iva = baseUsd * 0.16;
            if (form.values.esAgenteRetencion) {
                retIva = iva * (form.values.porcentajeRetIva / 100);
                retIslr = baseUsd * (form.values.porcentajeRetIslr / 100);
            }
        }

        if (form.values.aplicaIgtf) {
            igtf = (baseUsd + iva) * 0.03;
        }

        // Lo que REALMENTE entra al bolsillo (USD)
        const netoUsd = (baseUsd + iva + igtf) - (retIva + retIslr);

        return {
            baseUsd,
            iva,
            igtf,
            retIva,
            retIslr,
            municipal,
            netoUsd,
            netoBs: netoUsd * tasa
        };
    }, [form.values]);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const payload = {
                fechaIngreso: dayjs(values.fecha).format('YYYY-MM-DD'),
                tipoOrigen: values.tipoOrigen,
                descripcion: values.descripcion,
                referenciaExterna: values.referencia,
                estado: 'Cobrado',
                
                // Config Multimoneda
                monedaOperacion: values.monedaOperacion,
                tasaCambio: parseFloat(values.tasaCambio),
                fuenteTasa: tasaManual ? 'Manual' : 'BCV',

                // Desglose Fiscal
                esFacturado: values.esFacturado,
                montoBaseUsd: calculos.baseUsd,
                montoIvaUsd: calculos.iva,
                montoIgtfUsd: calculos.igtf,
                retencionIvaUsd: calculos.retIva,
                retencionIslrUsd: calculos.retIslr,
                impuestoMunicipalProvisionUsd: calculos.municipal,

                // Totales Finales
                montoNetoUsd: calculos.netoUsd,
                montoNetoBs: calculos.netoBs,
                
                fleteId: values.tipoOrigen === 'Flete' ? parseInt(values.fleteId) : null
            };

            const response = await fetch('/api/ingresos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Error al registrar el ingreso');

            notifications.show({
                title: 'Ingreso Consolidado',
                message: `Se registraron $${calculos.netoUsd.toFixed(2)} netos.`,
                color: 'teal'
            });

            form.reset();
            if (onSuccess) onSuccess();
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <LoadingOverlay visible={loading} />
            
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    <SimpleGrid cols={2}>
                        <DatePickerInput
                            label="Fecha de Operación"
                            required
                            leftSection={<IconCalendar size={16} />}
                            {...form.getInputProps('fecha')}
                        />
                        <Select
                            label="Origen"
                            data={ORIGENES_INGRESO}
                            required
                            leftSection={<IconTags size={16} />}
                            {...form.getInputProps('tipoOrigen')}
                        />
                    </SimpleGrid>

                    <TextInput
                        label="Concepto / Cliente"
                        placeholder="Ej: Flete Carga Pesada - Cliente Polar"
                        required
                        {...form.getInputProps('descripcion')}
                    />

                    <Divider label="Configuración de Moneda" labelPosition="center" />
                    
                    <SimpleGrid cols={3}>
                        <Select
                            label="Moneda de Pago"
                            data={[{label: 'USD ($)', value: 'USD'}, {label: 'Bolívares (Bs)', value: 'VES'}]}
                            {...form.getInputProps('monedaOperacion')}
                        />
                        <NumberInput
                            label="Tasa de Cambio"
                            decimalScale={4}
                            {...form.getInputProps('tasaCambio')}
                        />
                        <NumberInput
                            label={`Monto Bruto (${form.values.monedaOperacion})`}
                            required
                            decimalScale={2}
                            {...form.getInputProps('montoBaseInput')}
                        />
                    </SimpleGrid>

                    <Divider label="Tratamiento Fiscal (Venezuela)" labelPosition="center" color="blue" />

                    <Paper withBorder p="sm" bg="gray.0">
                        <Stack gap="xs">
                            <Group justify="space-between">
                                <Switch 
                                    label="¿Es Facturado? (IVA 16%)" 
                                    color="teal"
                                    {...form.getInputProps('esFacturado', { type: 'checkbox' })}
                                />
                                <Switch 
                                    label="¿Aplica IGTF? (3%)" 
                                    color="orange"
                                    {...form.getInputProps('aplicaIgtf', { type: 'checkbox' })}
                                />
                            </Group>

                            {form.values.esFacturado && (
                                <Stack gap="xs" mt="sm">
                                    <Switch 
                                        label="El cliente es Agente de Retención" 
                                        color="blue"
                                        {...form.getInputProps('esAgenteRetencion', { type: 'checkbox' })}
                                    />
                                    {form.values.esAgenteRetencion && (
                                        <Group grow>
                                            <Select 
                                                label="% Retención IVA" 
                                                data={[{label: '75%', value: '75'}, {label: '100%', value: '100'}]}
                                                {...form.getInputProps('porcentajeRetIva')}
                                            />
                                            <NumberInput 
                                                label="% Retención ISLR" 
                                                suffix="%"
                                                {...form.getInputProps('porcentajeRetIslr')}
                                            />
                                        </Group>
                                    )}
                                </Stack>
                            )}
                        </Stack>
                    </Paper>

                    {/* 🔥 RESUMEN DE LIQUIDACIÓN 🔥 */}
                    <Paper withBorder p="md" shadow="xs" bg="teal.0" style={{borderColor: 'var(--mantine-color-teal-3)'}}>
                        <Group justify="space-between" mb="xs">
                            <Text fw={800} size="sm" c="teal.9">RESUMEN DE LIQUIDACIÓN NETO:</Text>
                            <IconCalculator size={20} color="var(--mantine-color-teal-7)" />
                        </Group>
                        
                        <SimpleGrid cols={2} verticalSpacing={4}>
                            <Text size="xs">Monto Base USD:</Text>
                            <Text size="xs" ta="right" fw={700}>${calculos.baseUsd.toFixed(2)}</Text>
                            
                            {form.values.esFacturado && (
                                <>
                                    <Text size="xs" c="dimmed">IVA (16%):</Text>
                                    <Text size="xs" ta="right" c="dimmed">+ ${calculos.iva.toFixed(2)}</Text>
                                    
                                    {form.values.esAgenteRetencion && (
                                        <>
                                            <Text size="xs" c="red.7">Retención IVA:</Text>
                                            <Text size="xs" ta="right" c="red.7">- ${calculos.retIva.toFixed(2)}</Text>
                                            <Text size="xs" c="red.7">Retención ISLR:</Text>
                                            <Text size="xs" ta="right" c="red.7">- ${calculos.retIslr.toFixed(2)}</Text>
                                        </>
                                    )}
                                </>
                            )}

                            <Text size="xs" c="orange.8">Provisión Municipal (3%):</Text>
                            <Text size="xs" ta="right" c="orange.8">(${calculos.municipal.toFixed(2)})*</Text>
                        </SimpleGrid>

                        <Divider my="sm" variant="dashed" />

                        <Group justify="space-between">
                            <Stack gap={0}>
                                <Text size="xl" fw={900} c="teal.9">
                                    Total Neto: ${calculos.netoUsd.toLocaleString()}
                                </Text>
                                <Text size="xs" c="dimmed">Equivalente: Bs. {calculos.netoBs.toLocaleString()}</Text>
                            </Stack>
                            <Badge size="xl" color="teal" variant="filled">A BANCO</Badge>
                        </Group>
                        <Text size="10px" c="dimmed" mt="xs">* La provisión municipal se descuenta de tu utilidad neta, no del ingreso a banco.</Text>
                    </Paper>

                    <TextInput
                        label="Referencia / Factura"
                        placeholder="Nro de Control o Transferencia"
                        leftSection={<IconReceipt2 size={16} />}
                        {...form.getInputProps('referencia')}
                    />

                    <Button type="submit" color="teal" size="lg" fullWidth leftSection={<IconCheck size={20} />}>
                        Confirmar y Liquidar Ingreso
                    </Button>
                </Stack>
            </form>
        </div>
    );
}