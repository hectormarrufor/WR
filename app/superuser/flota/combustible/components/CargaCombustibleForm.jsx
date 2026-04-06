'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    NumberInput, Select, Button, Group, Stack, LoadingOverlay,
    Paper, Title, Switch, Text, Divider, Alert, Checkbox
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
    IconDashboard, IconAlertCircle, IconCheck, IconBuildingFactory, 
    IconGasStation, IconInfoCircle, IconRulerMeasure, IconMathSymbols, IconListNumbers, IconSettings, IconGeometry
} from '@tabler/icons-react';

// Ajusta esta ruta según la ubicación real de tu componente
import ModalConfigurarTanque from '../../activos/[id]/components/ModalConfigurarTanque';

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
    
    // Estado para abrir el modal de geometría sin salir de la página
    const [modalConfigOpened, setModalConfigOpened] = useState(false);

    // Evita bucles infinitos en React
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
            aprenderPuntoAforo: false
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
                    if (tanque && valNum > parseFloat(tanque.stockAlmacen)) {
                        return `Excede el inventario. Solo hay ${tanque.stockAlmacen}L disponibles.`;
                    }
                }

                if (values.activoId) {
                    const { capacidad, espacioLibre } = getDatosTanqueActivo(values.activoId);
                    if (capacidad <= 0) {
                        return 'El equipo no tiene capacidad registrada. Fíjela primero.';
                    }
                    if (valNum > espacioLibre) {
                        return `Solo hay espacio para ${espacioLibre.toFixed(2)} L en este equipo.`;
                    }
                }

                return null;
            },
            centimetrosVara: (value, values) => {
                if (values.usarAforoVara && (!value || value <= 0)) return 'Indique los cm marcados en la vara';
                return null;
            },
            litrosAforadosManual: (value, values) => {
                if (values.corregirAforo && (!value || value <= 0)) return 'Debe indicar los litros reales descubiertos';
                return null;
            }
        }
    });

    useEffect(() => {
        if (form.values.activoId) {
            const datos = getDatosTanqueActivo(form.values.activoId);
            setCapacidadFaltante(!datos || datos.capacidad <= 0);
            
            if (!datos?.configTanque && form.values.usarAforoVara) {
                form.setFieldValue('usarAforoVara', false);
            }
        } else {
            setCapacidadFaltante(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.values.activoId]);

    // 🔥 ELIMINAMOS handleFijarCapacidad y sus estados manuales 🔥

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

            if (h <= aforo[0].cm) {
                litrosBase = (h / aforo[0].cm) * aforo[0].litros;
            } 
            else if (h >= aforo[aforo.length - 1].cm) {
                litrosBase = aforo[aforo.length - 1].litros;
            } 
            else {
                for (let i = 0; i < aforo.length - 1; i++) {
                    if (h >= aforo[i].cm && h <= aforo[i+1].cm) {
                        const h0 = aforo[i].cm;
                        const l0 = aforo[i].litros;
                        const h1 = aforo[i+1].cm;
                        const l1 = aforo[i+1].litros;
                        litrosBase = l0 + (h - h0) * ((l1 - l0) / (h1 - h0));
                        break;
                    }
                }
            }

            const litrosNetos = litrosBase * qty;
            return { litros: parseFloat(litrosNetos.toFixed(2)), metodo: 'aforo' };
        }

        if (dimensiones && dimensiones.largo) {
            let volCm3 = 0;
            const L = parseFloat(dimensiones.largo);

            if (tipoForma === 'cilindrico') {
                const D = parseFloat(dimensiones.diametro);
                const R = D / 2;
                if (h >= D) {
                    volCm3 = Math.PI * Math.pow(R, 2) * L;
                } else {
                    const part1 = Math.pow(R, 2) * Math.acos((R - h) / R);
                    const part2 = (R - h) * Math.sqrt(2 * R * h - Math.pow(h, 2));
                    volCm3 = L * (part1 - part2);
                    if (isNaN(volCm3)) volCm3 = 0; 
                }
            } else {
                const W = parseFloat(dimensiones.ancho);
                const maxH = parseFloat(dimensiones.alto);
                const actualH = h > maxH ? maxH : h;
                volCm3 = L * W * actualH;
            }

            const litrosBrutos = (volCm3 / 1000) * qty;
            const litrosNetos = litrosBrutos * (1 - descuento);
            return { litros: parseFloat(litrosNetos.toFixed(2)), metodo: 'geometria' };
        }

        return { litros: 0, metodo: null };
    };

    const resultadoAforo = calcularLitrosPorVara();
    
    const litrosFinalesAforo = form.values.corregirAforo 
        ? parseFloat(form.values.litrosAforadosManual) 
        : resultadoAforo.litros;

    const handleSubmit = async (values) => {
        setLoading(true);
        setErrorMsg(null);

        try {
            const payload = {
                ...values,
                nivelAforadoAntesDeSurtir: values.usarAforoVara ? litrosFinalesAforo : null,
                guardarNuevoPuntoAforo: values.aprenderPuntoAforo 
            };

            const response = await fetch('/api/gestionMantenimiento/combustible/cargar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ocurrió un error al registrar la carga');
            }

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
        let placa = '';
        let tipoEspecial = '';

        if (a.vehiculoInstancia) {
            marcaModelo = `${a.vehiculoInstancia.plantilla?.marca || ''} ${a.vehiculoInstancia.plantilla?.modelo || ''}`.trim();
            placa = a.vehiculoInstancia.placa;
            tipoEspecial = a.vehiculoInstancia.plantilla?.tipoVehiculo || 'Vehículo';
        } else if (a.remolqueInstancia) {
            marcaModelo = `${a.remolqueInstancia.plantilla?.marca || ''} ${a.remolqueInstancia.plantilla?.modelo || ''}`.trim();
            placa = a.remolqueInstancia.placa;
            tipoEspecial = a.remolqueInstancia.plantilla?.tipoRemolque || 'Remolque';
        } else if (a.maquinaInstancia) {
            marcaModelo = `${a.maquinaInstancia.plantilla?.marca || ''} ${a.maquinaInstancia.plantilla?.modelo || ''}`.trim();
            placa = a.maquinaInstancia.serialMotor || 'S/N';
            tipoEspecial = 'Máquina';
        }

        let labelFinal = a.codigoInterno;
        if (marcaModelo) labelFinal += ` • ${marcaModelo}`;
        if (tipoEspecial) labelFinal += ` (${tipoEspecial})`;
        if (placa) labelFinal += ` • Placa: ${placa}`;

        return labelFinal;
    };

    const { capacidad, nivel, espacioLibre, configTanque, activoCompleto } = form.values.activoId ? getDatosTanqueActivo(form.values.activoId) : {};
    const litrosInput = parseFloat(form.values.litros) || 0;
    
    const tanqueSeleccionado = form.values.origen === 'interno' && form.values.consumibleOrigenId
        ? tanquesInventario.find(t => t.id.toString() === form.values.consumibleOrigenId)
        : null;

    const excedeCapacidadEquipo = configTanque && litrosInput > espacioLibre;
    const excedeInventarioBase = tanqueSeleccionado && litrosInput > parseFloat(tanqueSeleccionado.stockAlmacen);
    const botonBloqueado = capacidadFaltante || excedeCapacidadEquipo || excedeInventarioBase;

    return (
        <Paper shadow="sm" p="xl" withBorder radius="md" pos="relative">
            <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
            
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="lg">
                    <Title order={3} c="blue.8">Registrar Carga de Combustible</Title>

                    {errorMsg && (
                        <Alert icon={<IconAlertCircle size="1rem" />} title="Atención" color="red" variant="light">
                            {errorMsg}
                        </Alert>
                    )}

                    <Select
                        label="Equipo a Retanquear (Activo)"
                        placeholder="Buscar por código, placa, tipo (ej. Vaccum)..."
                        data={activosFiltrados.map(a => ({ value: a.id.toString(), label: formatearLabelActivo(a) }))}
                        searchable
                        nothingFoundMessage="No se encontraron equipos aptos"
                        leftSection={<IconGasStation size={16} />}
                        {...form.getInputProps('activoId')}
                    />

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

                    {excedeInventarioBase && (
                        <Alert variant="filled" color="red" icon={<IconAlertCircle size={16} />}>
                            No hay suficiente gasoil en la base. Solo quedan {parseFloat(tanqueSeleccionado.stockAlmacen).toFixed(2)} L disponibles.
                        </Alert>
                    )}

                    {/* 🔥 EL RECUADRO NARANJA AHORA INSTA A CONFIGURAR LA GEOMETRÍA 🔥 */}
                    {capacidadFaltante && (
                        <Paper withBorder p="md" bg="orange.0" style={{ borderColor: '#ffe066' }}>
                            <Group align="flex-start" wrap="nowrap">
                                <IconGeometry size={28} color="#e67700" style={{ marginTop: 4 }} />
                                <Stack gap="xs" style={{ flex: 1 }}>
                                    <div>
                                        <Text fw={700} c="orange.9">El equipo no tiene geometría de tanque registrada</Text>
                                        <Text size="sm" c="orange.9">Debe configurar las dimensiones del tanque para que el sistema calcule la capacidad exacta y pueda procesar el despacho.</Text>
                                    </div>
                                    <Button 
                                        color="orange.7" 
                                        variant="filled"
                                        leftSection={<IconSettings size={16} />}
                                        onClick={() => setModalConfigOpened(true)} 
                                        w="fit-content"
                                    >
                                        Configurar Geometría Ahora
                                    </Button>
                                </Stack>
                            </Group>
                        </Paper>
                    )}

                    <Divider label="Aforo y Despacho" labelPosition="center" />

                    <Group grow align="flex-start">
                        <Select
                            label="Origen del Despacho"
                            data={[
                                { value: 'interno', label: 'Tanque Propio (Inventario)' },
                                { value: 'externo', label: 'Estación de Servicio Externa' }
                            ]}
                            leftSection={form.values.origen === 'interno' ? <IconBuildingFactory size={16}/> : <IconGasStation size={16}/>}
                            {...form.getInputProps('origen')}
                            onChange={(val) => {
                                form.setFieldValue('origen', val);
                                form.setFieldValue('consumibleOrigenId', '');
                                form.setFieldValue('costoTotal', '');
                            }}
                        />

                        {form.values.origen === 'interno' ? (
                            <Select
                                label="Tanque de Almacenamiento"
                                placeholder="Seleccione el tanque origen"
                                data={tanquesInventario.map(t => ({ value: t.id.toString(), label: `${t.nombre} (Disp: ${parseFloat(t.stockAlmacen).toFixed(2)}L)` }))}
                                searchable
                                {...form.getInputProps('consumibleOrigenId')}
                            />
                        ) : (
                            <NumberInput
                                label="Costo Total de la Factura ($)"
                                placeholder="0.00"
                                decimalScale={2}
                                fixedDecimalScale
                                prefix="$"
                                {...form.getInputProps('costoTotal')}
                            />
                        )}
                    </Group>

                    <Paper p="md" bg="blue.0" radius="md" style={{ border: '1px solid #a5d8ff' }}>
                        <Group justify="space-between" align="flex-start">
                            <div>
                                <Switch 
                                    label={<Text fw={600} c="blue.9">Utilizar Aforo por Vara</Text>}
                                    description="Calcula el consumo real midiendo el tanque antes de surtir"
                                    checked={form.values.usarAforoVara}
                                    onChange={(event) => form.setFieldValue('usarAforoVara', event.currentTarget.checked)}
                                    disabled={!configTanque}
                                    color="blue"
                                    size="sm"
                                />
                                {/* Mantengo este pequeño aviso por si la capacidad se llenó de otra forma pero falta la geometría */}
                                {!configTanque && form.values.activoId && !capacidadFaltante && (
                                    <Group mt="xs" gap="xs">
                                        <Text size="xs" c="red">Debe configurar la geometría del tanque para usar la vara.</Text>
                                        <Button 
                                            size="compact-xs" 
                                            color="blue" 
                                            variant="light" 
                                            leftSection={<IconSettings size={12}/>} 
                                            onClick={() => setModalConfigOpened(true)}
                                        >
                                            Configurar Geometría
                                        </Button>
                                    </Group>
                                )}
                            </div>
                            
                            {form.values.usarAforoVara && resultadoAforo.metodo && (
                                <Alert p="xs" color={resultadoAforo.metodo === 'aforo' ? 'teal' : 'grape'} variant="light" style={{ padding: '4px 8px' }}>
                                    <Group gap="xs">
                                        {resultadoAforo.metodo === 'aforo' ? <IconListNumbers size={14} /> : <IconMathSymbols size={14} />}
                                        <Text size="xs" fw={700}>
                                            {resultadoAforo.metodo === 'aforo' ? 'Usando Puntos de Ref.' : 'Usando Geometría Pura'}
                                        </Text>
                                    </Group>
                                </Alert>
                            )}
                        </Group>

                        {form.values.usarAforoVara && (
                            <Stack mt="md">
                                <Group align="flex-end">
                                    <NumberInput 
                                        label="Centímetros mojados (Antes de surtir)" 
                                        placeholder="Ej: 25" 
                                        suffix=" cm" 
                                        min={1} 
                                        style={{ flex: 1 }}
                                        leftSection={<IconRulerMeasure size={16} />}
                                        {...form.getInputProps('centimetrosVara')} 
                                    />
                                    <Paper p="xs" px="md" withBorder bg={form.values.corregirAforo ? 'gray.1' : 'white'} shadow="xs" style={{ opacity: form.values.corregirAforo ? 0.5 : 1 }}>
                                        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Cálculo del Sistema</Text>
                                        <Text fw={900} size="xl" c={resultadoAforo.metodo === 'aforo' ? 'teal.8' : 'grape.8'}>
                                            {resultadoAforo.litros} L
                                        </Text>
                                    </Paper>
                                </Group>

                                {form.values.centimetrosVara > 0 && (
                                    <Paper withBorder p="sm" bg="orange.0" radius="md" style={{ borderColor: '#ffe066' }}>
                                        <Switch 
                                            label={<Text size="sm" fw={600}>Corregir medición del sistema (Aforo Empírico)</Text>} 
                                            description="Si sabes exactamente cuántos litros hay en esa marca de centímetros, corrígelo aquí."
                                            checked={form.values.corregirAforo}
                                            onChange={(e) => { 
                                                form.setFieldValue('corregirAforo', e.currentTarget.checked); 
                                                if(!e.currentTarget.checked) form.setFieldValue('aprenderPuntoAforo', false); 
                                            }}
                                            color="orange"
                                        />
                                        
                                        {form.values.corregirAforo && (
                                            <Group mt="sm" align="flex-start" wrap="nowrap">
                                                <NumberInput 
                                                    placeholder="Litros Reales" 
                                                    suffix=" L" 
                                                    min={1} 
                                                    max={capacidad}
                                                    w={150}
                                                    {...form.getInputProps('litrosAforadosManual')} 
                                                />
                                                <Checkbox 
                                                    label={`Guardar (${form.values.centimetrosVara}cm = ${form.values.litrosAforadosManual || 0}L) en la plantilla del modelo`}
                                                    description="El sistema usará este punto exacto en la curva la próxima vez."
                                                    checked={form.values.aprenderPuntoAforo}
                                                    onChange={(e) => form.setFieldValue('aprenderPuntoAforo', e.currentTarget.checked)}
                                                    color="teal" 
                                                    mt={4}
                                                />
                                            </Group>
                                        )}
                                    </Paper>
                                )}
                            </Stack>
                        )}
                    </Paper>

                    <Divider label="Datos de Consumo" labelPosition="center" />

                    <Group grow align="flex-start">
                        <NumberInput
                            label="Litros Despachados (Surtidor)"
                            placeholder="Ej: 150"
                            suffix=" L"
                            min={1}
                            max={espacioLibre || undefined}
                            decimalScale={2}
                            {...form.getInputProps('litros')}
                            disabled={capacidadFaltante} 
                        />
                        <NumberInput
                            label="Odómetro / Horómetro Actual"
                            placeholder="Kilometraje o Horas"
                            leftSection={<IconDashboard size={16} />}
                            min={0}
                            {...form.getInputProps('kilometrajeAlMomento')}
                        />
                    </Group>

                    {!form.values.usarAforoVara && (
                        <Paper p="md" bg="gray.0" radius="md">
                            <Switch
                                label="¿Se llenó el tanque a su máxima capacidad? (Full)"
                                description="Requerido para el cálculo exacto de rendimiento (Km/L)"
                                checked={form.values.fullTanque}
                                onChange={(event) => form.setFieldValue('fullTanque', event.currentTarget.checked)}
                                color="blue"
                                size="md"
                            />
                        </Paper>
                    )}

                    <Group justify="right" mt="md">
                        {onCancel && <Button variant="default" onClick={onCancel}>Cancelar</Button>}
                        <Button type="submit" color="blue" leftSection={<IconGasStation size={18} />} disabled={botonBloqueado}>
                            Confirmar Despacho
                        </Button>
                    </Group>
                </Stack>
            </form>

            {activoCompleto && (
                <ModalConfigurarTanque 
                    opened={modalConfigOpened} 
                    onClose={() => setModalConfigOpened(false)} 
                    activo={activoCompleto} 
                    onSuccess={() => {
                        form.setFieldValue('activoId', '');
                        setTimeout(() => form.setFieldValue('activoId', activoCompleto.id.toString()), 50);
                    }} 
                />
            )}
        </Paper>
    );
}