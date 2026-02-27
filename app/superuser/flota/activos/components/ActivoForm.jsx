'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    TextInput, NumberInput, Button, Group,
    SimpleGrid, Stack, Select, Text, Divider, Alert,
    LoadingOverlay, ThemeIcon, Stepper, Paper, Title,
    Tooltip, Accordion,
    Box
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
            serialCarroceria: initialData?.vehiculoInstancia?.serialChasis ||  initialData?.remolqueInstancia?.serialChasis || initialData?.maquinaInstancia?.serialChasis || '',
            serialMotor: initialData?.vehiculoInstancia?.serialMotor || initialData?.maquinaInstancia?.serialMotor || '',
            color: initialData?.vehiculoInstancia?.color || initialData?.remolqueInstancia?.color || 'Blanco',
            imagen: initialData?.imagen || "",
            anioFabricacion: initialData?.anio || new Date().getFullYear(),
            kilometrajeActual: initialData?.vehiculoInstancia?.kilometrajeActual || 0,
            horometroActual: initialData?.vehiculoInstancia?.horometroActual || initialData?.maquinaInstancia?.horometroActual || 0,
            tara: initialData?.tara || '',
            capacidadCarga: initialData?.capacidadTonelajeMax || '',

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
    // CÁLCULO DINÁMICO AVANZADO (CORREGIDO: CERO DOBLE COBRO)
    // --------------------------------------------------------
    const valor = parseFloat(form.values.valorReposicion) || 0;
    const salvamento = parseFloat(form.values.valorSalvamento) || 0;
    const vida = parseInt(form.values.vidaUtilAnios) || 1;
    const horasAnuales = parseInt(form.values.horasAnuales) || 2000;
    const velocidad = parseInt(form.values.velocidadPromedio) || 0;
    const tasaInteres = tasaInteresGlobal / 100;

    // A. POSESIÓN (Cálculo Financiero ÚNICO y exclusivo de este activo)
    const montoADepreciar = valor - salvamento;
    const vidaEnHoras = vida * horasAnuales;
    const depHora = vidaEnHoras > 0 ? (montoADepreciar / vidaEnHoras) : 0;
    const intHora = horasAnuales > 0 ? ((valor * tasaInteres) / horasAnuales) : 0;
    
    // LA POSESIÓN ES SOLO ESTO. Adiós al valor fantasma de la matriz.
    const costoPosesionHoraFinal = depHora + intHora;

    // B. EXTRACCIÓN SEGURA DE LA MATRIZ DE COSTOS (Solo extraemos desgaste operativo)
    let costoKmMatriz = 0;
    let costoHoraMatriz = 0;
    let costoMantenimientoHora = 0;

    const matrizIdSeleccionada = form.values.matrizCostoId;

    let matriz = matricesData?.find(m => String(m.id) === String(matrizIdSeleccionada));
    if (!matriz && matricesCostos?.length > 0) {
        const opcion = matricesCostos.find(m => String(m.value) === String(matrizIdSeleccionada));
        if (opcion && opcion.raw) matriz = opcion.raw;
    }

    if (matriz) {
        costoKmMatriz = parseFloat(matriz.totalCostoKm || 0);
        // En totalCostoHora ya vienen incluidos los repuestos por hora, los seguros y los trámites
        costoHoraMatriz = parseFloat(matriz.totalCostoHora || 0);

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
                // Mapeamos las variables del form a los nombres exactos de tu modelo de BD
                velocidadPromedioTeorica: values.velocidadPromedio,
                costoMantenimientoTeorico: costoKmMatriz, 
                costoPosesionTeorico: costoPosesionHoraFinal, // <--- ¡AQUÍ ESTABA EL ERROR!
                costoPosesionHora: costoPosesionHoraFinal, 
                usuario: nombre + ' ' + apellido,
            };

            if (values.imagen && typeof values.imagen !== 'string') {
                const ext = values.imagen.name.split('.').pop();
                const uploadRes = await fetch(`/api/upload?filename=${values.codigoInterno}.${ext}`, { method: 'POST', body: values.imagen });
                payload.imagen = (await uploadRes.json()).url;
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
                                description="Solo para vehículos y remolques. Si queda en blanco, usará la capacidad de fábrica (Plantilla)"
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

                            <Paper withBorder p="md" radius="md" mt="sm">
                                <Group justify="space-between" mb="xs">
                                    <Title order={5} c="orange.9">2. Perfil Operativo (Contrato)</Title>
                                </Group>
                                <Group grow>
                                    <NumberInput required label="Horas Anuales Estimadas" {...form.getInputProps('horasAnuales')} />
                                    <NumberInput required label="Velocidad Promedio (km/h)" {...form.getInputProps('velocidadPromedio')} />
                                </Group>
                            </Paper>
                        </Stack>

                        <Stack>
                            <Paper withBorder p="md" radius="md">
                                <Title order={5} mb="md" c="teal.9">3. Inversión y Depreciación</Title>
                                <NumberInput required label="Valor de Adquisición ($)" prefix="$" thousandSeparator mb="sm" {...form.getInputProps('valorReposicion')} />
                                <Group grow align="flex-start">
                                    <NumberInput required label="Vida Útil (Años)" {...form.getInputProps('vidaUtilAnios')} />
                                    <NumberInput required label="Salvamento ($)" prefix="$" thousandSeparator {...form.getInputProps('valorSalvamento')} />
                                </Group>
                            </Paper>

                            {/* LA PIZARRA DE FÓRMULAS (TRANSPARENCIA TOTAL) */}
                            <Accordion variant="contained" radius="md" defaultValue="calculo">
                                <Accordion.Item value="calculo" style={{ backgroundColor: '#f8f9fa' }}>
                                    <Accordion.Control icon={<IconCalculator size={20} color="gray"/>}>
                                        <Text fw={700} c="dark.9" size="lg">Costo Total Estimado: ${costoTotalEstimado.toFixed(2)} / hr</Text>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap="md">
                                            {/* SECCIÓN 1: MANTENIMIENTO (LA MATRIZ) */}
                                            <Box>
                                                <Divider label="1. MANTENIMIENTO Y OPERACIÓN (Heredado de Matriz Base)" labelPosition="left" color="blue.3" mb="xs" />
                                                
                                                <Group justify="space-between" align="flex-start" wrap="nowrap">
                                                    <Box>
                                                        <Text size="sm" fw={600}>Desgaste por Rodamiento (Proyectado a horas):</Text>
                                                        <Text size="xs" c="dimmed" ff="monospace">
                                                            (${costoKmMatriz.toFixed(3)}/km × {velocidad} km/h)
                                                        </Text>
                                                    </Box>
                                                    <Text size="sm" fw={500}>${(costoKmMatriz * velocidad).toFixed(2)} / hr</Text>
                                                </Group>

                                                <Group justify="space-between" align="flex-start" wrap="nowrap" mt="xs">
                                                    <Box>
                                                        <Text size="sm" fw={600}>Desgaste por tiempo (Baterias...), Seguros, Trámites:</Text>
                                                        <Text size="xs" c="dimmed" ff="monospace">
                                                            Tarifa plana de matriz por motor encendido
                                                        </Text>
                                                    </Box>
                                                    <Text size="sm" fw={500}>${costoHoraMatriz.toFixed(2)} / hr</Text>
                                                </Group>

                                                <Group justify="space-between" mt="sm" p="xs" bg="blue.0" style={{ borderRadius: '4px' }}>
                                                    <Text size="sm" fw={700} c="blue.9">Subtotal Operativo:</Text>
                                                    <Text size="sm" fw={700} c="blue.9">${costoMantenimientoHora.toFixed(2)} / hr</Text>
                                                </Group>
                                            </Box>

                                            {/* SECCIÓN 2: POSESIÓN (EL FORMULARIO) */}
                                            <Box>
                                                <Divider label="2. POSESIÓN Y DEPRECIACIÓN (Calculado para este Activo)" labelPosition="left" color="teal.3" mb="xs" />
                                                
                                                <Group justify="space-between" align="flex-start" wrap="nowrap">
                                                    <Box>
                                                        <Text size="sm" fw={600}>Depreciación Física:</Text>
                                                        <Text size="xs" c="dimmed" ff="monospace">
                                                            (${valor} - ${salvamento}) ÷ ({vida} años × {horasAnuales} hrs)
                                                        </Text>
                                                    </Box>
                                                    <Text size="sm" fw={500}>${depHora.toFixed(2)} / hr</Text>
                                                </Group>

                                                <Group justify="space-between" align="flex-start" wrap="nowrap" mt="xs">
                                                    <Box>
                                                        <Text size="sm" fw={600}>Interés de Capital Invertido ({tasaInteresGlobal}%):</Text>
                                                        <Text size="xs" c="dimmed" ff="monospace">
                                                            (${valor} × {tasaInteresGlobal / 100}) ÷ {horasAnuales} hrs
                                                        </Text>
                                                    </Box>
                                                    <Text size="sm" fw={500}>${intHora.toFixed(2)} / hr</Text>
                                                </Group>

                                                <Group justify="space-between" mt="sm" p="xs" bg="teal.0" style={{ borderRadius: '4px' }}>
                                                    <Text size="sm" fw={700} c="teal.9">Subtotal Posesión:</Text>
                                                    <Text size="sm" fw={700} c="teal.9">${costoPosesionHoraFinal.toFixed(2)} / hr</Text>
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