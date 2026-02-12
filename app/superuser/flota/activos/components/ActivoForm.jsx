'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    TextInput, NumberInput, Button, Group,
    SimpleGrid, Stack, Select, Text, Divider, Alert,
    LoadingOverlay, ThemeIcon, Stepper, Paper, Title
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconCoin, IconEdit, IconTool, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/hooks/useAuth';
import ImageDropzone from '../components/ImageDropzone';
import ComponenteInstaller from './ComponenteInstaller';

export default function ActivoForm({ matricesData = [], plantilla, tipoActivo, onCancel, initialData = null, matricesCostos = [] }) {

    const isEditing = !!initialData;
    const { nombre, apellido } = useAuth();
    const router = useRouter();

    const [active, setActive] = useState(0);
    const [loading, setLoading] = useState(false);
    const [consumiblesCompatibles, setConsumiblesCompatibles] = useState([]);
    
    // CORRECCIÓN 1: Eliminamos el useState de costoCalculado porque causaba el bucle infinito.
    // Lo calcularemos como variable directa más abajo.

    const form = useForm({
        initialValues: {
            // --- DATOS IDENTIFICACIÓN ---
            codigoInterno: initialData?.codigoInterno || '',
            estado: initialData?.estado || 'Operativo',
            ubicacionActual: initialData?.ubicacionActual || 'Base Principal',

            placa: initialData?.vehiculoInstancia?.placa || initialData?.remolqueInstancia?.placa || '',
            serialCarroceria: initialData?.vehiculoInstancia?.serialChasis || '',
            serialMotor: initialData?.vehiculoInstancia?.serialMotor || initialData?.maquinaInstancia?.serialMotor || '',
            color: initialData?.vehiculoInstancia?.color || initialData?.remolqueInstancia?.color || 'Blanco',
            imagen: initialData?.imagen || "",
            anioFabricacion: initialData?.vehiculoInstancia?.anioFabricacion || new Date().getFullYear(),
            kilometrajeActual: initialData?.vehiculoInstancia?.kilometrajeActual || 0,
            horometroActual: initialData?.vehiculoInstancia?.horometroActual || initialData?.maquinaInstancia?.horometroActual || 0,

            // --- FINANCIEROS ---
            matrizCostoId: initialData?.matrizCostoId ? String(initialData.matrizCostoId) : '',
            valorReposicion: initialData?.valorReposicion || 40000,
            vidaUtilAnios: initialData?.vidaUtilAnios || 10,
            valorSalvamento: initialData?.valorSalvamento || 5000,

            // --- INSTALACIONES ---
            instalacionesIniciales: []
        },
        validate: {
            codigoInterno: (val) => (val.length < 2 ? 'Código requerido' : null),
            matrizCostoId: (val) => (!val ? 'Debes asignar una estructura de costos' : null),
            valorReposicion: (val) => (val <= 0 ? 'El valor debe ser positivo' : null),
        }
    });

    // --------------------------------------------------------
    // 1. CARGA DE INVENTARIO
    // --------------------------------------------------------
    useEffect(() => {
        const fetchInventario = async () => {
            try {
                const res = await fetch('/api/inventario/consumibles?limit=1000');
                const result = await res.json();
                const rawItems = result.items || result.data || [];

                if (rawItems.length > 0) {
                    const itemsFormateados = rawItems.map(c => ({
                        value: c.id.toString(),
                        label: `${c.nombre} - Stock: ${parseFloat(c.stockAlmacen || 0)}`,
                        categoria: c.categoria,
                        stockActual: parseFloat(c.stockAlmacen || 0),
                        disabled: parseFloat(c.stockAlmacen || 0) <= 0,
                        raw: c
                    }));
                    setConsumiblesCompatibles(itemsFormateados);
                }
            } catch (err) {
                console.error("Error cargando inventario", err);
            }
        };
        fetchInventario();
    }, []);

    // --------------------------------------------------------
    // 2. PRE-CARGA DE COMPONENTES SI ES EDICIÓN
    // --------------------------------------------------------
    useEffect(() => {
        if (isEditing && initialData?.subsistemasInstancia) {
            const componentesExistentes = [];

            initialData.subsistemasInstancia.forEach(sub => {
                if (sub.instalaciones) {
                    sub.instalaciones.forEach(inst => {
                        componentesExistentes.push({
                            subsistemaPlantillaId: sub.subsistemaPlantillaId,
                            recomendacionId: inst.recomendacionId,
                            consumibleId: inst.consumibleId,
                            cantidad: inst.cantidad,
                            serial: inst.serialActual,
                            esExistente: true,
                            idInstalacion: inst.id
                        });
                    });
                }
            });
            form.setFieldValue('instalacionesIniciales', componentesExistentes);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditing, initialData]);

    // --------------------------------------------------------
    // CORRECCIÓN 2: CÁLCULO DIRECTO (Sin useEffect)
    // --------------------------------------------------------
    // Esto reemplaza al useEffect que tenías. Al hacerlo así, React calcula
    // el valor cada vez que renderiza el form, sin causar un bucle infinito.
    
    // A. Valores del Formulario
    const valor = parseFloat(form.values.valorReposicion) || 0;
    const salvamento = parseFloat(form.values.valorSalvamento) || 0;
    const vida = parseInt(form.values.vidaUtilAnios) || 1;
    
    // B. Constantes y Cálculo Posesión
    const horasAnuales = 2000;
    const tasaInteres = 0.05;
    const depHora = (valor - salvamento) / (vida * horasAnuales);
    const intHora = (valor * tasaInteres) / horasAnuales;
    const costoPosesionHora = depHora + intHora;

    // C. Cálculo Mantenimiento
    let costoMantenimientoHora = 0;
    const matrizIdSeleccionada = form.values.matrizCostoId;

    if (matrizIdSeleccionada && matricesData.length > 0) {
        const matriz = matricesData.find(m => String(m.id) === String(matrizIdSeleccionada));
        if (matriz) {
            const costoPorKm = parseFloat(matriz.costoKm || matriz.costoPromedio || 0);
            const velocidadPromedio = 40; 
            costoMantenimientoHora = costoPorKm * velocidadPromedio;
        }
    }

    // D. Objeto Final (Esto reemplaza al estado costoCalculado)
    const costoCalculado = {
        posesion: costoPosesionHora,
        mantenimiento: costoMantenimientoHora,
        total: costoPosesionHora + costoMantenimientoHora
    };
    // --------------------------------------------------------


    // --------------------------------------------------------
    // 3. VALIDACIÓN POR PASOS
    // --------------------------------------------------------
    const handleNextStep = () => {
        let hasError = false;

        if (active === 0) {
            const checkCodigo = form.validateField('codigoInterno');
            if (checkCodigo.hasError) hasError = true;
        } else if (active === 1) {
            const checkMatriz = form.validateField('matrizCostoId');
            const checkValor = form.validateField('valorReposicion');
            if (checkMatriz.hasError || checkValor.hasError) hasError = true;
        }

        if (!hasError) {
            setActive((current) => current + 1);
        } else {
            notifications.show({ title: 'Atención', message: 'Complete los campos obligatorios antes de continuar.', color: 'orange' });
        }
    };


    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            let payload = {
                codigoInterno: values.codigoInterno,
                estado: values.estado,
                ubicacionActual: values.ubicacionActual,
                placa: values.placa,
                color: values.color,
                serialChasis: values.serialCarroceria,
                serialMotor: values.serialMotor,
                anioFabricacion: values.anioFabricacion,
                kilometrajeActual: values.kilometrajeActual,
                horometroActual: values.horometroActual,
                matrizCostoId: parseInt(values.matrizCostoId),
                valorReposicion: parseFloat(values.valorReposicion),
                vidaUtilAnios: parseInt(values.vidaUtilAnios),
                valorSalvamento: parseFloat(values.valorSalvamento),
                usuario: nombre + ' ' + apellido,
                instalacionesIniciales: values.instalacionesIniciales
            };

            if (values.imagen && typeof values.imagen !== 'string') {
                const file = values.imagen;
                const ext = file.name.split('.').pop();
                const filename = `${values.codigoInterno}-${Date.now()}.${ext}`;
                const uploadRes = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, { method: 'POST', body: file });
                const blobData = await uploadRes.json();
                payload.imagen = blobData.url;
            } else if (typeof values.imagen === 'string') {
                payload.imagen = values.imagen;
            }

            let url = isEditing ? `/api/gestionMantenimiento/activos/${initialData.id}` :
                (tipoActivo === 'Vehiculo' ? '/api/gestionMantenimiento/activos/vehiculos' :
                    tipoActivo === 'Remolque' ? '/api/gestionMantenimiento/activos/remolques' :
                        '/api/gestionMantenimiento/activos/maquinas');

            let method = isEditing ? 'PUT' : 'POST';

            if (!isEditing) {
                payload.modeloVehiculoId = plantilla.id;
            }

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const res = await response.json();

            if (res.success) {
                notifications.show({ title: 'Éxito', message: 'Operación realizada correctamente', color: 'green' });
                if (isEditing) router.push(`/superuser/flota/activos/${initialData.id}`);
                else router.push('/superuser/flota/activos');
            } else {
                throw new Error(res.error || 'Error en el servidor');
            }

        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    // Helpers
    const isVehiculo = tipoActivo === 'Vehiculo' || initialData?.tipoActivo === 'Vehiculo';
    const isMaquina = tipoActivo === 'Maquina' || initialData?.tipoActivo === 'Maquina';

    return (
        <Stack gap="xl">
            <LoadingOverlay visible={loading} zIndex={1000} />

            <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={isEditing}>

                {/* PASO 0: FÍSICO */}
                <Stepper.Step label="Físico" description="Identificación">
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" mt="md">
                        <Stack>
                            <TextInput label="Código Interno" required {...form.getInputProps('codigoInterno')} />
                            <Select label="Estado" data={['Operativo', 'En Mantenimiento', 'Inactivo']} {...form.getInputProps('estado')} />
                            <TextInput label="Ubicación" {...form.getInputProps('ubicacionActual')} />
                            <Divider label="Legal" my="sm" />
                            <TextInput label="Placa" {...form.getInputProps('placa')} />
                            <TextInput label="VIN / Serial Carrocería" {...form.getInputProps('serialCarroceria')} />
                            {(isVehiculo || isMaquina) && <TextInput label="Serial Motor" {...form.getInputProps('serialMotor')} />}
                        </Stack>
                        <Stack>
                            <ImageDropzone form={form} fieldPath="imagen" currentImage={isEditing ? initialData?.imagen : null} />
                            <Group grow>
                                <Select label="Color" data={["Blanco", "Amarillo", "Rojo", "Azul"]} {...form.getInputProps('color')} />
                                <NumberInput label="Año" {...form.getInputProps('anioFabricacion')} />
                            </Group>
                            {isVehiculo && <NumberInput label="Km Actual" {...form.getInputProps('kilometrajeActual')} disabled={isEditing} />}
                            {(isVehiculo || isMaquina) && <NumberInput label="Horómetro" {...form.getInputProps('horometroActual')} disabled={isEditing} />}
                        </Stack>
                    </SimpleGrid>
                </Stepper.Step>

                {/* PASO 1: FINANCIERO */}
                <Stepper.Step label="Financiero" description="Costos y Depreciación" icon={<IconCoin size={18} />}>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md" spacing="xl">
                        <Stack>
                            <Alert title="Perfil de Costos" color="blue" icon={<IconCoin />}>
                                La matriz define el costo variable de mantenimiento ($/Km).
                            </Alert>
                            <Select
                                label="Estructura de Costos (Matriz)"
                                placeholder="Seleccione un perfil..."
                                data={matricesCostos}
                                searchable
                                nothingFoundMessage="No hay matrices creadas"
                                required
                                {...form.getInputProps('matrizCostoId')}
                            />

                            {/* Visualización del costo de la matriz seleccionada */}
                            {costoCalculado.mantenimiento > 0 && (
                                <Paper withBorder p="xs" bg="blue.0">
                                    <Group justify="space-between">
                                        <Text size="sm" c="blue.9">Costo Mantenimiento Est.:</Text>
                                        <Text fw={700} c="blue.9">${costoCalculado.mantenimiento.toFixed(2)} / hr</Text>
                                    </Group>
                                    <Text size="xs" c="dimmed" ta="right">(Basado en matriz x 40km/h prom)</Text>
                                </Paper>
                            )}
                        </Stack>

                        <Stack>
                            <Paper withBorder p="md" radius="md">
                                <Title order={5} mb="md">Parámetros de Posesión</Title>
                                <NumberInput
                                    label="Valor de Reposición ($)"
                                    prefix="$"
                                    thousandSeparator
                                    mb="sm"
                                    {...form.getInputProps('valorReposicion')}
                                />
                                <Group grow>
                                    <NumberInput label="Vida Útil (Años)" {...form.getInputProps('vidaUtilAnios')} />
                                    <NumberInput label="Valor Salvamento ($)" prefix="$" thousandSeparator {...form.getInputProps('valorSalvamento')} />
                                </Group>
                            </Paper>

                            {/* TARJETA DE RESULTADO FINAL */}
                            <Paper p="md" bg="teal.0" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-teal-4)' }}>
                                <Stack gap={4}>
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Costo Posesión:</Text>
                                        <Text size="sm" fw={500}>${costoCalculado.posesion.toFixed(2)}/hr</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Costo Mantenimiento:</Text>
                                        <Text size="sm" fw={500}>${costoCalculado.mantenimiento.toFixed(2)}/hr</Text>
                                    </Group>
                                    <Divider my="xs" color="teal.2" />
                                    <Group justify="space-between">
                                        <Text fw={800} size="lg" c="teal.9">COSTO TOTAL:</Text>
                                        <Text fw={800} size="xl" c="teal.9">
                                            ${costoCalculado.total.toFixed(2)} / hr
                                        </Text>
                                    </Group>
                                </Stack>
                            </Paper>
                        </Stack>
                    </SimpleGrid>
                </Stepper.Step>
                {/* PASO 2: COMPONENTES */}
                <Stepper.Step label="Componentes" description="Inventario" icon={<IconTool size={18} />}>
                    {isEditing && (
                        <Alert color="orange" icon={<IconAlertCircle size={16} />} mb="md" title="Modo Edición">
                            Modificar estos componentes aquí actualizará la configuración base. Si desea registrar un cambio de repuesto (mantenimiento), hágalo desde la pestaña "Taller" del activo.
                        </Alert>
                    )}

                    {plantilla && (
                        <SimpleGrid cols={1} spacing="md">
                            {plantilla.subsistemas?.map((sub) => (
                                <ComponenteInstaller
                                    key={sub.id}
                                    form={form}
                                    subsistema={sub}
                                    inventarioGlobal={consumiblesCompatibles}
                                    instalaciones={form.values.instalacionesIniciales}
                                    onChange={(newGlobalState) => form.setFieldValue('instalacionesIniciales', newGlobalState)}
                                />
                            ))}
                        </SimpleGrid>
                    )}
                </Stepper.Step>

                <Stepper.Completed>
                    <Stack align="center" mt="xl">
                        <ThemeIcon size={80} radius="xl" color="green" variant="light"><IconCheck size={50} /></ThemeIcon>
                        <Title order={3}>Todo listo</Title>
                        <Button size="lg" onClick={() => handleSubmit(form.values)} loading={loading}>
                            {isEditing ? 'Guardar Cambios' : 'Crear Activo'}
                        </Button>
                    </Stack>
                </Stepper.Completed>
            </Stepper>

            <Group justify="space-between" mt="xl">
                <Button variant="default" onClick={active === 0 ? onCancel : () => setActive(c => c - 1)}>
                    {active === 0 ? 'Cancelar' : 'Atrás'}
                </Button>

                {/* Lógica del botón Siguiente arreglada */}
                {active < 2 && (
                    <Button onClick={handleNextStep}>
                        Siguiente
                    </Button>
                )}
            </Group>
        </Stack>
    );
}