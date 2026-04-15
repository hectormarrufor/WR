'use client';

import { useState, useMemo } from 'react';
import { 
    Modal, Button, Group, Stack, NumberInput, SegmentedControl, 
    Switch, Text, Paper, Divider, LoadingOverlay, Center, ActionIcon, Table, SimpleGrid, Image, Box
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
    IconCheck, IconAlertCircle, IconGeometry, 
    IconSettings, IconPlus, IconTrash, IconListNumbers, IconGasStation, IconChartLine 
} from '@tabler/icons-react';
// 🔥 Cambiamos a LineChart igual que en tu BCV 🔥
import { LineChart } from '@mantine/charts';
import '@mantine/charts/styles.css';

export default function ModalConfigurarTanque({ opened, onClose, activo, onSuccess, modoLocal = false }) {
    const [loading, setLoading] = useState(false);

    const configInicial = activo?.configuracionTanque 
                       || activo?.vehiculoInstancia?.plantilla?.configuracionTanque 
                       || activo?.maquinaInstancia?.plantilla?.configuracionTanque 
                       || activo?.remolqueInstancia?.plantilla?.configuracionTanque 
                       || {};
                       
    const dimsIniciales = configInicial.dimensiones || {};
    const tieneAforoPrevio = configInicial.tablaAforo && configInicial.tablaAforo.length > 0;

    const esRadialObligatorio = configInicial.tipoForma === 'radial_total';

    const form = useForm({
        initialValues: {
            tipoForma: configInicial.tipoForma || 'cilindrico',
            cantidadTanques: dimsIniciales.cantidadTanques || 1,
            largo: dimsIniciales.largo || '',
            diametro: dimsIniciales.diametro || '', 
            ancho: dimsIniciales.ancho || '',       
            alto: dimsIniciales.alto || '',
            altoRecto: dimsIniciales.altoRecto || '',
            anchoSuperior: dimsIniciales.anchoSuperior || '',

            propagateToTemplate: true,
            
            usarAforoManual: esRadialObligatorio ? true : tieneAforoPrevio,
            tablaAforo: tieneAforoPrevio ? configInicial.tablaAforo : [{ cm: '', litros: '' }],
            cmVaraActual: '' 
        },
        validate: {
            cantidadTanques: (value) => (!value || value < 1 ? 'Mínimo 1 tanque' : null),
            largo: (value, values) => (values.tipoForma !== 'radial_total' && (!value || value <= 0) ? 'Requerido' : null),
            diametro: (value, values) => (values.tipoForma === 'cilindrico' && (!value || value <= 0) ? 'Requerido' : null),
            ancho: (value, values) => ((values.tipoForma === 'rectangular' || values.tipoForma === 'chaflan_superior') && (!value || value <= 0) ? 'Requerido' : null),
            alto: (value, values) => ((values.tipoForma === 'rectangular' || values.tipoForma === 'chaflan_superior') && (!value || value <= 0) ? 'Requerido' : null),
            altoRecto: (value, values) => (values.tipoForma === 'chaflan_superior' && (!value || value <= 0) ? 'Requerido' : null),
            anchoSuperior: (value, values) => (values.tipoForma === 'chaflan_superior' && (!value || value <= 0) ? 'Requerido' : null),
            cmVaraActual: (value) => (value !== '' && value < 0 ? 'No puede ser negativo' : null)
        }
    });

    const calcularLitrosPorCm = (cmEval, values) => {
        if (isNaN(cmEval) || cmEval < 0) return 0;

        const { tipoForma, cantidadTanques, largo, diametro, ancho, alto, altoRecto, anchoSuperior, usarAforoManual, tablaAforo } = values;
        const L = parseFloat(largo) || 0;
        const qty = parseInt(cantidadTanques) || 1;

        let litrosBase = 0;

        if (usarAforoManual && tablaAforo.length > 0) {
            const aforo = [...tablaAforo].sort((a, b) => parseFloat(a.cm) - parseFloat(b.cm)).filter(a => a.cm !== '' && a.litros !== '');
            if (aforo.length === 0) return 0;
            if (cmEval <= parseFloat(aforo[0].cm)) return parseFloat(aforo[0].litros) * qty;
            if (cmEval >= parseFloat(aforo[aforo.length - 1].cm)) return parseFloat(aforo[aforo.length - 1].litros) * qty;

            for (let i = 0; i < aforo.length - 1; i++) {
                const p1 = { cm: parseFloat(aforo[i].cm), l: parseFloat(aforo[i].litros) };
                const p2 = { cm: parseFloat(aforo[i+1].cm), l: parseFloat(aforo[i+1].litros) };
                if (cmEval >= p1.cm && cmEval <= p2.cm) {
                    const pendiente = (p2.l - p1.l) / (p2.cm - p1.cm);
                    litrosBase = p1.l + pendiente * (cmEval - p1.cm);
                    break;
                }
            }
            return litrosBase * qty;
        }

        if (tipoForma === 'cilindrico') {
            const D = parseFloat(diametro) || 0;
            if (D === 0) return 0;
            const h = Math.min(cmEval, D); 
            const R = D / 2;
            const area = (Math.pow(R, 2) * Math.acos((R - h) / R)) - ((R - h) * Math.sqrt((2 * R * h) - Math.pow(h, 2)));
            litrosBase = (area * L) / 1000;
        } 
        else if (tipoForma === 'rectangular') {
            const W = parseFloat(ancho) || 0;
            const H = parseFloat(alto) || 0;
            if (H === 0) return 0;
            const h = Math.min(cmEval, H);
            litrosBase = (L * W * h) / 1000;
        }
        else if (tipoForma === 'chaflan_superior') {
            const W_base = parseFloat(ancho) || 0;
            const H_total = parseFloat(alto) || 0;
            const H_rect = parseFloat(altoRecto) || 0;
            const W_top = parseFloat(anchoSuperior) || 0;
            if (H_total === 0) return 0;
            const h = Math.min(cmEval, H_total);
            let areaParcial = 0;
            if (h <= H_rect) {
                areaParcial = W_base * h;
            } else {
                const areaBase = W_base * H_rect;
                const h_trapecio = h - H_rect; 
                const H_chaflan_total = H_total - H_rect;
                const W_h = W_base - ((W_base - W_top) * (h_trapecio / H_chaflan_total));
                const areaTrapecioParcial = ((W_base + W_h) / 2) * h_trapecio;
                areaParcial = areaBase + areaTrapecioParcial;
            }
            litrosBase = (areaParcial * L) / 1000;
        }

        return litrosBase * qty;
    };

    const calcularCapacidad = () => {
        const { tipoForma, alto, diametro, usarAforoManual, tablaAforo } = form.values;
        let cmTope = 0;

        if (tipoForma === 'radial_total' || usarAforoManual) {
            const aforo = [...tablaAforo].filter(a => a.cm !== '' && a.litros !== '').sort((a, b) => parseFloat(a.cm) - parseFloat(b.cm));
            if (aforo.length > 0) cmTope = parseFloat(aforo[aforo.length - 1].cm);
        } else {
            cmTope = tipoForma === 'cilindrico' ? (parseFloat(diametro) || 0) : (parseFloat(alto) || 0);
        }

        const maxLitros = calcularLitrosPorCm(cmTope, form.values);
        return { netoTotal: maxLitros.toFixed(2), topeCm: cmTope };
    };

    const capacidadCalculada = calcularCapacidad();
    const litrosActualesCalculados = (calcularLitrosPorCm(parseFloat(form.values.cmVaraActual), form.values)).toFixed(2);

    // 🔥 GENERADOR DE DATOS BLOQUEADO PARA CEROS 🔥
    const datosGrafica = useMemo(() => {
        const hMax = capacidadCalculada.topeCm;
        const maxLitros = parseFloat(capacidadCalculada.netoTotal);
        
        // Si no hay altura O los litros son cero (falta Largo), no generamos array para mostrar la alerta
        if (!hMax || hMax <= 0 || !maxLitros || maxLitros <= 0) return [];

        const puntos = [];
        const maxInt = Math.ceil(hMax);

        for (let i = 0; i <= maxInt; i++) {
            const litros = calcularLitrosPorCm(i, form.values);
            puntos.push({
                cmLabel: String(i), 
                litros: Math.round(litros)
            });
        }
        
        return puntos;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.values, capacidadCalculada.topeCm, capacidadCalculada.netoTotal]);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const tablaAforoFinal = values.usarAforoManual 
                ? values.tablaAforo.filter(i => i.cm !== '' && i.litros !== '').map(i => ({ cm: parseFloat(i.cm), litros: parseFloat(i.litros) }))
                : [];

            const configuracionTanque = {
                tipoForma: values.tipoForma,
                dimensiones: {
                    cantidadTanques: parseInt(values.cantidadTanques),
                    largo: values.tipoForma === 'radial_total' ? null : parseFloat(values.largo),
                    diametro: values.tipoForma === 'cilindrico' ? parseFloat(values.diametro) : null,
                    ancho: (values.tipoForma === 'rectangular' || values.tipoForma === 'chaflan_superior') ? parseFloat(values.ancho) : null,
                    alto: (values.tipoForma === 'rectangular' || values.tipoForma === 'chaflan_superior') ? parseFloat(values.alto) : null,
                    altoRecto: values.tipoForma === 'chaflan_superior' ? parseFloat(values.altoRecto) : null,
                    anchoSuperior: values.tipoForma === 'chaflan_superior' ? parseFloat(values.anchoSuperior) : null,
                },
                factorDescuento: 0, 
                tablaAforo: tablaAforoFinal
            };

            const payloadResult = {
                configuracionTanque,
                capacidadNeta: parseFloat(capacidadCalculada.netoTotal),
                propagate: values.propagateToTemplate,
                nivelCombustible: parseFloat(litrosActualesCalculados) || 0, 
                afectados: []
            };

            if (modoLocal) {
                if (onSuccess) onSuccess(payloadResult);
                onClose();
                return;
            }

            const payloadAPI = {
                activoId: activo.id,
                configuracionTanque,
                propagateToTemplate: values.propagateToTemplate,
                capacidadNeta: payloadResult.capacidadNeta,
                nivelCombustible: payloadResult.nivelCombustible
            };

            const response = await fetch('/api/gestionMantenimiento/activos/guardar-geometria-tanque', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadAPI)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al guardar');

            notifications.show({ title: 'Geometría Guardada', message: 'Configuración guardada exitosamente.', color: 'green', icon: <IconCheck size={18} /> });
            
            payloadResult.afectados = data.afectados || [];
            if (onSuccess) onSuccess(payloadResult);
            onClose();

        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red', icon: <IconAlertCircle size={18} /> });
        } finally {
            setLoading(false);
        }
    };

    const getImagenTanque = (tipo) => {
        switch (tipo) {
            case 'cilindrico': return '/cilindrico.png';
            case 'rectangular': return '/rectangular.png';
            case 'chaflan_superior': return '/chaflan-superior.png';
            case 'radial_total': return '/chaflan-superior-e-inferior.png';
            default: return '/rectangular.png';
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title={<Group gap="sm"><IconGeometry c="blue" /><Text fw={700} size="lg" c="blue.8">Geometría del Tanque Maestro</Text></Group>} size="xl" centered>
            <LoadingOverlay visible={loading} />
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    
                    <Paper withBorder p="md" bg="gray.1" radius="md" style={{ overflow: 'hidden' }}>
                        <Stack align="center" gap="sm">
                            <SegmentedControl
                                data={[
                                    { value: 'cilindrico', label: 'Cilíndrico' },
                                    { value: 'rectangular', label: 'Rectangular' },
                                    { value: 'chaflan_superior', label: 'Chaflán Sup.' },
                                    { value: 'radial_total', label: 'Radial Total' } 
                                ]}
                                color="blue"
                                fullWidth
                                {...form.getInputProps('tipoForma')}
                                onChange={(val) => {
                                    form.setFieldValue('tipoForma', val); 
                                    if (val === 'radial_total') {
                                        form.setFieldValue('usarAforoManual', true);
                                    }
                                }}
                            />
                            <Divider w="100%" />
                            
                            <Box 
                                style={{ 
                                    width: '100%', 
                                    height: 220, 
                                    display: 'flex', 
                                    justifyContent: 'center', 
                                    alignItems: 'center',
                                    background: 'white',
                                    borderRadius: '8px',
                                    border: '1px solid var(--mantine-color-gray-3)'
                                }}
                            >
                                <Image 
                                    src={getImagenTanque(form.values.tipoForma)}
                                    maxHeight={200}
                                    style={{ objectFit: 'contain', width: 'auto', height: '100%' }}
                                    alt="Forma del tanque"
                                />
                            </Box>
                            
                            {form.values.tipoForma === 'radial_total' && (
                                <Text size="xs" c="indigo" fw={700}>* Tanque de bordes suavizados (Estilo Iveco). Requiere Aforo Exacto.</Text>
                            )}
                        </Stack>
                    </Paper>

                    {form.values.tipoForma !== 'radial_total' && (
                        <Paper withBorder p="md" bg="gray.0" radius="md">
                            <Group justify="space-between" mb="sm">
                                <Text fw={600} size="sm">Dimensiones Físicas (Por unidad)</Text>
                                <NumberInput label="Cant. Tanques Gemelos" min={1} max={4} size="xs" w={120} {...form.getInputProps('cantidadTanques')} />
                            </Group>
                            
                            <SimpleGrid cols={{ base: 1, sm: form.values.tipoForma === 'chaflan_superior' ? 2 : 3 }} spacing="sm">
                                <NumberInput label="Largo Total (L)" placeholder="Ej: 150" suffix=" cm" min={1} {...form.getInputProps('largo')} />
                                
                                {form.values.tipoForma === 'cilindrico' && (
                                    <NumberInput label="Diámetro (D)" placeholder="Ej: 65" suffix=" cm" min={1} {...form.getInputProps('diametro')} />
                                )}

                                {(form.values.tipoForma === 'rectangular' || form.values.tipoForma === 'chaflan_superior') && (
                                    <>
                                        <NumberInput label={form.values.tipoForma === 'chaflan_superior' ? "Ancho Base (W)" : "Ancho (W)"} placeholder="Ej: 60" suffix=" cm" min={1} {...form.getInputProps('ancho')} />
                                        <NumberInput label="Alto Total (H)" placeholder="Ej: 60" suffix=" cm" min={1} {...form.getInputProps('alto')} />
                                    </>
                                )}
                                
                                {form.values.tipoForma === 'chaflan_superior' && (
                                    <>
                                        <NumberInput label="Alto Recto (Hasta el doblez)" placeholder="Ej: 40" suffix=" cm" min={1} {...form.getInputProps('altoRecto')} />
                                        <NumberInput label="Ancho Superior" placeholder="Ej: 30" suffix=" cm" min={1} {...form.getInputProps('anchoSuperior')} />
                                    </>
                                )}
                            </SimpleGrid>
                        </Paper>
                    )}

                    {form.values.tipoForma === 'radial_total' && (
                        <Paper withBorder p="sm" bg="gray.0" radius="md">
                             <NumberInput label="Cantidad de Tanques Gemelos (Radial)" min={1} max={4} {...form.getInputProps('cantidadTanques')} />
                        </Paper>
                    )}

                    {/* 🔥 GRÁFICA CON PATRONES DEL BCV 🔥 */}
                    <Paper withBorder p="md" bg="gray.0" radius="md">
                        <Group justify="space-between" mb="sm">
                            <Text fw={800} c="blue.9" display="flex" style={{ alignItems: 'center', gap: 6 }}>
                                <IconChartLine size={18} /> Curva de Aforo Teórica
                            </Text>
                            <Text size="xs" c="dimmed" fw={600}>Eje Y: Litros | Eje X: Marca de Vara (cm)</Text>
                        </Group>
                        <Box h={200}>
                            {datosGrafica.length > 1 ? (
                                <LineChart
                                    h={200}
                                    data={datosGrafica}
                                    dataKey="cmLabel"
                                    series={[{ name: 'litros', label: 'Volumen', color: 'blue.6' }]}
                                    curveType={form.values.tipoForma === 'cilindrico' ? 'monotone' : 'linear'}
                                    withDots={false}
                                    tickLine="xy"
                                    gridAxis="xy"
                                    yAxisProps={{ 
                                        tickFormatter: (value) => `${value}`
                                    }}
                                    valueFormatter={(val) => `${val} L`}
                                    tooltipAnimationDuration={200}
                                    strokeWidth={3}
                                />
                            ) : (
                                <Center h="100%" px="md">
                                    <Text size="sm" c="dimmed" fs="italic" ta="center">
                                        Ingrese todas las dimensiones (Largo incluido) para generar el volumen y ver la curva de aforo.
                                    </Text>
                                </Center>
                            )}
                        </Box>
                    </Paper>

                    <Paper withBorder p="md" bg="teal.0" radius="md" style={{ borderColor: '#63e6be' }}>
                        <Group justify="space-between" mb="xs">
                            <Text fw={800} c="teal.9" display="flex" style={{ alignItems: 'center', gap: 6 }}>
                                <IconGasStation size={18} /> Nivel de Combustible Actual
                            </Text>
                            <Text size="sm" c="teal.8" fw={600}>
                                Capacidad Total (Neto): {capacidadCalculada.netoTotal} L
                            </Text>
                        </Group>
                        
                        <Group grow align="flex-start">
                            <NumberInput
                                label="Marca en la Vara (Lectura Física)"
                                description="Ingrese los cm de la vara mojada"
                                placeholder="Ej: 25"
                                suffix=" cm"
                                min={0}
                                decimalScale={1}
                                {...form.getInputProps('cmVaraActual')}
                                styles={{ input: { borderColor: 'var(--mantine-color-teal-6)', fontWeight: 600 } }}
                            />
                            <NumberInput
                                label="Equivalente Calculado"
                                description={form.values.tipoForma === 'radial_total' ? "Basado en Tabla de Aforo" : "Aforo Teórico / Geométrico"}
                                value={litrosActualesCalculados}
                                readOnly
                                variant="filled"
                                suffix=" L"
                                decimalScale={2}
                                styles={{ input: { fontWeight: 900, color: 'var(--mantine-color-teal-9)', fontSize: '1.1rem' } }}
                            />
                        </Group>
                    </Paper>

                    <Divider />

                    <Paper withBorder p="md" bg="indigo.0" radius="md" style={{ borderColor: '#a5d8ff' }}>
                        <Group justify="space-between" mb={form.values.usarAforoManual ? "md" : 0}>
                            <div>
                                <Text fw={700} c="indigo.9" size="sm" display="flex" style={{ alignItems: 'center', gap: 6 }}>
                                    <IconListNumbers size={18} /> Puntos de Referencia (Tabla de Aforo)
                                </Text>
                                {form.values.tipoForma === 'radial_total' && (
                                    <Text size="xs" c="indigo.7" fw={600}>Obligatorio para este tipo de tanque.</Text>
                                )}
                            </div>
                            <Switch 
                                checked={form.values.usarAforoManual}
                                onChange={(event) => {
                                    if (form.values.tipoForma !== 'radial_total') {
                                        form.setFieldValue('usarAforoManual', event.currentTarget.checked);
                                    }
                                }}
                                color="indigo"
                                disabled={form.values.tipoForma === 'radial_total'}
                            />
                        </Group>

                        {form.values.usarAforoManual && (
                            <Stack gap="xs">
                                <Table striped highlightOnHover withRowBorders={false}>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Marca en la Vara (cm)</Table.Th>
                                            <Table.Th>Litros Equivalentes (Por Unidad)</Table.Th>
                                            <Table.Th w={40}></Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {form.values.tablaAforo.map((item, index) => (
                                            <Table.Tr key={index}>
                                                <Table.Td p={4}>
                                                    <NumberInput placeholder="Ej: 10" suffix=" cm" min={0} hideControls {...form.getInputProps(`tablaAforo.${index}.cm`)} />
                                                </Table.Td>
                                                <Table.Td p={4}>
                                                    <NumberInput placeholder="Ej: 45" suffix=" L" min={0} hideControls {...form.getInputProps(`tablaAforo.${index}.litros`)} />
                                                </Table.Td>
                                                <Table.Td p={4} ta="center">
                                                    <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem('tablaAforo', index)}>
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                                <Button variant="light" color="indigo" size="xs" leftSection={<IconPlus size={14} />} onClick={() => form.insertListItem('tablaAforo', { cm: '', litros: '' })}>
                                    Agregar Punto de Medición
                                </Button>
                            </Stack>
                        )}
                    </Paper>

                    {!modoLocal && (
                        <>
                            <Divider />
                            <Switch
                                label={<Text fw={600}>Propagar a la plantilla del modelo</Text>}
                                description={`Aplicar esta geometría a todos los equipos de esta plantilla.`}
                                checked={form.values.propagateToTemplate}
                                onChange={(event) => form.setFieldValue('propagateToTemplate', event.currentTarget.checked)}
                                color="blue"
                                size="md"
                            />
                        </>
                    )}

                    <Group justify="right" mt="sm">
                        <Button variant="default" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" color="blue" leftSection={<IconSettings size={18} />}>
                            Guardar Configuración
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}