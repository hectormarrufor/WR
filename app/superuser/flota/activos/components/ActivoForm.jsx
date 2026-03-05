'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    TextInput, NumberInput, Button, Group,
    SimpleGrid, Stack, Select, Text, Divider,
    LoadingOverlay, ThemeIcon, Stepper, Paper, Title,
    Accordion, Box, Badge
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconCoin, IconTool, IconCalculator } from '@tabler/icons-react';
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

    const [tasaInteresGlobal, setTasaInteresGlobal] = useState(5.0);

    const form = useForm({
        initialValues: {
            codigoInterno: initialData?.codigoInterno || '',
            estado: initialData?.estado || 'Operativo',
            ubicacionActual: initialData?.ubicacionActual || 'Base Principal',
            placa: initialData?.vehiculoInstancia?.placa || initialData?.remolqueInstancia?.placa || '',
            serialCarroceria: initialData?.vehiculoInstancia?.serialChasis || initialData?.remolqueInstancia?.serialChasis || initialData?.maquinaInstancia?.serialChasis || '',
            serialMotor: initialData?.vehiculoInstancia?.serialMotor || initialData?.maquinaInstancia?.serialMotor || '',
            color: initialData?.vehiculoInstancia?.color || initialData?.remolqueInstancia?.color || 'Blanco',
            imagen: initialData?.imagen || "",

            anioFabricacion: initialData?.anio || initialData?.anioFabricacion || new Date().getFullYear(),
            kilometrajeActual: initialData?.vehiculoInstancia?.kilometrajeActual || 0,
            horometroActual: initialData?.vehiculoInstancia?.horometroActual || initialData?.maquinaInstancia?.horometroActual || 0,
            tara: initialData?.tara || '',
            capacidadCarga: initialData?.capacidadTonelajeMax || '',

            matrizCostoId: initialData?.matrizCostoId ? String(initialData.matrizCostoId) : '',
            valorReposicion: initialData?.valorReposicion || '',
            vidaUtilAnios: initialData?.vidaUtilAnios || '',
            valorSalvamento: initialData?.valorSalvamento || '',
            horasAnuales: initialData?.horasAnuales || 2000,

            instalacionesIniciales: []
        },
        validate: {
            codigoInterno: (val) => (val.length < 2 ? 'Código requerido' : null),
            matrizCostoId: (val) => (!val ? 'Debes asignar una estructura de costos' : null),
            valorReposicion: (val) => (!val || val <= 0 ? 'Ingrese el valor del equipo' : null),
            vidaUtilAnios: (val) => (!val || val <= 0 ? 'Ingrese los años de vida útil' : null),
            valorSalvamento: (val) => (val === '' || val < 0 ? 'Ingrese valor de salvamento' : null),
            horasAnuales: (val) => (!val || val <= 0 ? 'Requerido' : null),
        }
    });

    useEffect(() => {
        if (isEditing && initialData) {
            form.setValues({
                ...form.values,
                anioFabricacion: initialData.anio || initialData.anioFabricacion || new Date().getFullYear(),
                valorReposicion: initialData.valorReposicion || '',
                vidaUtilAnios: initialData.vidaUtilAnios || '',
                valorSalvamento: initialData.valorSalvamento || '',
                horasAnuales: initialData.horasAnuales || 2000,
                tara: initialData.tara || '',
                capacidadCarga: initialData.capacidadTonelajeMax || '',
                matrizCostoId: initialData.matrizCostoId ? String(initialData.matrizCostoId) : '',
            });
        } else if (!isEditing && plantilla) {
            form.setValues({
                ...form.values,
                anioFabricacion: plantilla.anio || plantilla.anioFabricacion || new Date().getFullYear(),
                tara: plantilla.pesoVacioKg || '',
                capacidadCarga: plantilla.capacidadCargaTons || '',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData, plantilla]);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/configuracion/general');
                if (res.ok) {
                    const data = await res.json();
                    setTasaInteresGlobal(parseFloat(data.tasaInteresAnual) || 5.0);
                }
            } catch (error) { console.error(error); }
        };
        fetchConfig();
    }, []);

    useEffect(() => {
        const fetchInventario = async () => {
            try {
                const res = await fetch('/api/inventario/consumibles?limit=1000');
                const result = await res.json();
                const rawItems = result.items || result.data || [];
                if (rawItems.length > 0) {
                    setConsumiblesCompatibles(rawItems.map(c => ({
                        value: c.id.toString(),
                        label: `${c.nombre} - Stock: ${parseFloat(c.stockAlmacen || 0)}`,
                        categoria: c.categoria,
                        disabled: parseFloat(c.stockAlmacen || 0) <= 0,
                        raw: c
                    })));
                }
            } catch (err) { console.error(err); }
        };
        fetchInventario();
    }, []);

    // --------------------------------------------------------
    // CÁLCULO DINÁMICO AVANZADO (SEPARACIÓN HORA VS KM)
    // --------------------------------------------------------
    const valor = parseFloat(form.values.valorReposicion) || 0;
    const salvamento = parseFloat(form.values.valorSalvamento) || 0;
    const vida = parseInt(form.values.vidaUtilAnios) || 1;
    const horasAnuales = parseInt(form.values.horasAnuales) || 2000;
    const tasaInteres = tasaInteresGlobal / 100;

    // A. COSTOS FIJOS DEL EQUIPO (Por Hora)
    const montoADepreciar = valor - salvamento;
    const vidaEnHoras = vida * horasAnuales;
    const depHora = vidaEnHoras > 0 ? (montoADepreciar / vidaEnHoras) : 0;
    const intHora = horasAnuales > 0 ? ((valor * tasaInteres) / horasAnuales) : 0;
    const costoPosesionEquipoHora = depHora + intHora;

    // B. EXTRACCIÓN DE MATRIZ
    let costoKmMatriz = 0;
    let costoHoraMatriz = 0;

    const matrizIdSeleccionada = form.values.matrizCostoId;

    let matriz = matricesData?.find(m => String(m.id) === String(matrizIdSeleccionada));
    if (!matriz && matricesCostos?.length > 0) {
        const opcion = matricesCostos.find(m => String(m.value) === String(matrizIdSeleccionada));
        if (opcion && opcion.raw) matriz = opcion.raw;
    }

    if (matriz) {
        costoKmMatriz = parseFloat(matriz.totalCostoKm || 0);
        costoHoraMatriz = parseFloat(matriz.totalCostoHora || 0);
    }

    // C. TOTALES SEPARADOS PARA EL FLETE (COSTO PURO)
    const totalCostoFijoHora = costoPosesionEquipoHora + costoHoraMatriz;
    const totalCostoVariableKm = costoKmMatriz;

    // --------------------------------------------------------
    // HANDLERS
    // --------------------------------------------------------
    const handleNextStep = () => {
        let hasError = false;
        if (active === 0 && form.validateField('codigoInterno').hasError) hasError = true;
        else if (active === 1) {
            const errs = ['matrizCostoId', 'valorReposicion', 'vidaUtilAnios', 'valorSalvamento', 'horasAnuales'].map(f => form.validateField(f).hasError);
            if (errs.includes(true)) hasError = true;
        }
        if (!hasError) setActive((c) => c + 1);
        else notifications.show({ title: 'Atención', message: 'Verifique los campos obligatorios', color: 'orange' });
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // 🔥 GUARDAMOS ESTRICTAMENTE LOS COSTOS OPERATIVOS 🔥
            let payload = {
                ...values,
                anio: values.anioFabricacion,
                capacidadTonelajeMax: values.capacidadCarga,

                costoMantenimientoTeorico: totalCostoVariableKm,
                costoPosesionTeorico: totalCostoFijoHora,
                costoPosesionHora: totalCostoFijoHora,

                usuario: nombre + ' ' + apellido,
            };

            if (values.imagen && typeof values.imagen !== 'string') {
                const ext = values.imagen.name.split('.').pop();
                const uploadRes = await fetch(`/api/upload?filename=${values.codigoInterno}.${ext}`, { method: 'POST', body: values.imagen });
                payload.imagen = `${values.codigoInterno}.${ext}`;
            }

            let url = isEditing ? `/api/gestionMantenimiento/activos/${initialData.id}` :
                (tipoActivo === 'Vehiculo' ? '/api/gestionMantenimiento/activos/vehiculos' :
                    tipoActivo === 'Remolque' ? '/api/gestionMantenimiento/activos/remolques' :
                        '/api/gestionMantenimiento/activos/maquinas');

            if (!isEditing) payload.modeloVehiculoId = plantilla.id;

            const response = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const res = await response.json();

            if (res.success) {
                notifications.show({ title: 'Éxito', message: 'Guardado correctamente', color: 'green' });
                // 2. 🔥 MAGIA FINANCIERA: Notificación de impacto en costos 🔥
                if (res.cambiosOverhead && res.cambiosOverhead.huboCambio) {
                    // Formateamos para que se vea bonito y claro
                    const { horasAnteriores, horasNuevas, overheadAnterior, overheadNuevo } = res.cambiosOverhead;

                    // Color dinámico: Si el overhead sube es "peligro/alerta" (naranja), si baja es "bueno" (teal)
                    const colorAlerta = overheadNuevo > overheadAnterior ? 'orange' : 'teal';

                    notifications.show({
                        title: '📈 Impacto Financiero Detectado',
                        message: (
                            <div>
                                <Text size="sm" mb="xs">El ajuste en este activo modificó tu configuración global:</Text>
                                <Group justify="space-between" mb={4}>
                                    <Text size="xs" c="dimmed" fw={600}>Horas Flota:</Text>
                                    <Text size="sm" fw={700}>
                                        {horasAnteriores} <Text span c="dimmed">➡️</Text> {horasNuevas} hrs
                                    </Text>
                                </Group>
                                <Group justify="space-between">
                                    <Text size="xs" c="dimmed" fw={600}>Nuevo Overhead:</Text>
                                    <Text size="sm" fw={800} c={colorAlerta}>
                                        ${overheadAnterior.toFixed(2)} <Text span c="dimmed">➡️</Text> ${overheadNuevo.toFixed(2)}/hr
                                    </Text>
                                </Group>
                            </div>
                        ),
                        color: 'violet', // Un color corporativo para la alerta
                        autoClose: 10000, // Dale más tiempo para que el usuario pueda leerlo
                    });
                }
                router.push(isEditing ? `/superuser/flota/activos/${initialData.id}` : '/superuser/flota/activos');
            } else throw new Error(res.error || 'Error en el servidor');

        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally { setLoading(false); }
    };

    return (
        <Stack gap="xl">
            <LoadingOverlay visible={loading} zIndex={1000} />

            <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={isEditing}>
                <Stepper.Step label="Físico" description="Identificación">
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" mt="md">
                        <Stack>
                            <TextInput label="Código Interno" required {...form.getInputProps('codigoInterno')} />
                            <Select label="Estado" data={['Operativo', 'En Mantenimiento', 'Inactivo']} {...form.getInputProps('estado')} />
                            <TextInput label="Ubicación" {...form.getInputProps('ubicacionActual')} />
                            <NumberInput
                                label="Tara / Peso Real Vacío (Tons)"
                                description="Si queda en blanco, usará el peso de fábrica (Plantilla)"
                                decimalScale={2}
                                {...form.getInputProps('tara')}
                            />
                            <NumberInput
                                label="Capacidad de Carga (Tons)"
                                description="Solo para vehículos y remolques. Si queda en blanco, usará la capacidad de fábrica"
                                decimalScale={2}
                                {...form.getInputProps('capacidadCarga')}
                            />
                            <Divider label="Legal" my="sm" />
                            <TextInput label="Placa" {...form.getInputProps('placa')} />
                            <TextInput label="VIN / Serial Carrocería" {...form.getInputProps('serialCarroceria')} />
                            <TextInput label="Serial Motor" {...form.getInputProps('serialMotor')} />
                        </Stack>
                        <Stack>
                            <ImageDropzone form={form} fieldPath="imagen" currentImage={isEditing ? initialData?.imagen : null} />
                            <Group grow>
                                <Select label="Color" data={["Blanco", "Amarillo", "Rojo", "Azul"]} {...form.getInputProps('color')} />
                                <NumberInput label="Año" {...form.getInputProps('anioFabricacion')} />
                            </Group>
                            <NumberInput label="Km Actual" {...form.getInputProps('kilometrajeActual')} disabled={isEditing} />
                            <NumberInput label="Horómetro" {...form.getInputProps('horometroActual')} disabled={isEditing} />
                        </Stack>
                    </SimpleGrid>
                </Stepper.Step>

                <Stepper.Step label="Financiero" description="Asignación y Costos" icon={<IconCoin size={18} />}>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md" spacing="xl">

                        <Stack>
                            <Paper withBorder p="md" radius="md">
                                <Title order={5} mb="sm" c="blue.9">1. Asociación a Matriz</Title>
                                <Select
                                    label="Matriz de Costos Base"
                                    description="Hereda las tarifas de repuestos, seguros y trámites de este perfil."
                                    placeholder="Seleccione estructura de costos..."
                                    data={matricesCostos}
                                    searchable required mb="md"
                                    {...form.getInputProps('matrizCostoId')}
                                />
                            </Paper>
                        </Stack>

                        <Stack>
                            <Paper withBorder p="md" radius="md">
                                <Title order={5} mb="md" c="teal.9">2. Inversión y Depreciación</Title>
                                <NumberInput required label="Valor de Adquisición ($)" prefix="$" thousandSeparator mb="sm" {...form.getInputProps('valorReposicion')} />
                                <Group grow align="flex-start" mb="sm">
                                    <NumberInput required label="Vida Útil (Años)" {...form.getInputProps('vidaUtilAnios')} />
                                    <NumberInput required label="Salvamento ($)" prefix="$" thousandSeparator {...form.getInputProps('valorSalvamento')} />
                                </Group>
                                <Divider my="sm" variant="dashed" />
                                <NumberInput
                                    required
                                    label="Horas Anuales Estimadas de Trabajo"
                                    description="Se utiliza para prorratear el costo de depreciación y seguros por hora."
                                    {...form.getInputProps('horasAnuales')}
                                />
                            </Paper>

                            <Accordion variant="contained" radius="md" defaultValue="calculo">
                                <Accordion.Item value="calculo" style={{ backgroundColor: '#f8f9fa' }}>
                                    <Accordion.Control icon={<IconCalculator size={20} color="gray" />}>
                                        <Group gap="lg">
                                            <Badge size="lg" color="teal" variant="light">Costo Fijo: ${totalCostoFijoHora.toFixed(2)}/hr</Badge>
                                            <Badge size="lg" color="orange" variant="light">Costo Var: ${totalCostoVariableKm.toFixed(2)}/km</Badge>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap="md">
                                            <Box>
                                                <Divider label="A. COSTOS FIJOS OPERATIVOS (Por Hora)" labelPosition="left" color="teal.3" mb="xs" />
                                                <Group justify="space-between" align="flex-start" wrap="nowrap">
                                                    <Box>
                                                        <Text size="sm" fw={600}>Depreciación del Equipo:</Text>
                                                        <Text size="xs" c="dimmed" ff="monospace">
                                                            (${valor} - ${salvamento}) ÷ ({vida} años × {horasAnuales} hrs)
                                                        </Text>
                                                    </Box>
                                                    <Text size="sm" fw={500}>${depHora.toFixed(2)} / hr</Text>
                                                </Group>

                                                <Group justify="space-between" align="flex-start" wrap="nowrap" mt="xs">
                                                    <Box>
                                                        <Text size="sm" fw={600}>Interés Invertido ({tasaInteresGlobal}%):</Text>
                                                        <Text size="xs" c="dimmed" ff="monospace">
                                                            (${valor} × {tasaInteresGlobal / 100}) ÷ {horasAnuales} hrs
                                                        </Text>
                                                    </Box>
                                                    <Text size="sm" fw={500}>${intHora.toFixed(2)} / hr</Text>
                                                </Group>

                                                <Group justify="space-between" align="flex-start" wrap="nowrap" mt="xs">
                                                    <Box>
                                                        <Text size="sm" fw={600}>Seguros, Trámites y Administrativos:</Text>
                                                        <Text size="xs" c="dimmed" ff="monospace">Tarifa por hora heredada de la Matriz Base</Text>
                                                    </Box>
                                                    <Text size="sm" fw={500}>${costoHoraMatriz.toFixed(2)} / hr</Text>
                                                </Group>

                                                <Group justify="space-between" mt="sm" p="xs" bg="teal.0" style={{ borderRadius: '4px' }}>
                                                    <Text size="sm" fw={700} c="teal.9">Total Costo Fijo Base:</Text>
                                                    <Text size="sm" fw={700} c="teal.9">${totalCostoFijoHora.toFixed(2)} / hr</Text>
                                                </Group>
                                            </Box>

                                            <Box>
                                                <Divider label="B. COSTOS VARIABLES (Por Rodamiento)" labelPosition="left" color="orange.3" mb="xs" />

                                                <Group justify="space-between" align="flex-start" wrap="nowrap">
                                                    <Box>
                                                        <Text size="sm" fw={600}>Mantenimiento (Llantas, Aceites, Repuestos):</Text>
                                                        <Text size="xs" c="dimmed" ff="monospace">Tarifa por Km heredada de la Matriz Base</Text>
                                                    </Box>
                                                    <Text size="sm" fw={500}>${costoKmMatriz.toFixed(3)} / km</Text>
                                                </Group>

                                                <Group justify="space-between" mt="sm" p="xs" bg="orange.0" style={{ borderRadius: '4px' }}>
                                                    <Text size="sm" fw={700} c="orange.9">Total Costo Variable:</Text>
                                                    <Text size="sm" fw={700} c="orange.9">${totalCostoVariableKm.toFixed(3)} / km</Text>
                                                </Group>
                                            </Box>
                                        </Stack>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            </Accordion>
                        </Stack>
                    </SimpleGrid>
                </Stepper.Step>

                <Stepper.Step label="Componentes" description="Inventario" icon={<IconTool size={18} />}>
                    {plantilla && (
                        <SimpleGrid cols={1} spacing="md">
                            {plantilla.subsistemas?.map((sub) => (
                                <ComponenteInstaller key={sub.id} form={form} subsistema={sub} inventarioGlobal={consumiblesCompatibles} instalaciones={form.values.instalacionesIniciales} onChange={(v) => form.setFieldValue('instalacionesIniciales', v)} />
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
                {active <= 2 && <Button onClick={handleNextStep}>Siguiente</Button>}
            </Group>
        </Stack>
    );
}