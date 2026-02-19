'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    TextInput, NumberInput, Button, Group,
    SimpleGrid, Stack, Select, Text, Divider, Alert,
    LoadingOverlay, ThemeIcon, Stepper, Paper, Title,
    Tooltip, ActionIcon, Accordion, Code,
    Badge
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconCoin, IconEdit, IconTool, IconAlertCircle, IconInfoCircle, IconCalculator } from '@tabler/icons-react';
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
    
    // CONFIGURACIÓN GLOBAL (DB)
    const [globalConfig, setGlobalConfig] = useState({
        horasAnuales: 2000, 
        tasaInteres: 5.0    
    });

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

            // --- FINANCIEROS (AHORA EN BLANCO POR DEFECTO) ---
            matrizCostoId: initialData?.matrizCostoId ? String(initialData.matrizCostoId) : '',
            valorReposicion: initialData?.valorReposicion || '',
            vidaUtilAnios: initialData?.vidaUtilAnios || '',
            valorSalvamento: initialData?.valorSalvamento || '',

            // --- INSTALACIONES ---
            instalacionesIniciales: []
        },
        validate: {
            codigoInterno: (val) => (val.length < 2 ? 'Código requerido' : null),
            matrizCostoId: (val) => (!val ? 'Debes asignar una estructura de costos' : null),
            valorReposicion: (val) => (!val || val <= 0 ? 'Ingrese el valor del equipo' : null),
            vidaUtilAnios: (val) => (!val || val <= 0 ? 'Ingrese los años de vida útil' : null),
            valorSalvamento: (val) => (val === '' || val < 0 ? 'Ingrese un valor de salvamento (puede ser 0)' : null),
        }
    });

    // 1. CARGAR CONFIGURACIÓN GLOBAL
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/configuracion/global');
                if (res.ok) {
                    const data = await res.json();
                    setGlobalConfig({
                        horasAnuales: parseFloat(data.horasAnualesOperativas) || 2000,
                        tasaInteres: parseFloat(data.tasaInteresAnual) || 5.0
                    });
                }
            } catch (error) {
                console.error("Error cargando config global:", error);
            }
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
            } catch (err) { console.error(err); }
        };
        fetchInventario();
    }, []);

    // 3. PRE-CARGA DATOS EDICIÓN
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
    // CÁLCULO
    // --------------------------------------------------------
    const valor = parseFloat(form.values.valorReposicion) || 0;
    const salvamento = parseFloat(form.values.valorSalvamento) || 0;
    const vida = parseInt(form.values.vidaUtilAnios) || 1;
    
    const horasAnuales = globalConfig.horasAnuales;
    const tasaInteres = globalConfig.tasaInteres / 100;

    // Depreciación
    const montoADepreciar = valor - salvamento;
    const vidaEnHoras = vida * horasAnuales;
    const depHora = vidaEnHoras > 0 ? (montoADepreciar / vidaEnHoras) : 0;
    
    // Interés (Costo Oportunidad)
    const intHora = horasAnuales > 0 ? ((valor * tasaInteres) / horasAnuales) : 0;
    
    const costoPosesionHora = depHora + intHora;

    // Mantenimiento
    let costoMantenimientoHora = 0;
    let costoKmMatriz = 0;
    const matrizIdSeleccionada = form.values.matrizCostoId;

    if (matrizIdSeleccionada && matricesData.length > 0) {
        const matriz = matricesData.find(m => String(m.id) === String(matrizIdSeleccionada));
        if (matriz) {
            costoKmMatriz = parseFloat(matriz.totalCostoKm || 0);
            const velocidadPromedio = 40; 
            costoMantenimientoHora = costoKmMatriz * velocidadPromedio;
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
        if (active === 0) {
            const checkCodigo = form.validateField('codigoInterno');
            if (checkCodigo.hasError) hasError = true;
        } else if (active === 1) {
            const checkMatriz = form.validateField('matrizCostoId');
            const checkValor = form.validateField('valorReposicion');
            const checkVida = form.validateField('vidaUtilAnios');
            const checkSalvamento = form.validateField('valorSalvamento');
            if (checkMatriz.hasError || checkValor.hasError || checkVida.hasError || checkSalvamento.hasError) {
                hasError = true;
            }
        }
        if (!hasError) setActive((c) => c + 1);
        else notifications.show({ title: 'Atención', message: 'Verifique los campos obligatorios en rojo', color: 'orange' });
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
                costoPosesionHora: costoCalculado.posesion, 
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

            if (!isEditing) payload.modeloVehiculoId = plantilla.id;

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const res = await response.json();
            if (res.success) {
                notifications.show({ title: 'Éxito', message: 'Guardado correctamente', color: 'green' });
                if (isEditing) router.push(`/superuser/flota/activos/${initialData.id}`);
                else router.push('/superuser/flota/activos');
            } else throw new Error(res.error || 'Error en el servidor');

        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally { setLoading(false); }
    };

    const isVehiculo = tipoActivo === 'Vehiculo' || initialData?.tipoActivo === 'Vehiculo';
    const isMaquina = tipoActivo === 'Maquina' || initialData?.tipoActivo === 'Maquina';

    return (
        <Stack gap="xl">
            <LoadingOverlay visible={loading} zIndex={1000} />

            <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={isEditing}>
                {/* PASO 0 */}
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

                {/* PASO 1: FINANCIERO CON DETALLE */}
                <Stepper.Step label="Financiero" description="Costos y Depreciación" icon={<IconCoin size={18} />}>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md" spacing="xl">
                        <Stack>
                            <Alert title="Matriz de Mantenimiento" color="blue" icon={<IconCoin />}>
                                Costos variables basados en repuestos y servicios ($/Km).
                            </Alert>
                            <Select
                                label="Seleccionar Matriz"
                                placeholder="Buscar perfil..."
                                data={matricesCostos}
                                searchable
                                nothingFoundMessage="No hay matrices"
                                required
                                {...form.getInputProps('matrizCostoId')}
                            />

                            {costoCalculado.mantenimiento > 0 && (
                                <Paper withBorder p="md" bg="blue.0" radius="md">
                                    <Group justify="space-between" mb="xs">
                                        <Text size="sm" fw={700} c="blue.9">Costo Matriz (BD):</Text>
                                        <Text fw={700} c="blue.9">${costoKmMatriz.toFixed(4)} / km</Text>
                                    </Group>
                                    <Divider color="blue.2" />
                                    <Group justify="space-between" mt="xs">
                                        <Text size="sm" c="dimmed">Velocidad Promedio Est.:</Text>
                                        <Text size="sm">40 km/h</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm" fw={700} c="blue.8">Costo Hora Mantenimiento:</Text>
                                        <Text fw={700} size="lg" c="blue.8">${costoCalculado.mantenimiento.toFixed(2)} / hr</Text>
                                    </Group>
                                </Paper>
                            )}
                        </Stack>

                        <Stack>
                            <Paper withBorder p="md" radius="md">
                                <Group justify="space-between" mb="md">
                                    <Title order={5}>Parámetros de Posesión</Title>
                                    <Badge variant="light" color="gray">
                                        Base: {globalConfig.horasAnuales} hrs/año • Tasa: {globalConfig.tasaInteres}%
                                    </Badge>
                                </Group>
                                
                                <NumberInput 
                                    required 
                                    label="Valor de Adquisición / Reposición ($)" 
                                    prefix="$" 
                                    thousandSeparator 
                                    mb="sm" 
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
                                            <Group gap={4}>
                                                Valor Salvamento ($)
                                                <Tooltip 
                                                    label="El valor residual o de venta esperado que tendrá el equipo cuando lo vayas a desincorporar/vender en el futuro. Ej: Compras un chuto en $40.000, pero estimas venderlo en $5.000 cuando ya esté muy viejo." 
                                                    multiline 
                                                    w={260} 
                                                    withArrow 
                                                    position="top"
                                                >
                                                    <IconInfoCircle size={14} style={{ cursor: 'help', color: 'var(--mantine-color-blue-6)' }} />
                                                </Tooltip>
                                            </Group>
                                        }
                                        prefix="$" 
                                        thousandSeparator 
                                        {...form.getInputProps('valorSalvamento')} 
                                    />
                                </Group>
                            </Paper>

                            {/* --- DESGLOSE DETALLADO CON FÓRMULAS EXPLÍCITAS --- */}
                            <Accordion variant="contained" radius="md" defaultValue="calculo">
                                <Accordion.Item value="calculo" style={{ backgroundColor: 'var(--mantine-color-teal-0)', borderColor: 'var(--mantine-color-teal-3)' }}>
                                    <Accordion.Control icon={<IconCalculator size={20} color="teal"/>}>
                                        <Text fw={700} c="teal.9" size="lg">COSTO TOTAL: ${costoCalculado.total.toFixed(2)} / hr</Text>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap="xs">
                                            <Divider label="1. DEPRECIACIÓN" labelPosition="left" color="teal.2" />
                                            <Text size="xs" c="dimmed">Fórmula Explícita:</Text>
                                            <Code block color="teal.1" c="teal.9" style={{ fontSize: '11px', lineHeight: 1.4 }}>
                                                (Valor Activo: ${valor.toLocaleString()} - Salvamento: ${salvamento.toLocaleString()})<br/>
                                                ──────────────────────────────────────────────────────────<br/>
                                                (Vida Útil: {vida} años × {globalConfig.horasAnuales.toLocaleString()} hrs/año)
                                            </Code>
                                            <Group justify="space-between" mt={4}>
                                                <Text size="sm" fw={500}>Costo Depreciación:</Text>
                                                <Text size="sm" fw={700}>${costoCalculado.depreciacion.toFixed(2)} / hr</Text>
                                            </Group>

                                            <Divider label="2. INTERÉS (Costo Financiero)" labelPosition="left" color="teal.2" mt="sm" />
                                            <Text size="xs" c="dimmed">Fórmula Explícita:</Text>
                                            <Code block color="teal.1" c="teal.9" style={{ fontSize: '11px', lineHeight: 1.4 }}>
                                                (Valor Activo: ${valor.toLocaleString()} × Tasa Interés: {globalConfig.tasaInteres}%)<br/>
                                                ──────────────────────────────────────────────────<br/>
                                                ({globalConfig.horasAnuales.toLocaleString()} hrs/año)
                                            </Code>
                                            <Group justify="space-between" mt={4}>
                                                <Text size="sm" fw={500}>Costo Financiero:</Text>
                                                <Text size="sm" fw={700}>${costoCalculado.intereses.toFixed(2)} / hr</Text>
                                            </Group>

                                            <Divider label="RESUMEN" labelPosition="center" color="teal.3" mt="sm" />
                                            <Group justify="space-between">
                                                <Text size="sm">Mantenimiento (Matriz BD):</Text>
                                                <Text size="sm">${costoCalculado.mantenimiento.toFixed(2)} / hr</Text>
                                            </Group>
                                            <Group justify="space-between">
                                                <Text size="sm">Posesión (Depreciación + Interés):</Text>
                                                <Text size="sm">${costoCalculado.posesion.toFixed(2)} / hr</Text>
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
                    {isEditing && (
                        <Alert color="orange" icon={<IconAlertCircle size={16} />} mb="md" title="Modo Edición">
                            Modificar estos componentes aquí actualizará la configuración base.
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
                {active < 2 && <Button onClick={handleNextStep}>Siguiente</Button>}
            </Group>
        </Stack>
    );
}