'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    NumberInput, Select, Button, Group, Stack, LoadingOverlay,
    Paper, Title, Switch, Text, Divider, Alert, Checkbox, Modal, List, Input
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
    IconDashboard, IconAlertCircle, IconCheck, IconBuildingFactory, 
    IconGasStation, IconInfoCircle, IconRulerMeasure, IconMathSymbols, IconListNumbers, IconSettings, IconGeometry
} from '@tabler/icons-react';

import ModalConfigurarTanque from '../../activos/[id]/components/ModalConfigurarTanque';
import ODTSelectableGrid from '@/app/superuser/odt/ODTSelectableGrid';

export default function CargaCombustibleForm({ 
    activos = [], 
    tanquesInventario = [], 
    activoPredeterminadoId = null,
    onSuccess, 
    onCancel 
}) {
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const [capacidadFaltante, setCapacidadFaltante] = useState(false);
    const [modalConfigOpened, setModalConfigOpened] = useState(false);
    
    const [modalAfectadosOpened, setModalAfectadosOpened] = useState(false);
    const [equiposAfectadosList, setEquiposAfectadosList] = useState([]);

    const activosFiltrados = useMemo(() => {
        return activos.filter(a => a.remolqueInstancia?.plantilla?.tipoRemolque !== 'Batea');
    }, [activos]);

    const getDatosTanqueActivo = (idActivo) => {
        const activo = activosFiltrados.find(a => a.id.toString() === idActivo?.toString());
        if (!activo) return { capacidad: 0, nivel: 0, espacioLibre: 0, configTanque: null, activoCompleto: null };
        
        const capacidad = parseFloat(activo.capacidadTanque) || 0;
        const nivel = parseFloat(activo.nivelCombustible) || 0;
        const espacioLibre = Math.max(0, capacidad - nivel);

        const configTanque = activo.configuracionTanque 
                          || activo.vehiculoInstancia?.plantilla?.configuracionTanque
                          || activo.maquinaInstancia?.plantilla?.configuracionTanque
                          || activo.remolqueInstancia?.plantilla?.configuracionTanque;

        return { capacidad, nivel, espacioLibre, configTanque, activoCompleto: activo };
    };

    const form = useForm({
        initialValues: {
            activoId: activoPredeterminadoId || '',
            origen: 'interno',
            consumibleOrigenId: '',
            litros: '',
            costoTotal: '',
            kilometrajeAlMomento: '',
            fullTanque: true,
            usarAforoVara: false,
            centimetrosVara: '',
            corregirAforo: false,
            litrosAforadosManual: '',
            aprenderPuntoAforo: false,
            propagarPuntoModelo: false 
        },
        validate: {
            activoId: (value) => (!value ? 'Debe seleccionar un equipo' : null),
            kilometrajeAlMomento: (value) => (!value || value < 0 ? 'El kilometraje es obligatorio' : null),
            consumibleOrigenId: (value, values) => (values.origen === 'interno' && !value ? 'Debe seleccionar un tanque de origen' : null),
            costoTotal: (value, values) => (values.origen === 'externo' && (!value || value < 0) ? 'Debe indicar el costo del servicio externo' : null),
            litros: (value, values) => {
                const valNum = parseFloat(value);
                if (!valNum || valNum <= 0) return 'Ingrese una cantidad válida.';

                if (values.origen === 'interno' && values.consumibleOrigenId) {
                    const tanque = tanquesInventario.find(t => t.id.toString() === values.consumibleOrigenId);
                    if (tanque && valNum > parseFloat(tanque.stockAlmacen)) return `Excede el inventario.`;
                }

                if (values.activoId) {
                    const { capacidad, espacioLibre } = getDatosTanqueActivo(values.activoId);
                    if (capacidad <= 0) return 'El equipo no tiene capacidad registrada.';
                    if (valNum > espacioLibre) return `Solo hay espacio para ${espacioLibre.toFixed(2)} L.`;
                }
                return null;
            },
            centimetrosVara: (value, values) => (values.usarAforoVara && (!value || value <= 0) ? 'Indique los cm' : null),
            litrosAforadosManual: (value, values) => (values.corregirAforo && (!value || value <= 0) ? 'Indique los litros' : null)
        }
    });

    useEffect(() => {
        if (form.values.activoId) {
            const datos = getDatosTanqueActivo(form.values.activoId);
            setCapacidadFaltante(!datos || datos.capacidad <= 0);
            if (!datos?.configTanque && form.values.usarAforoVara) form.setFieldValue('usarAforoVara', false);
        } else {
            setCapacidadFaltante(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.values.activoId]);

    const calcularLitrosPorVara = () => {
        if (!form.values.usarAforoVara || !form.values.centimetrosVara || !form.values.activoId) return { litros: 0, metodo: null };
        const datos = getDatosTanqueActivo(form.values.activoId);
        if (!datos || !datos.configTanque) return { litros: 0, metodo: null };

        const h = parseFloat(form.values.centimetrosVara);
        const { dimensiones, tablaAforo, factorDescuento, tipoForma } = datos.configTanque;
        const qty = parseInt(dimensiones?.cantidadTanques) || 1;
        const descuento = parseFloat(factorDescuento) || 0;

        if (tablaAforo && tablaAforo.length > 0) {
            const aforo = [...tablaAforo].sort((a, b) => a.cm - b.cm);
            let litrosBase = 0;
            if (h <= 0) return { litros: 0, metodo: 'aforo' };
            if (h <= aforo[0].cm) litrosBase = (h / aforo[0].cm) * aforo[0].litros;
            else if (h >= aforo[aforo.length - 1].cm) litrosBase = aforo[aforo.length - 1].litros;
            else {
                for (let i = 0; i < aforo.length - 1; i++) {
                    if (h >= aforo[i].cm && h <= aforo[i+1].cm) {
                        const [h0, l0, h1, l1] = [aforo[i].cm, aforo[i].litros, aforo[i+1].cm, aforo[i+1].litros];
                        litrosBase = l0 + (h - h0) * ((l1 - l0) / (h1 - h0));
                        break;
                    }
                }
            }
            return { litros: parseFloat((litrosBase * qty).toFixed(2)), metodo: 'aforo' };
        }

        if (dimensiones && dimensiones.largo) {
            let volCm3 = 0;
            const L = parseFloat(dimensiones.largo);
            if (tipoForma === 'cilindrico') {
                const R = parseFloat(dimensiones.diametro) / 2;
                if (h >= (R*2)) volCm3 = Math.PI * Math.pow(R, 2) * L;
                else {
                    const part1 = Math.pow(R, 2) * Math.acos((R - h) / R);
                    const part2 = (R - h) * Math.sqrt(2 * R * h - Math.pow(h, 2));
                    volCm3 = L * (part1 - part2);
                    if (isNaN(volCm3)) volCm3 = 0; 
                }
            } else {
                const actualH = h > parseFloat(dimensiones.alto) ? parseFloat(dimensiones.alto) : h;
                volCm3 = L * parseFloat(dimensiones.ancho) * actualH;
            }
            return { litros: parseFloat(((volCm3 / 1000) * qty * (1 - descuento)).toFixed(2)), metodo: 'geometria' };
        }
        return { litros: 0, metodo: null };
    };

    const resultadoAforo = calcularLitrosPorVara();
    const litrosFinalesAforo = form.values.corregirAforo ? parseFloat(form.values.litrosAforadosManual) : resultadoAforo.litros;

    const handleSubmit = async (values) => {
        setLoading(true);
        setErrorMsg(null);

        try {
            const payload = {
                ...values,
                nivelAforadoAntesDeSurtir: values.usarAforoVara ? litrosFinalesAforo : null,
                guardarNuevoPuntoAforo: values.aprenderPuntoAforo,
                propagarPuntoModelo: values.propagarPuntoModelo
            };

            const response = await fetch('/api/gestionMantenimiento/combustible/cargar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Ocurrió un error al registrar la carga');

            notifications.show({ title: 'Despacho Exitoso', message: `Se han cargado ${values.litros}L al equipo.`, color: 'green', icon: <IconCheck size={18} /> });
            form.reset();
            if (onSuccess) onSuccess(data);

        } catch (error) {
            setErrorMsg(error.message);
            notifications.show({ title: 'Error de Despacho', message: error.message, color: 'red', icon: <IconAlertCircle size={18} /> });
        } finally {
            setLoading(false);
        }
    };

    const formatearLabelActivo = (a) => {
        let marcaModelo = '';
        if (a.vehiculoInstancia) marcaModelo = `${a.vehiculoInstancia.plantilla?.marca || ''} ${a.vehiculoInstancia.plantilla?.modelo || ''}`.trim();
        else if (a.remolqueInstancia) marcaModelo = `${a.remolqueInstancia.plantilla?.marca || ''} ${a.remolqueInstancia.plantilla?.modelo || ''}`.trim();
        else if (a.maquinaInstancia) marcaModelo = `${a.maquinaInstancia.plantilla?.marca || ''} ${a.maquinaInstancia.plantilla?.modelo || ''}`.trim();
        return `${a.codigoInterno}${marcaModelo ? ` • ${marcaModelo}` : ''}`;
    };

    const { capacidad, nivel, espacioLibre, configTanque, activoCompleto } = form.values.activoId ? getDatosTanqueActivo(form.values.activoId) : {};
    const litrosInput = parseFloat(form.values.litros) || 0;
    const tanqueSeleccionado = form.values.origen === 'interno' && form.values.consumibleOrigenId ? tanquesInventario.find(t => t.id.toString() === form.values.consumibleOrigenId) : null;

    const excedeCapacidadEquipo = configTanque && litrosInput > espacioLibre;
    const excedeInventarioBase = tanqueSeleccionado && litrosInput > parseFloat(tanqueSeleccionado.stockAlmacen);
    const botonBloqueado = capacidadFaltante || excedeCapacidadEquipo || excedeInventarioBase;

    const nombreModeloPlantilla = activoCompleto?.vehiculoInstancia?.plantilla?.modelo || activoCompleto?.maquinaInstancia?.plantilla?.modelo || activoCompleto?.remolqueInstancia?.plantilla?.modelo;

    // ✨ PREPARAMOS LA DATA PARA LA CUADRÍCULA VISUAL ✨
    const activosParaGrid = useMemo(() => {
        return activosFiltrados.map(a => ({
            id: a.id.toString(),
            nombre: formatearLabelActivo(a),
            imagen: a.imagen,
            raw: a // El Grid extrae las métricas y la lógica de bloqueo desde aquí
        }));
    }, [activosFiltrados]);

    return (
        <Paper shadow="sm" p="xl" withBorder radius="md" pos="relative">
            <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
            
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="lg">
                    <Title order={3} c="blue.8">Registrar Carga de Combustible</Title>

                    {errorMsg && <Alert icon={<IconAlertCircle size="1rem" />} color="red" variant="light">{errorMsg}</Alert>}

                    {/* 🔥 EL GRID REEMPLAZA AL VIEJO SELECT 🔥 */}
                    <Input.Wrapper error={form.errors.activoId}>
                        <ODTSelectableGrid
                            label="Equipo a Retanquear (Activo)"
                            data={activosParaGrid.map(a => ({ id: a.id, nombre: a.nombre, imagen: a.imagen, raw: {...a.raw, estado: "Operativo", horasAnuales: 10 }}))} // Mostrar todos los activos como operativos para selección, la lógica de bloqueo se maneja dentro del grid
                            value={form.values.activoId}
                            onChange={(val) => form.setFieldValue('activoId', val || '')}
                            showMetrics={false} 
                        />
                    </Input.Wrapper>

                    {configTanque && !capacidadFaltante && (
                        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />} py="xs">
                            <Group justify="space-between">
                                <Text size="sm">Capacidad: <b>{capacidad}L</b></Text>
                                <Text size="sm">Nivel Actual: <b>{nivel.toFixed(2)}L</b></Text>
                                <Text size="sm" c="blue.8">Libre: <b>{espacioLibre.toFixed(2)}L</b></Text>
                            </Group>
                        </Alert>
                    )}

                    {excedeCapacidadEquipo && (
                        <Alert variant="filled" color="red" icon={<IconAlertCircle size={16} />}>
                            No puedes meter {litrosInput} litros. El equipo solo tiene espacio para {espacioLibre.toFixed(2)} L.
                        </Alert>
                    )}

                    {capacidadFaltante && (
                        <Paper withBorder p="md" bg="orange.0" style={{ borderColor: '#ffe066' }}>
                            <Group align="flex-start" wrap="nowrap">
                                <IconGeometry size={28} color="#e67700" style={{ marginTop: 4 }} />
                                <Stack gap="xs" style={{ flex: 1 }}>
                                    <div>
                                        <Text fw={700} c="orange.9">El equipo no tiene geometría de tanque registrada</Text>
                                        <Text size="sm" c="orange.9">Debe configurar las dimensiones para procesar el despacho.</Text>
                                    </div>
                                    <Button color="orange.7" leftSection={<IconSettings size={16} />} onClick={() => setModalConfigOpened(true)} w="fit-content">
                                        Configurar Geometría Ahora
                                    </Button>
                                </Stack>
                            </Group>
                        </Paper>
                    )}

                    <Divider label="Aforo y Despacho" labelPosition="center" />

                    <Group grow align="flex-start">
                        <Select label="Origen" data={[{ value: 'interno', label: 'Tanque Propio' }, { value: 'externo', label: 'Estación Externa' }]} leftSection={form.values.origen === 'interno' ? <IconBuildingFactory size={16}/> : <IconGasStation size={16}/>} {...form.getInputProps('origen')} onChange={(val) => { form.setFieldValue('origen', val); form.setFieldValue('consumibleOrigenId', ''); form.setFieldValue('costoTotal', ''); }} />
                        {form.values.origen === 'interno' ? (
                            <Select label="Tanque de Almacenamiento" data={tanquesInventario.map(t => ({ value: t.id.toString(), label: `${t.nombre} (${parseFloat(t.stockAlmacen).toFixed(2)}L)` }))} searchable {...form.getInputProps('consumibleOrigenId')} />
                        ) : (
                            <NumberInput label="Costo Total ($)" decimalScale={2} prefix="$" {...form.getInputProps('costoTotal')} />
                        )}
                    </Group>

                    <Paper p="md" bg="blue.0" radius="md" style={{ border: '1px solid #a5d8ff' }}>
                        <Group justify="space-between" align="flex-start">
                            <div>
                                <Switch label={<Text fw={600} c="blue.9">Utilizar Aforo por Vara</Text>} checked={form.values.usarAforoVara} onChange={(event) => form.setFieldValue('usarAforoVara', event.currentTarget.checked)} disabled={!configTanque} color="blue" size="sm" />
                                {!configTanque && form.values.activoId && !capacidadFaltante && (
                                    <Group mt="xs" gap="xs">
                                        <Text size="xs" c="red">Debe configurar la geometría para usar la vara.</Text>
                                        <Button size="compact-xs" color="blue" variant="light" leftSection={<IconSettings size={12}/>} onClick={() => setModalConfigOpened(true)}>Configurar Geometría</Button>
                                    </Group>
                                )}
                            </div>
                            {form.values.usarAforoVara && resultadoAforo.metodo && (
                                <Alert p="xs" color={resultadoAforo.metodo === 'aforo' ? 'teal' : 'grape'} variant="light" style={{ padding: '4px 8px' }}>
                                    <Group gap="xs">
                                        {resultadoAforo.metodo === 'aforo' ? <IconListNumbers size={14} /> : <IconMathSymbols size={14} />}
                                        <Text size="xs" fw={700}>{resultadoAforo.metodo === 'aforo' ? 'Usando Puntos de Ref.' : 'Usando Geometría Pura'}</Text>
                                    </Group>
                                </Alert>
                            )}
                        </Group>

                        {form.values.usarAforoVara && (
                            <Stack mt="md">
                                <Group align="flex-end">
                                    <NumberInput label="Centímetros mojados" suffix=" cm" min={1} style={{ flex: 1 }} leftSection={<IconRulerMeasure size={16} />} {...form.getInputProps('centimetrosVara')} />
                                    <Paper p="xs" px="md" withBorder bg={form.values.corregirAforo ? 'gray.1' : 'white'} shadow="xs" style={{ opacity: form.values.corregirAforo ? 0.5 : 1 }}>
                                        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Cálculo del Sistema</Text>
                                        <Text fw={900} size="xl" c={resultadoAforo.metodo === 'aforo' ? 'teal.8' : 'grape.8'}>{resultadoAforo.litros} L</Text>
                                    </Paper>
                                </Group>

                                {form.values.centimetrosVara > 0 && (
                                    <Paper withBorder p="sm" bg="orange.0" radius="md" style={{ borderColor: '#ffe066' }}>
                                        <Switch label={<Text size="sm" fw={600}>Corregir medición empírica</Text>} checked={form.values.corregirAforo} onChange={(e) => { form.setFieldValue('corregirAforo', e.currentTarget.checked); if(!e.currentTarget.checked) { form.setFieldValue('aprenderPuntoAforo', false); form.setFieldValue('propagarPuntoModelo', false); } }} color="orange" />
                                        
                                        {form.values.corregirAforo && (
                                            <Stack mt="sm" gap="xs">
                                                <NumberInput placeholder="Litros Reales Descubiertos" suffix=" L" min={1} max={capacidad} w={200} {...form.getInputProps('litrosAforadosManual')} />
                                                
                                                <Paper p="xs" bg="white" withBorder>
                                                    <Checkbox 
                                                        label={<Text size="sm" fw={600}>Aprender: Guardar ({form.values.centimetrosVara}cm = {form.values.litrosAforadosManual || 0}L) para este equipo</Text>} 
                                                        description="Mejora la curva de aforo exclusiva de esta unidad."
                                                        checked={form.values.aprenderPuntoAforo} 
                                                        onChange={(e) => { form.setFieldValue('aprenderPuntoAforo', e.currentTarget.checked); if(!e.currentTarget.checked) form.setFieldValue('propagarPuntoModelo', false); }} 
                                                        color="teal" 
                                                    />
                                                    
                                                    {form.values.aprenderPuntoAforo && nombreModeloPlantilla && (
                                                        <Checkbox 
                                                            mt="xs"
                                                            ml="xl"
                                                            label={`Es tanque original: Propagar también a todos los modelos '${nombreModeloPlantilla}'`} 
                                                            description="¡Peligro! No marcar si este equipo tiene tanque aftermarket."
                                                            checked={form.values.propagarPuntoModelo} 
                                                            onChange={(e) => form.setFieldValue('propagarPuntoModelo', e.currentTarget.checked)} 
                                                            color="red" 
                                                        />
                                                    )}
                                                </Paper>
                                            </Stack>
                                        )}
                                    </Paper>
                                )}
                            </Stack>
                        )}
                    </Paper>

                    <Divider label="Datos de Consumo" labelPosition="center" />

                    <Group grow align="flex-start">
                        <NumberInput label="Litros Despachados" suffix=" L" min={1} max={espacioLibre || undefined} decimalScale={2} {...form.getInputProps('litros')} disabled={capacidadFaltante} />
                        <NumberInput label="Odómetro / Horómetro" leftSection={<IconDashboard size={16} />} min={0} {...form.getInputProps('kilometrajeAlMomento')} />
                    </Group>

                    {!form.values.usarAforoVara && (
                        <Switch label="¿Tanque Full?" checked={form.values.fullTanque} onChange={(e) => form.setFieldValue('fullTanque', e.currentTarget.checked)} color="blue" />
                    )}

                    <Group justify="right" mt="md">
                        {onCancel && <Button variant="default" onClick={onCancel}>Cancelar</Button>}
                        <Button type="submit" color="blue" leftSection={<IconGasStation size={18} />} disabled={botonBloqueado}>Confirmar Despacho</Button>
                    </Group>
                </Stack>
            </form>

            {activoCompleto && (
                <ModalConfigurarTanque 
                    opened={modalConfigOpened} 
                    onClose={() => setModalConfigOpened(false)} 
                    activo={activoCompleto} 
                    onSuccess={(dataModificada) => {
                        if (dataModificada) {
                            activoCompleto.configuracionTanque = dataModificada.configuracionTanque;
                            activoCompleto.capacidadTanque = dataModificada.capacidadNeta;

                            if (dataModificada.propagate) {
                                const idPlantilla = activoCompleto.vehiculoInstancia?.vehiculoId || activoCompleto.maquinaInstancia?.maquinaId || activoCompleto.remolqueInstancia?.remolqueId;
                                if (idPlantilla) {
                                    activos.forEach(a => {
                                        const suPlantilla = a.vehiculoInstancia?.vehiculoId || a.maquinaInstancia?.maquinaId || a.remolqueInstancia?.remolqueId;
                                        if (suPlantilla === idPlantilla) {
                                            if (!a.capacidadTanque || parseFloat(a.capacidadTanque) === 0) {
                                                a.capacidadTanque = dataModificada.capacidadNeta;
                                            }
                                            if (a.vehiculoInstancia) a.vehiculoInstancia.plantilla.configuracionTanque = dataModificada.configuracionTanque;
                                            else if (a.remolqueInstancia) a.remolqueInstancia.plantilla.configuracionTanque = dataModificada.configuracionTanque;
                                            else if (a.maquinaInstancia) a.maquinaInstancia.plantilla.configuracionTanque = dataModificada.configuracionTanque;
                                        }
                                    });
                                }
                            }

                            if (dataModificada.afectados && dataModificada.afectados.length > 0) {
                                setEquiposAfectadosList(dataModificada.afectados);
                                setModalAfectadosOpened(true);
                            }
                        }
                        
                        form.setFieldValue('activoId', '');
                        setTimeout(() => form.setFieldValue('activoId', activoCompleto.id.toString()), 50);
                    }} 
                />
            )}

            <Modal 
                opened={modalAfectadosOpened} 
                onClose={() => setModalAfectadosOpened(false)} 
                title={<Group gap="sm"><IconCheck color="teal" /><Text fw={700} c="teal.8">Propagación Exitosa</Text></Group>}
                centered
            >
                <Text size="sm" mb="md" fw={500}>
                    Se ha guardado la geometría y se ha propagado automáticamente a los siguientes equipos de la flota que no tenían configuración previa:
                </Text>
                
                <Paper withBorder p="xs" bg="gray.0">
                    <List spacing="xs" size="sm" center icon={<IconCheck size={16} color="teal" />}>
                        {equiposAfectadosList.map(codigo => (
                            <List.Item key={codigo}>
                                <Text fw={600}>{codigo}</Text>
                            </List.Item>
                        ))}
                    </List>
                </Paper>

                <Button fullWidth mt="xl" color="blue" onClick={() => setModalAfectadosOpened(false)}>
                    Entendido
                </Button>
            </Modal>
        </Paper>
    );
}