'use client';

import { useState, useEffect } from 'react';
import {
    NumberInput, Select, Button, Group, Stack, LoadingOverlay,
    Paper, Title, Switch, Text, Divider, Alert
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconDashboard, IconAlertCircle, IconCheck, IconBuildingFactory, IconGasStation, IconTool, IconInfoCircle } from '@tabler/icons-react';

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
    const [nuevaCapacidad, setNuevaCapacidad] = useState('');
    const [guardandoCapacidad, setGuardandoCapacidad] = useState(false);

    // 1. Filtrar Bateas
    const activosFiltrados = activos.filter(a => {
        if (a.remolqueInstancia?.plantilla?.tipoRemolque === 'Batea') return false; 
        return true;
    });

    // 2. Función para obtener datos físicos del equipo
    const getDatosTanqueActivo = (idActivo) => {
        const activo = activosFiltrados.find(a => a.id.toString() === idActivo?.toString());
        if (!activo) return { capacidad: 0, nivel: 0, espacioLibre: 0 };
        
        const capacidad = parseFloat(activo.capacidadTanque) || 0;
        const nivel = parseFloat(activo.nivelCombustible) || 0;
        const espacioLibre = capacidad > 0 ? (capacidad - nivel) : 0;

        return { capacidad, nivel, espacioLibre };
    };

    const form = useForm({
        initialValues: {
            activoId: activoPredeterminadoId || '',
            origen: 'interno',
            consumibleOrigenId: '',
            litros: '',
            costoTotal: '',
            kilometrajeAlMomento: '',
            fullTanque: true
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
                        return 'Excede el inventario disponible.';
                    }
                }

                if (values.activoId) {
                    const { capacidad, espacioLibre } = getDatosTanqueActivo(values.activoId);
                    if (capacidad <= 0) return 'El equipo no tiene capacidad registrada.';
                    if (valNum > espacioLibre) return 'Supera el espacio libre del equipo.';
                }

                return null;
            }
        }
    });

    useEffect(() => {
        if (form.values.activoId) {
            const { capacidad } = getDatosTanqueActivo(form.values.activoId);
            setCapacidadFaltante(capacidad <= 0);
        } else {
            setCapacidadFaltante(false);
        }
    }, [form.values.activoId, activosFiltrados]);

    const handleFijarCapacidad = async () => {
        if (!nuevaCapacidad || nuevaCapacidad <= 0) return;
        setGuardandoCapacidad(true);

        try {
            const activo = activosFiltrados.find(a => a.id.toString() === form.values.activoId);

            const response = await fetch('/api/gestionMantenimiento/combustible/fijar-capacidad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activoId: activo.id, capacidad: nuevaCapacidad })
            });

            if (!response.ok) throw new Error('No se pudo actualizar la capacidad del equipo');

            activo.capacidadTanque = nuevaCapacidad;
            activo.nivelCombustible = 0;

            setCapacidadFaltante(false);
            setNuevaCapacidad('');
            form.validateField('litros'); 
            
            notifications.show({ title: 'Capacidad Fijada', message: `Capacidad de ${nuevaCapacidad}L guardada.`, color: 'green' });

        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setGuardandoCapacidad(false);
        }
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        setErrorMsg(null);

        try {
            const response = await fetch('/api/gestionMantenimiento/combustible/cargar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
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

    // ✨ VARIABLES CLARAS PARA LAS ALERTAS VISUALES ✨
    const datosTanqueActual = form.values.activoId ? getDatosTanqueActivo(form.values.activoId) : null;
    const litrosInput = parseFloat(form.values.litros) || 0;
    
    // Evaluamos si el tanque de la base tiene suficiente gasoil
    const tanqueSeleccionado = form.values.origen === 'interno' && form.values.consumibleOrigenId
        ? tanquesInventario.find(t => t.id.toString() === form.values.consumibleOrigenId)
        : null;

    // Banderas de error para mostrar alertas y bloquear el botón
    const excedeCapacidadEquipo = datosTanqueActual && litrosInput > datosTanqueActual.espacioLibre;
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

                    {/* ALERTA INFORMATIVA AZUL (Solo si tiene capacidad) */}
                    {datosTanqueActual && !capacidadFaltante && (
                        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />} py="xs">
                            <Group justify="space-between">
                                <Text size="sm">Capacidad: <b>{datosTanqueActual.capacidad}L</b></Text>
                                <Text size="sm">Nivel Actual: <b>{datosTanqueActual.nivel}L</b></Text>
                                <Text size="sm" c="blue.8">Libre: <b>{datosTanqueActual.espacioLibre}L</b></Text>
                            </Group>
                        </Alert>
                    )}

                    {/* 🔥 ALERTA ROJA 1: SUPERA CAPACIDAD DEL EQUIPO 🔥 */}
                    {excedeCapacidadEquipo && (
                        <Alert variant="filled" color="red" icon={<IconAlertCircle size={16} />}>
                            No puedes meter {litrosInput} litros. El equipo solo tiene espacio para {datosTanqueActual.espacioLibre.toFixed(2)} L.
                        </Alert>
                    )}

                    {/* 🔥 ALERTA ROJA 2: SUPERA INVENTARIO DE LA BASE 🔥 */}
                    {excedeInventarioBase && (
                        <Alert variant="filled" color="red" icon={<IconAlertCircle size={16} />}>
                            No hay suficiente gasoil en la base. Solo quedan {parseFloat(tanqueSeleccionado.stockAlmacen).toFixed(2)} L disponibles.
                        </Alert>
                    )}

                    {/* FORMULARIO NARANJA PARA FIJAR CAPACIDAD RÁPIDA */}
                    {capacidadFaltante && (
                        <Paper withBorder p="md" bg="orange.0" style={{ borderColor: '#ffe066' }}>
                            <Group align="flex-end">
                                <NumberInput
                                    label="El equipo físico no tiene capacidad de tanque registrada"
                                    description="Fije la capacidad en Litros para poder continuar"
                                    placeholder="Ej: 400"
                                    value={nuevaCapacidad}
                                    onChange={setNuevaCapacidad}
                                    min={1}
                                    style={{ flex: 1 }}
                                    leftSection={<IconTool size={16} />}
                                />
                                <Button 
                                    color="orange.7" 
                                    onClick={handleFijarCapacidad} 
                                    loading={guardandoCapacidad}
                                >
                                    Guardar Capacidad
                                </Button>
                            </Group>
                        </Paper>
                    )}

                    <Divider label="Detalles del Origen" labelPosition="center" />

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

                    <Divider label="Datos de Consumo" labelPosition="center" />

                    <Group grow align="flex-start">
                        <NumberInput
                            label="Litros Despachados"
                            placeholder="Ej: 150"
                            suffix=" L"
                            min={1}
                            max={datosTanqueActual?.espacioLibre || undefined}
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

                    <Group justify="right" mt="md">
                        {onCancel && <Button variant="default" onClick={onCancel}>Cancelar</Button>}
                        <Button 
                            type="submit" 
                            color="blue" 
                            leftSection={<IconGasStation size={18} />} 
                            disabled={botonBloqueado}
                        >
                            Confirmar Despacho
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Paper>
    );
}