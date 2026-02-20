'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    TextInput, NumberInput, Button, Group,
    SimpleGrid, Stack, Select, Text, Divider, Alert,
    LoadingOverlay, ThemeIcon, Stepper, Paper, Title,
    Tooltip, Accordion
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconCoin, IconTool, IconInfoCircle, IconCalculator } from '@tabler/icons-react';
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
            serialCarroceria: initialData?.vehiculoInstancia?.serialChasis || '',
            serialMotor: initialData?.vehiculoInstancia?.serialMotor || initialData?.maquinaInstancia?.serialMotor || '',
            color: initialData?.vehiculoInstancia?.color || initialData?.remolqueInstancia?.color || 'Blanco',
            imagen: initialData?.imagen || "",
            anioFabricacion: initialData?.vehiculoInstancia?.anioFabricacion || new Date().getFullYear(),
            kilometrajeActual: initialData?.vehiculoInstancia?.kilometrajeActual || 0,
            horometroActual: initialData?.vehiculoInstancia?.horometroActual || initialData?.maquinaInstancia?.horometroActual || 0,

            matrizCostoId: initialData?.matrizCostoId ? String(initialData.matrizCostoId) : '',
            valorReposicion: initialData?.valorReposicion || '',
            vidaUtilAnios: initialData?.vidaUtilAnios || '',
            valorSalvamento: initialData?.valorSalvamento || '',
            
            horasAnuales: initialData?.horasAnuales || 2000,
            velocidadPromedio: initialData?.velocidadPromedioTeorica || initialData?.velocidadPromedio || 40,

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
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/configuracion/global');
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
    // CÁLCULO DINÁMICO AVANZADO
    // --------------------------------------------------------
    const valor = parseFloat(form.values.valorReposicion) || 0;
    const salvamento = parseFloat(form.values.valorSalvamento) || 0;
    const vida = parseInt(form.values.vidaUtilAnios) || 1;
    const horasAnuales = parseInt(form.values.horasAnuales) || 2000;
    const velocidad = parseInt(form.values.velocidadPromedio) || 0;
    const tasaInteres = tasaInteresGlobal / 100;

    // A. DEPRECIACIÓN E INTERÉS (Cálculo Financiero Local)
    const montoADepreciar = valor - salvamento;
    const vidaEnHoras = vida * horasAnuales;
    const depHora = vidaEnHoras > 0 ? (montoADepreciar / vidaEnHoras) : 0;
    const intHora = horasAnuales > 0 ? ((valor * tasaInteres) / horasAnuales) : 0;
    let costoPosesionHoraFinal = depHora + intHora;

    // B. EXTRACCIÓN SEGURA DE LA MATRIZ DE COSTOS (Con los nombres de tu console.log)
    let costoKmMatriz = 0;
    let costoHoraMatriz = 0;
    let costoPosesionMatriz = 0;
    let costoMantenimientoHora = 0;

    const matrizIdSeleccionada = form.values.matrizCostoId;

    let matriz = matricesData?.find(m => String(m.id) === String(matrizIdSeleccionada));
    if (!matriz && matricesCostos?.length > 0) {
        const opcion = matricesCostos.find(m => String(m.value) === String(matrizIdSeleccionada));
        if (opcion && opcion.raw) matriz = opcion.raw;
    }

    if (matriz) {
        // LEEMOS EXACTAMENTE LAS VARIABLES QUE MOSTRÓ TU CONSOLA
        costoKmMatriz = parseFloat(matriz.totalCostoKm || 0);
        costoHoraMatriz = parseFloat(matriz.totalCostoHora || 0);
        costoPosesionMatriz = parseFloat(matriz.costoPosesionHora || 0);

        // Sumamos la posesión base (4.50 del Canter, por ejemplo) a nuestra depreciación
        costoPosesionHoraFinal += costoPosesionMatriz; 

        if (velocidad === 0) {
            costoMantenimientoHora = costoHoraMatriz > 0 ? costoHoraMatriz : (costoKmMatriz * 40);
        } else {
            costoMantenimientoHora = (costoKmMatriz * velocidad) + costoHoraMatriz;
        }
    }

    const costoTotalEstimado = costoPosesionHoraFinal + costoMantenimientoHora;

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
            let payload = {
                ...values,
                velocidadPromedioTeorica: values.velocidadPromedio,
                costoMantenimientoTeorico: costoKmMatriz, 
                costoPosesionTeorico: costoPosesionMatriz, 
                costoPosesionHora: costoPosesionHoraFinal, 
                usuario: nombre + ' ' + apellido,
            };

            if (values.imagen && typeof values.imagen !== 'string') {
                const ext = values.imagen.name.split('.').pop();
                const uploadRes = await fetch(`/api/upload?filename=${values.codigoInterno}-${Date.now()}.${ext}`, { method: 'POST', body: values.imagen });
                payload.imagen = (await uploadRes.json()).url;
            }

            let url = isEditing ? `/api/gestionMantenimiento/activos/${initialData.id}` :
                (tipoActivo === 'Vehiculo' ? '/api/gestionMantenimiento/activos/vehiculos' :
                    tipoActivo === 'Remolque' ? '/api/gestionMantenimiento/activos/remolques' :
                        '/api/gestionMantenimiento/activos/maquinas');

            if (!isEditing) payload.modeloVehiculoId = plantilla.id;

            const response = await fetch(url, { method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const res = await response.json();
            
            if (res.success) {
                notifications.show({ title: 'Éxito', message: 'Guardado correctamente', color: 'green' });
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
                                    label={
                                        <Group gap={4}>
                                            Matriz de Costos Base
                                            <Tooltip label="Alimenta este camión con las tarifas de desgaste base (Cauchos, aceite, seguros) predefinidas en tus tablas. FleteCreator usará estos precios mínimos/máximos para negociar." multiline w={300} position="top">
                                                <IconInfoCircle size={14} color="gray" style={{ cursor: 'help' }} />
                                            </Tooltip>
                                        </Group>
                                    }
                                    placeholder="Seleccione estructura de costos..."
                                    data={matricesCostos}
                                    searchable required mb="md"
                                    {...form.getInputProps('matrizCostoId')}
                                />
                            </Paper>

                            <Paper withBorder p="md" radius="md" mt="sm">
                                <Group justify="space-between" mb="xs">
                                    <Title order={5} c="orange.9">2. Perfil Operativo (Contrato)</Title>
                                </Group>
                                <Group grow>
                                    <NumberInput 
                                        required 
                                        label={
                                            <Group gap={4}>Horas Anuales
                                                <Tooltip label="Sirve para prorratear la depreciación. Si trabajas 2000 horas al año, el costo del equipo se divide entre 2000. Si trabajas menos horas, la tarifa por hora sube." multiline w={250}>
                                                    <IconInfoCircle size={14} color="gray" style={{ cursor: 'help' }} />
                                                </Tooltip>
                                            </Group>
                                        }
                                        {...form.getInputProps('horasAnuales')} 
                                    />
                                    <NumberInput 
                                        required 
                                        label={
                                            <Group gap={4}>Velocidad (km/h)
                                                <Tooltip label="Crucial para la estimación. Si es equipo estacionario o de achique, pon 0. Convierte el costo de desgaste por kilómetro a un costo por hora." multiline w={250}>
                                                    <IconInfoCircle size={14} color="gray" style={{ cursor: 'help' }} />
                                                </Tooltip>
                                            </Group>
                                        }
                                        {...form.getInputProps('velocidadPromedio')} 
                                    />
                                </Group>
                            </Paper>
                        </Stack>

                        <Stack>
                            <Paper withBorder p="md" radius="md">
                                <Title order={5} mb="md" c="teal.9">3. Inversión y Depreciación</Title>
                                <NumberInput 
                                    required 
                                    label={
                                        <Group gap={4}>Valor de Adquisición ($)
                                            <Tooltip label="¿Cuánto cuesta comprar este equipo hoy? De aquí sale el cálculo para recuperar el dinero que invertiste a medida que el camión trabaja." multiline w={250}>
                                                <IconInfoCircle size={14} color="gray" style={{ cursor: 'help' }} />
                                            </Tooltip>
                                        </Group>
                                    }
                                    prefix="$" thousandSeparator mb="sm" 
                                    {...form.getInputProps('valorReposicion')} 
                                />
                                <Group grow align="flex-start">
                                    <NumberInput 
                                        required 
                                        label="Vida Útil (Años)" 
                                        {...form.getInputProps('vidaUtilAnios')} 
                                    />
                                    <NumberInput 
                                        required 
                                        label={
                                            <Group gap={4}>Salvamento ($)
                                                <Tooltip label="Valor de reventa. Si el camión costó $40k y lo vendes en $10k al final (salvamento), en realidad solo se deprecian $30k." multiline w={250}>
                                                    <IconInfoCircle size={14} color="gray" style={{ cursor: 'help' }} />
                                                </Tooltip>
                                            </Group>
                                        }
                                        prefix="$" thousandSeparator {...form.getInputProps('valorSalvamento')} 
                                    />
                                </Group>
                            </Paper>

                            <Accordion variant="contained" radius="md" defaultValue="calculo">
                                <Accordion.Item value="calculo" style={{ backgroundColor: '#f8f9fa' }}>
                                    <Accordion.Control icon={<IconCalculator size={20} color="gray"/>}>
                                        <Text fw={700} c="dark.9" size="lg">Costo Total Estimado: ${costoTotalEstimado.toFixed(2)} / hr</Text>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap="xs">
                                            {/* MANTENIMIENTO */}
                                            <Divider label="1. MANTENIMIENTO (Matriz)" labelPosition="left" color="blue.3" />
                                            <Group justify="space-between">
                                                <Group gap={4}>
                                                    <Text size="sm" c="dimmed">Tarifa de Rodamiento:</Text>
                                                    <Tooltip label="En FleteCreator, esto se multiplicará exactamente por los kilómetros de ruta trazados en el mapa (Cauchos, Aceite de Motor, Frenos)." multiline w={250} position="right">
                                                        <IconInfoCircle size={14} color="gray" style={{ cursor: 'help' }} />
                                                    </Tooltip>
                                                </Group>
                                                <Text size="sm" fw={500}>${costoKmMatriz.toFixed(3)} / km</Text>
                                            </Group>
                                            <Group justify="space-between">
                                                <Group gap={4}>
                                                    <Text size="sm" c="dimmed">Tarifa Fija (PTO/Hora):</Text>
                                                    <Tooltip label="En FleteCreator, esto se multiplicará por las horas estimadas de viaje (o de trabajo si es equipo estacionario). Cubre desgaste por tiempo." multiline w={250} position="right">
                                                        <IconInfoCircle size={14} color="gray" style={{ cursor: 'help' }} />
                                                    </Tooltip>
                                                </Group>
                                                <Text size="sm" fw={500}>${costoHoraMatriz.toFixed(3)} / hr</Text>
                                            </Group>

                                            {form.values.velocidadPromedio === 0 ? (
                                                <Alert color="orange" p="xs" mt="xs">Equipo estacionario. Se usa tarifa por hora/ralentí.</Alert>
                                            ) : (
                                                <Text size="xs" c="dimmed" ta="right">
                                                    Proyección horaria: (${costoKmMatriz.toFixed(3)} x {velocidad} km/h) + ${costoHoraMatriz.toFixed(3)}
                                                </Text>
                                            )}

                                            <Group justify="space-between" mt="xs">
                                                <Text size="sm" fw={700} c="blue.9">Total Mantenimiento:</Text>
                                                <Text size="sm" fw={700} c="blue.9">${costoMantenimientoHora.toFixed(2)} / hr</Text>
                                            </Group>

                                            {/* POSESIÓN */}
                                            <Divider label="2. POSESIÓN Y DEPRECIACIÓN" labelPosition="left" color="teal.3" mt="md" />
                                            <Group justify="space-between">
                                                <Group gap={4}>
                                                    <Text size="sm" c="dimmed">Depreciación de este equipo:</Text>
                                                    <Tooltip label="¡Atención! Este valor viaja directo a FleteCreator. Si cotizas un viaje de 10 horas, el cliente pagará 10 horas de esta tarifa para que tú recuperes tu inversión del equipo." multiline w={280} color="teal.9" position="right">
                                                        <IconInfoCircle size={14} color="gray" style={{ cursor: 'help' }} />
                                                    </Tooltip>
                                                </Group>
                                                <Text size="sm" fw={500}>${(depHora + intHora).toFixed(2)} / hr</Text>
                                            </Group>
                                            <Group justify="space-between">
                                                <Group gap={4}>
                                                    <Text size="sm" c="dimmed">Costo de la Matriz Base:</Text>
                                                    <Tooltip label="Gastos administrativos, trámites anuales y seguros genéricos heredados de la Matriz de Costos que seleccionaste arriba." multiline w={250} position="right">
                                                        <IconInfoCircle size={14} color="gray" style={{ cursor: 'help' }} />
                                                    </Tooltip>
                                                </Group>
                                                <Text size="sm" fw={500}>${costoPosesionMatriz.toFixed(2)} / hr</Text>
                                            </Group>

                                            <Group justify="space-between" mt="xs">
                                                <Text size="sm" fw={700} c="teal.9">Total Posesión (Fijo):</Text>
                                                <Text size="sm" fw={700} c="teal.9">${costoPosesionHoraFinal.toFixed(2)} / hr</Text>
                                            </Group>
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
                {active < 2 && <Button onClick={handleNextStep}>Siguiente</Button>}
            </Group>
        </Stack>
    );
}