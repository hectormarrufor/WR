'use client';

import { useState, useEffect, use } from 'react';
import {
    TextInput, NumberInput, Button, Group,
    SimpleGrid, Stack, Select, Text, Divider, Alert,
    LoadingOverlay, Title, ThemeIcon, Stepper
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconTool, IconCheck } from '@tabler/icons-react';
import { upload } from '@vercel/blob/client';
// Asegúrate de que estas rutas existan en tu proyecto
import ImageDropzone from '../components/ImageDropzone';
import ComponenteInstaller from './ComponenteInstaller';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

export default function ActivoForm({ plantilla, tipoActivo, onCancel }) {
    const [active, setActive] = useState(0);
    const [loading, setLoading] = useState(false);
    const [consumiblesCompatibles, setConsumiblesCompatibles] = useState([]);
    const [imagenFile, setImagenFile] = useState(null);
    const router = useRouter();

    const form = useForm({
        initialValues: {
            codigoInterno: '',
            estado: 'Operativo',
            ubicacionActual: 'Base Principal',
            placa: '',
            serialCarroceria: '',
            serialMotor: '',
            color: 'Blanco',
            imagen: "",
            anioFabricacion: plantilla?.anio || new Date().getFullYear(),
            kilometrajeActual: 0,
            horometroActual: 0,
            instalacionesIniciales: []
        },
        validate: {
            codigoInterno: (val) => (val.length < 2 ? 'Código requerido' : null),
            placa: (val) => (val.length < 3 ? 'Placa requerida' : null),
        }
    });

    // 1. Cargar Inventario Global (Respaldo para búsqueda manual)
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
                        raw: c // Guardamos todo el objeto por si acaso
                    }));
                    setConsumiblesCompatibles(itemsFormateados);
                }
            } catch (err) {
                console.error("Error cargando inventario", err);
            }
        };
        fetchInventario();
    }, []);

    useEffect(() => {
        console.log("form: ", form.values);
    }, [form.values]);

    // 2. Lógica de Envío (Mega POST)
    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            

            // ---------------------------------------------------------
            // AQUÍ ESTÁ LA MAGIA DE LIMPIEZA Y MAPEO
            // ---------------------------------------------------------
            const instalacionesProcesadas = values.instalacionesIniciales.flatMap(inst => {

                // CASO SERIALIZADO
                if (inst.esSerializado && inst.detalles?.length > 0) {
                    return inst.detalles
                        // FILTRO CLAVE: Eliminamos los slots vacíos {} o que no tengan serial
                        .filter(detalle => detalle && detalle.consumibleId && detalle.serial)
                        .map(detalle => ({
                            subsistemaPlantillaId: parseInt(inst.subsistemaPlantillaId),
                            recomendacionId: parseInt(inst.recomendacionId),
                            consumibleId: parseInt(detalle.consumibleId),
                            cantidad: 1,
                            serial: detalle.serial,

                            // PASAMOS LA METADATA QUE VIENE DEL POPOVER
                            esNuevoSerial: detalle.esNuevo || false,
                            fechaCompra: detalle.fechaCompra || new Date(),
                            fechaVencimientoGarantia: detalle.fechaVencimientoGarantia || null,

                            // Si es nuevo serial, el origen siempre es externo (Dotación)
                            // Si no es nuevo, el backend ignorará esto porque ya existe en almacen
                            origen: detalle.esNuevo ? 'externo' : 'almacen'
                        }));
                }

                // CASO FUNGIBLE (Aceite, Filtros)
                // Solo enviamos si se seleccionó un consumible
                if (inst.esFungible && inst.consumibleId) {
                    return [{
                        subsistemaPlantillaId: parseInt(inst.subsistemaPlantillaId),
                        recomendacionId: parseInt(inst.recomendacionId),
                        consumibleId: parseInt(inst.consumibleId),
                        cantidad: parseFloat(inst.cantidad),
                        serial: null,
                        esFungible: true,
                        origen: inst.origen || 'externo' // 'externo' (Dotación) o 'almacen'
                    }];
                }

                // Si no cumple nada (ej: regla fungible vacía), retornamos array vacío
                return [];
            });

            // Validamos que haya algo que instalar (opcional)
            // if (instalacionesProcesadas.length === 0) { ... }

            let payload = {
                codigoInterno: values.codigoInterno,
                estado: values.estado,
                ubicacionActual: values.ubicacionActual,
                fechaAdquisicion: new Date(),
                modeloVehiculoId: plantilla.id,
                placa: values.placa,
                color: values.color,
                serialChasis: values.serialCarroceria,
                serialMotor: values.serialMotor,
                anioFabricacion: values.anioFabricacion,
                kilometrajeActual: values.kilometrajeActual,
                horometroActual: values.horometroActual,

                instalacionesIniciales: instalacionesProcesadas
            };

            if (values.imagen && typeof values.imagen.arrayBuffer === 'function') {
                notifications.show({ id: 'uploading-image', title: 'Subiendo imagen...', message: 'Por favor espera.', loading: true });
                const imagenFile = values.imagen;
                const fileExtension = imagenFile.name.split('.').pop();
                const uniqueFilename = `${values.codigoInterno}.${fileExtension}`;

                const response = await fetch(`/api/upload?filename=${encodeURIComponent(uniqueFilename)}`, {
                    method: 'POST',
                    body: imagenFile,
                });

                if (!response.ok) console.log('Falló la subida de la imagen. Probablemente ya exista una con ese nombre.');
                const newBlob = await response.json();
                payload.imagen = uniqueFilename;
                notifications.update({ id: 'uploading-image', title: 'Éxito', message: 'Imagen subida.', color: 'green' });
            }

            console.log("PAYLOAD FINAL A ENVIAR:", payload); // Para depurar

            const url = tipoActivo === 'Vehiculo' ? '/api/gestionMantenimiento/activos/vehiculos'
                : tipoActivo === 'Remolque' ? '/api/gestionMantenimiento/activos/remolques'
                    : '/api/gestionMantenimiento/activos/maquinas';

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const res = await response.json();

            if (res.success) {
                // Notificar éxito y resetear formulario o cerrar modal
                notifications.show({ title: 'Éxito', message: 'Activo creado correctamente', color: 'green' });
                router.push('/superuser/flota/activos'); // Redirigir al listado de activos
            } else {
                throw new Error(res.error || 'Error al crear vehículo');
            }

        } catch (error) {
            console.error(error);
            // Usar notifications de Mantine es mejor que alert
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (active === 0 && form.validate().hasErrors) return;
        setActive((c) => (c < 2 ? c + 1 : c));
    };
    const prevStep = () => setActive((c) => (c > 0 ? c - 1 : c));

    const isVehiculo = tipoActivo === 'Vehiculo';
    const isMaquina = tipoActivo === 'Maquina';

    return (
        <Stack gap="xl">
            <LoadingOverlay visible={loading} />

            <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false}>
                <Stepper.Step label="Datos Físicos" description="Identificación">
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" mt="md">
                        <Stack>
                            <Text fw={700} size="lg" c="blue">Base: {plantilla.marca} {plantilla.modelo}</Text>
                            <Divider />
                            <TextInput label="Código Interno / Alias" placeholder="ej. V-045" required {...form.getInputProps('codigoInterno')} />
                            <Select label="Estado Inicial" data={['Operativo', 'En Mantenimiento', 'Inactivo']} {...form.getInputProps('estado')} />
                            <TextInput label="Ubicación Actual" placeholder="Base Principal" {...form.getInputProps('ubicacionActual')} />
                            <Divider label="Legal" labelPosition="center" />
                            <TextInput label="Placa / Patente" required {...form.getInputProps('placa')} />
                            <TextInput label="Serial Carrocería / VIN" {...form.getInputProps('serialCarroceria')} />
                            {(isVehiculo || isMaquina) && <TextInput label="Serial Motor" {...form.getInputProps('serialMotor')} />}
                        </Stack>
                        <Stack>
                            <Text fw={500} size="sm">Fotografía</Text>
                            <ImageDropzone label="Imagen del Vehículo" form={form} fieldPath="imagen" onDrop={setImagenFile} />
                            <Group grow>
                                <Select label="Color" data={["Blanco", "Negro", "Gris", "Azul", "Rojo", "Amarillo"]} {...form.getInputProps('color')} />
                                <NumberInput label="Año" min={1980} max={2030} {...form.getInputProps('anioFabricacion')} />
                            </Group>
                            {isVehiculo && <NumberInput label="Kilometraje (km)" min={0} {...form.getInputProps('kilometrajeActual')} />}
                            {(isVehiculo || isMaquina) && <NumberInput label="Horómetro (hrs)" min={0} {...form.getInputProps('horometroActual')} />}
                        </Stack>
                    </SimpleGrid>
                </Stepper.Step>

                <Stepper.Step label="Configuración" description="Componentes">
                    <Stack mt="md">
                        <Alert icon={<IconTool size={16} />} title="Instalación de Componentes" color="blue">
                            Define qué componentes reales están instalados en cada subsistema.
                        </Alert>
                        <SimpleGrid cols={1} spacing="md">
                            {plantilla.subsistemas.map((sub) => (
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
                    </Stack>
                </Stepper.Step>

                <Stepper.Completed>
                    <Stack align="center" mt="xl">
                        <ThemeIcon size={80} radius="xl" color="green" variant="light"><IconCheck size={50} /></ThemeIcon>
                        <Title order={3}>Confirmar Creación</Title>
                        <Text c="dimmed">Activo: <b>{form.values.codigoInterno}</b></Text>
                        <Button size="lg" onClick={() => handleSubmit(form.values)} loading={loading}>Crear Activo</Button>
                    </Stack>
                </Stepper.Completed>
            </Stepper>

            <Group justify="space-between" mt="xl">
                <Button variant="default" onClick={active === 0 ? onCancel : prevStep}>{active === 0 ? 'Cancelar' : 'Atrás'}</Button>
                {active < 2 && <Button onClick={nextStep}>Siguiente</Button>}
            </Group>
        </Stack>
    );
}