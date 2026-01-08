'use client';

import { useState, useEffect } from 'react';
import {
    TextInput, NumberInput, ColorInput, Button, Group,
    SimpleGrid, Stack, Select, Text, Divider, Alert,
    LoadingOverlay, Paper, Title, ThemeIcon, Stepper
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconTool, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import ImageDropzone from '../components/ImageDropzone'; // Verifica que la ruta sea correcta
import { upload } from '@vercel/blob/client';
import ConsumibleSelector from '../../modelos/components/ConsumibleSelector';
import ComponenteInstaller from './ComponenteInstaller';

export default function ActivoForm({ plantilla, tipoActivo, onCancel, onSuccess }) {
    // Este componente tiene su propio Stepper interno de 2 pasos:
    // 1. Datos Físicos
    // 2. Configuración de Componentes
    const [active, setActive] = useState(0);
    const [loading, setLoading] = useState(false);
    const [consumiblesCompatibles, setConsumiblesCompatibles] = useState([]);
    const [imagenFile, setImagenFile] = useState(null);

    // Formulario Interno (Solo maneja datos de la instancia)
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
            instalacionesIniciales: [] // { subsistemaPlantillaId, consumibleId }
        },
        validate: {
            codigoInterno: (val) => (val.length < 2 ? 'Código requerido' : null),
            placa: (val) => (val.length < 3 ? 'Placa requerida' : null),
        }
    });

useEffect(() => {
    const fetchInventario = async () => {
      try {
        const res = await fetch('/api/inventario/consumibles?limit=1000'); 
        const result = await res.json();

        // 1. CORRECCIÓN: Extraer el array correctamente desde 'items'
        const rawItems = result.items || result.data || [];

        if (rawItems.length > 0) {
          const itemsFormateados = rawItems.map(c => {
            // 2. CORRECCIÓN: Parsear stockAlmacen (string "200.00") a número
            const stockNumerico = parseFloat(c.stockAlmacen || 0);

            // 3. MEJORA: Extraer detalles técnicos para filtrado inteligente
            // Esto ayudará al ComponenteInstaller a ser más preciso
            const detalleTecnico = c.Aceite?.viscosidad || c.Neumatico?.medida || c.Filtro?.codigo || c.Baterium?.codigo || '';

            return {
              value: c.id.toString(),
              // Label informativo para el humano
              label: `${c.nombre} - Stock: ${stockNumerico}`,
              
              // Propiedades para la lógica de filtrado
              categoria: c.categoria,
              stockActual: stockNumerico,
              disabled: stockNumerico <= 0,
              
              // Pasamos los datos técnicos crudos para comparar viscosidad/medidas
              raw: {
                 viscosidad: c.Aceite?.viscosidad,
                 medida: c.Neumatico?.medida,
                 grupo: c.Filtro?.grupoEquivalenciaId,
                 codigo: c.Filtro?.codigo
              }
            };
          });
          
          setConsumiblesCompatibles(itemsFormateados);
        } else {
            console.warn("Inventario vacío o estructura desconocida", result);
        }
      } catch (err) {
        console.error("Error cargando inventario", err);
      }
    };
    fetchInventario();
  }, []);
    useEffect(() => {
        console.log("form", form.values);
    }, [form.values]);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            let imageUrl = null;
            if (imagenFile) {
                const blob = await upload(imagenFile.name, imagenFile, {
                    access: 'public',
                    handleUploadUrl: '/api/upload',
                });
                imageUrl = blob.url;
            }

            // Preparamos el payload final
            const payload = {
                ...values,
                imagen: imageUrl,
                modeloVehiculoId: plantilla.id,
                tipoActivo: tipoActivo,
                // Mapeamos las instalaciones para que el backend las entienda
                // APLANAMOS LA ESTRUCTURA PARA EL BACKEND
                instalacionesIniciales: values.instalacionesIniciales.flatMap(inst => {

                    // Si es un item SERIALIZADO (Ej: 8 Cauchos con seriales)
                    // Generamos 8 registros para el backend
                    if (inst.esSerializado && inst.seriales.length > 0) {
                        return inst.seriales.map(serial => ({
                            subsistemaPlantillaId: inst.subsistemaPlantillaId, // ID Motor
                            recomendacionId: inst.recomendacionId,             // ID Regla (Opcional, útil para auditoría)
                            consumibleId: parseInt(inst.consumibleId),
                            cantidad: 1,
                            serial: serial || null, // Guardamos el serial
                            fechaInstalacion: new Date()
                        }));
                    }

                    // Si es FUNGIBLE o DISCRETO NO SERIALIZADO
                    // Generamos 1 registro con la cantidad total
                    return {
                        subsistemaPlantillaId: inst.subsistemaPlantillaId,
                        recomendacionId: inst.recomendacionId,
                        consumibleId: parseInt(inst.consumibleId),
                        cantidad: parseFloat(inst.cantidad),
                        serial: null,
                        fechaInstalacion: new Date()
                    };
                })
            };


            await onSuccess(payload);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (active === 0) {
            if (form.validate().hasErrors) return;
        }
        setActive((current) => (current < 2 ? current + 1 : current));
    };
    const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

    const isVehiculo = tipoActivo === 'Vehiculo';
    const isMaquina = tipoActivo === 'Maquina';

    return (
        <Stack gap="xl">
            <LoadingOverlay visible={loading} />

            <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false}>
                <Stepper.Step label="Datos Generales" description="Identificación física">
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" mt="md">
                        <Stack>
                            <Text fw={700} size="lg" c="blue">Base: {plantilla.marca} {plantilla.modelo}</Text>
                            <Divider />

                            <TextInput label="Código Interno / Alias" placeholder="ej. V-045" required {...form.getInputProps('codigoInterno')} />
                            <Select label="Estado Inicial" data={['Operativo', 'En Mantenimiento', 'Inactivo']} {...form.getInputProps('estado')} />
                            <TextInput label="Ubicación Actual" placeholder="Base Principal" {...form.getInputProps('ubicacionActual')} />

                            <Divider label="Identificación Legal" labelPosition="center" />

                            <TextInput label="Placa / Patente" required {...form.getInputProps('placa')} />
                            <TextInput label="Serial Carrocería / VIN" {...form.getInputProps('serialCarroceria')} />
                            {(isVehiculo || isMaquina) && (
                                <TextInput label="Serial Motor" {...form.getInputProps('serialMotor')} />
                            )}
                        </Stack>

                        <Stack>
                            <Text fw={500} size="sm">Fotografía</Text>
                            <ImageDropzone label="Imagen del Vehículo (opcional)"
                                form={form} fieldPath="imagen" />

                            <Group grow>
                                <Select label="Color"
                                    data={[
                                        "Blanco", "Negro", "Gris", "Azul", "Rojo", "Verde", "Amarillo", "Naranja", "Marrón", "Morado", "Rosa", "Dorado", "Plateado"
                                    ]}
                                    {...form.getInputProps('color')} />
                                <NumberInput label="Año Fabricación" min={1980} max={2030} {...form.getInputProps('anioFabricacion')} />
                            </Group>

                            {isVehiculo && (
                                <NumberInput label="Kilometraje Inicial" suffix=" km" min={0} {...form.getInputProps('kilometrajeActual')} />
                            )}
                            {(isVehiculo || isMaquina) && (
                                <NumberInput label="Horómetro Inicial" suffix=" hrs" min={0} {...form.getInputProps('horometroActual')} />
                            )}
                        </Stack>
                    </SimpleGrid>
                </Stepper.Step>

                {/* PASO 2: CONFIGURACIÓN ACTUALIZADO */}
                <Stepper.Step label="Configuración" description="Componentes instalados">
                    <Stack mt="md">
                        <Alert icon={<IconTool size={16} />} title="Instalación de Componentes" color="blue">
                            El sistema ha detectado las siguientes reglas para este modelo. Indica qué componentes reales tiene instalados.
                        </Alert>

                        <SimpleGrid cols={1} spacing="md">
                            {plantilla.subsistemas.map((sub) => (
                                <ComponenteInstaller
                                    key={sub.id}
                                    subsistema={sub} // Pasamos el objeto COMPLETO con listaRecomendada
                                    inventario={consumiblesCompatibles}
                                    // Pasamos TODAS las instalaciones actuales para filtrar dentro
                                    instalaciones={form.values.instalacionesIniciales}
                                    onChange={(newGlobalState) => {
                                        form.setFieldValue('instalacionesIniciales', newGlobalState);
                                    }}
                                />
                            ))}
                        </SimpleGrid>
                    </Stack>
                </Stepper.Step>

                <Stepper.Completed>
                    <Stack align="center" mt="xl" gap="lg">
                        <ThemeIcon size={80} radius="xl" color="green" variant="light">
                            <IconCheck size={50} />
                        </ThemeIcon>
                        <Title order={3}>Confirmar Creación</Title>
                        <Text ta="center" c="dimmed" maxW={500}>
                            Se registrará el activo <b>{form.values.codigoInterno}</b>.
                        </Text>
                        <Button size="lg" onClick={() => handleSubmit(form.values)} loading={loading}>
                            Crear Activo Ahora
                        </Button>
                    </Stack>
                </Stepper.Completed>
            </Stepper>

            <Group justify="space-between" mt="xl">
                <Button variant="default" onClick={active === 0 ? onCancel : prevStep}>
                    {active === 0 ? 'Volver a Modelos' : 'Atrás'}
                </Button>

                {active < 2 && (
                    <Button onClick={nextStep}>Siguiente</Button>
                )}
            </Group>
        </Stack>
    );
}