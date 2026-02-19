'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    TextInput, NumberInput, Button, Group,
    SimpleGrid, Stack, Select, Text, Divider, Alert,
    LoadingOverlay, ThemeIcon, Stepper, Paper, Title,
    Tooltip, ActionIcon, Accordion, Code, Slider, Badge
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconCoin, IconEdit, IconTool, IconAlertCircle, IconInfoCircle, IconCalculator, IconSettings } from '@tabler/icons-react';
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
    
    // CONFIGURACIÓN GLOBAL (Tasa de interés Base)
    const [tasaInteresGlobal, setTasaInteresGlobal] = useState(5.0);

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

            // --- FINANCIEROS Y OPERATIVOS (NUEVOS CAMPOS) ---
            matrizCostoId: initialData?.matrizCostoId ? String(initialData.matrizCostoId) : '',
            valorReposicion: initialData?.valorReposicion || '',
            vidaUtilAnios: initialData?.vidaUtilAnios || '',
            valorSalvamento: initialData?.valorSalvamento || '',
            
            // Perfil Operativo (Control total por activo)
            horasAnuales: initialData?.horasAnuales || 2000,
            velocidadPromedio: initialData?.velocidadPromedio || 40,
            calidadRepuestos: initialData?.calidadRepuestos || 50, // 50% es el promedio

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

    // 1. CARGAR CONFIG GLOBAL
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

    // 2. CARGA DE INVENTARIO
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
                        stockActual: parseFloat(c.stockAlmacen || 0),
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
    
    // Perfil operativo ingresado por el usuario
    const horasAnuales = parseInt(form.values.horasAnuales) || 2000;
    const velocidad = parseInt(form.values.velocidadPromedio) || 0;
    const calidad = parseInt(form.values.calidadRepuestos) || 50; // 0 a 100
    const factorCalidad = calidad / 100; // 0.0 a 1.0
    const tasaInteres = tasaInteresGlobal / 100;

    // A. DEPRECIACIÓN E INTERÉS
    const montoADepreciar = valor - salvamento;
    const vidaEnHoras = vida * horasAnuales;
    const depHora = vidaEnHoras > 0 ? (montoADepreciar / vidaEnHoras) : 0;
    const intHora = horasAnuales > 0 ? ((valor * tasaInteres) / horasAnuales) : 0;
    const costoPosesionHora = depHora + intHora;

    // B. MANTENIMIENTO (Ajustado por velocidad y calidad)
    let costoMantenimientoHora = 0;
    let costoMatrizOriginalKm = 0;
    const matrizIdSeleccionada = form.values.matrizCostoId;

    if (matrizIdSeleccionada && matricesData.length > 0) {
        const matriz = matricesData.find(m => String(m.id) === String(matrizIdSeleccionada));
        if (matriz) {
            costoMatrizOriginalKm = parseFloat(matriz.totalCostoKm || 0);
            
            // LÓGICA DE LICITACIÓN (Slider)
            // Asumimos de manera simplificada que el Costo Promedio (50%) es el de la BD.
            // Si baja a 0% (Chino), el costo se reduce un 30% del original.
            // Si sube a 100% (Premium), el costo aumenta un 30% del original.
            // (Si usaras los campos costoMinimo/Maximo de la BD, iterarías matriz.detalles aquí).
            const variacion = -0.30 + (0.60 * factorCalidad); // Rango: -0.30 a +0.30
            const costoKmAjustado = costoMatrizOriginalKm * (1 + variacion);

            // LÓGICA DE VELOCIDAD / EQUIPO ESTACIONARIO
            if (velocidad === 0) {
                // Si la velocidad es 0 (Ej: Equipo Achicando/Estacionario), 
                // los costos por KM no aplican, pero asumimos un desgaste de motor equivalente.
                // Regla industrial común: 1 hora de motor en ralentí = 40 km de desgaste de motor.
                costoMantenimientoHora = costoKmAjustado * 40; // O el factor que estimes en tu empresa
            } else {
                costoMantenimientoHora = costoKmAjustado * velocidad;
            }
        }
    }

    const costoCalculado = {
        posesion: costoPosesionHora,
        mantenimiento: costoMantenimientoHora,
        total: costoPosesionHora + costoMantenimientoHora,
        depreciacion: depHora,
        intereses: intHora
    };

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
                costoPosesionHora: costoCalculado.posesion, 
                usuario: nombre + ' ' + apellido,
            };

            // Manejo de Imagen
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
                {/* PASO 0: FÍSICO (Igual que antes) */}
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

                {/* PASO 1: FINANCIERO Y OPERATIVO */}
                <Stepper.Step label="Financiero" description="Cotización y Costos" icon={<IconCoin size={18} />}>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md" spacing="xl">
                        
                        {/* COLUMNA IZQUIERDA: MANTENIMIENTO Y LICITACIÓN */}
                        <Stack>
                            <Paper withBorder p="md" radius="md">
                                <Title order={5} mb="sm" c="blue.9">1. Matriz y Calidad (Repuestos)</Title>
                                <Select
                                    label="Matriz Base"
                                    placeholder="Seleccione estructura de costos..."
                                    data={matricesCostos}
                                    searchable required mb="md"
                                    {...form.getInputProps('matrizCostoId')}
                                />
                                
                                <Text size="sm" fw={500} mb={4}>Calidad / Presupuesto Repuestos</Text>
                                <Slider
                                    color="blue"
                                    marks={[
                                        { value: 0, label: 'Económico' },
                                        { value: 50, label: 'Promedio' },
                                        { value: 100, label: 'Premium' },
                                    ]}
                                    {...form.getInputProps('calidadRepuestos')}
                                    mb="xl" pb="sm"
                                />
                            </Paper>

                            <Paper withBorder p="md" radius="md" mt="sm">
                                <Group justify="space-between" mb="xs">
                                    <Title order={5} c="orange.9">2. Perfil Operativo (Contrato)</Title>
                                    <Tooltip label="Ajusta estos valores según la licitación o trabajo específico. Si está estacionario (Achique), usa 0 km/h."><IconInfoCircle size={16}/></Tooltip>
                                </Group>
                                <Group grow>
                                    <NumberInput required label="Horas Anuales Estimadas" {...form.getInputProps('horasAnuales')} />
                                    <NumberInput required label="Velocidad Promedio (km/h)" {...form.getInputProps('velocidadPromedio')} />
                                </Group>
                            </Paper>
                        </Stack>

                        {/* COLUMNA DERECHA: POSESIÓN Y RESULTADOS */}
                        <Stack>
                            <Paper withBorder p="md" radius="md">
                                <Title order={5} mb="md" c="teal.9">3. Inversión y Posesión</Title>
                                <NumberInput required label="Valor de Adquisición ($)" prefix="$" thousandSeparator mb="sm" {...form.getInputProps('valorReposicion')} />
                                <Group grow align="flex-start">
                                    <NumberInput required label="Vida Útil (Años)" {...form.getInputProps('vidaUtilAnios')} />
                                    <NumberInput 
                                        required 
                                        label={<Group gap={4}>Salvamento ($)<Tooltip label="Valor de reventa futuro"><IconInfoCircle size={14} /></Tooltip></Group>}
                                        prefix="$" thousandSeparator {...form.getInputProps('valorSalvamento')} 
                                    />
                                </Group>
                            </Paper>

                            {/* RESULTADOS MATEMÁTICOS */}
                            <Accordion variant="contained" radius="md" defaultValue="calculo">
                                <Accordion.Item value="calculo" style={{ backgroundColor: 'var(--mantine-color-teal-0)', borderColor: 'var(--mantine-color-teal-3)' }}>
                                    <Accordion.Control icon={<IconCalculator size={20} color="teal"/>}>
                                        <Text fw={700} c="teal.9" size="lg">COTIZACIÓN EST.: ${costoCalculado.total.toFixed(2)} / hr</Text>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap="xs">
                                            <Divider label="1. MANTENIMIENTO" labelPosition="left" color="blue.2" />
                                            <Group justify="space-between">
                                                <Text size="xs" c="dimmed">Perfil Seleccionado:</Text>
                                                <Badge size="sm" color={form.values.calidadRepuestos < 40 ? 'red' : form.values.calidadRepuestos > 60 ? 'green' : 'blue'}>
                                                    {form.values.calidadRepuestos}% Calidad
                                                </Badge>
                                            </Group>
                                            {form.values.velocidadPromedio === 0 && (
                                                <Alert color="orange" p="xs" title="Equipo Estacionario">
                                                    Se asume desgaste de motor en ralentí (~40km equivalentes/hora).
                                                </Alert>
                                            )}
                                            <Group justify="space-between">
                                                <Text size="sm" fw={500}>Costo Mantenimiento:</Text>
                                                <Text size="sm" fw={700}>${costoCalculado.mantenimiento.toFixed(2)} / hr</Text>
                                            </Group>

                                            <Divider label="2. POSESIÓN" labelPosition="left" color="teal.2" mt="sm" />
                                            <Text size="xs" c="dimmed">Depreciación + Interés (Base {form.values.horasAnuales}h/año):</Text>
                                            <Group justify="space-between">
                                                <Text size="sm" fw={500}>Costo Posesión:</Text>
                                                <Text size="sm" fw={700}>${costoCalculado.posesion.toFixed(2)} / hr</Text>
                                            </Group>
                                        </Stack>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            </Accordion>
                        </Stack>
                    </SimpleGrid>
                </Stepper.Step>

                {/* PASO 2: COMPONENTES */}
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