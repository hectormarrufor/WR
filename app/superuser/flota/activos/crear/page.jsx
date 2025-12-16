// app/superuser/flota/activos/crear/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Stepper, Button, Group, Title, Paper, Text, 
  SimpleGrid, UnstyledButton, rem, ThemeIcon,
  Select, Modal, TextInput, NumberInput, ColorInput,
  LoadingOverlay, ActionIcon, Stack, Divider, Alert
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
  IconTruck, IconTruckLoading, IconBackhoe, 
  IconPlus, IconCheck, IconAlertCircle, IconTool 
} from '@tabler/icons-react';
import { upload } from '@vercel/blob/client'; // Para subir la imagen desde el front

// Componentes propios
import ImageDropzone from '../components/ImageDropzone'; 
import ModeloActivoForm from '../../modelos/components/ModeloActivoForm'; // Reutilizamos tu form existente
import { http } from '@/app/ApiFunctions/httpServices'; // Tu servicio HTTP

// --- PASO 1: SELECCIÓN DE TIPO ---
const TipoSelector = ({ value, onChange }) => {
  const tipos = [
    { id: 'Vehiculo', label: 'Vehículo', icon: IconTruck, desc: 'Camiones, Chutos, Vans' },
    { id: 'Remolque', label: 'Remolque', icon: IconTruckLoading, desc: 'Bateas, Lowboys, Cisternas' },
    { id: 'Maquina', label: 'Máquina', icon: IconBackhoe, desc: 'Retroexcavadoras, Taladros, Plantas' },
  ];

  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
      {tipos.map((item) => (
        <UnstyledButton
          key={item.id}
          onClick={() => onChange(item.id)}
          data-checked={value === item.id}
          style={(theme) => ({
            padding: theme.spacing.xl,
            borderRadius: theme.radius.md,
            border: `2px solid ${value === item.id ? theme.colors.blue[6] : theme.colors.gray[2]}`,
            backgroundColor: value === item.id ? theme.colors.blue[0] : 'transparent',
            transition: 'all 0.2s ease',
          })}
        >
          <Group justify="center" mb="md">
            <ThemeIcon size={60} variant="light" color={value === item.id ? 'blue' : 'gray'}>
              <item.icon style={{ width: rem(32), height: rem(32) }} />
            </ThemeIcon>
          </Group>
          <Text align="center" fw={700} size="lg" c={value === item.id ? 'blue' : 'dark'}>
            {item.label}
          </Text>
          <Text align="center" size="sm" c="dimmed" mt="xs">
            {item.desc}
          </Text>
        </UnstyledButton>
      ))}
    </SimpleGrid>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function CrearActivoPage() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalModeloOpen, setModalModeloOpen] = useState(false);
  
  // Datos para los selects
  const [modelosDisponibles, setModelosDisponibles] = useState([]);
  const [subsistemasPlantilla, setSubsistemasPlantilla] = useState([]);
  const [consumiblesCompatibles, setConsumiblesCompatibles] = useState([]); // Para sugerencias
  
  // Estado para la imagen
  const [imagenFile, setImagenFile] = useState(null);

  const form = useForm({
    initialValues: {
      tipoActivo: '',
      plantillaId: '',
      codigoInterno: '',
      estado: 'Operativo',
      ubicacionActual: 'Base Principal',
      // Campos específicos mezclados
      placa: '',
      serialCarroceria: '',
      serialMotor: '',
      color: '#FFFFFF',
      anioFabricacion: new Date().getFullYear(),
      kilometrajeActual: 0,
      horometroActual: 0,
      // Array de instalaciones
      instalacionesIniciales: [] // { subsistemaId, consumibleId }
    },
    validate: {
      tipoActivo: (value) => !value ? 'Seleccione un tipo' : null,
      plantillaId: (value) => !value ? 'Seleccione un modelo' : null,
      codigoInterno: (value) => !value ? 'Código requerido' : null,
    }
  });

  // Efecto: Cargar Modelos cuando cambia el Tipo
  useEffect(() => {
    if (form.values.tipoActivo && active === 1) {
      cargarModelos();
    }
  }, [form.values.tipoActivo, active]);

  // Efecto: Cargar Subsistemas cuando se selecciona Plantilla
  useEffect(() => {
    if (form.values.plantillaId && active === 3) {
      cargarSubsistemasYRecomendaciones();
    }
  }, [form.values.plantillaId, active]);

  const cargarModelos = async () => {
    setLoading(true);
    try {
      // Endpoint que te sugiero crear o adaptar: GET /api/gestionMantenimiento/modelos?tipo=Vehiculo
      // Por ahora usaré una lógica simulada o asumiré que tienes un endpoint de "plantillas"
      // Si no tienes uno específico, podrías filtrar en el front, pero idealmente filtra en back.
      // Aquí asumo que usas el endpoint genérico que te di antes o uno de catálogos.
      
      /* NOTA: Como no tengo tu endpoint exacto de "get all templates by type", 
         asumiré que tienes uno o lo agregas. 
         Si no, puedes usar el de /vehiculo, /remolque, /maquina por separado.
      */
      let url = '';
      if (form.values.tipoActivo === 'Vehiculo') url = '/api/gestionMantenimiento/vehiculo';
      else if (form.values.tipoActivo === 'Remolque') url = '/api/gestionMantenimiento/remolque';
      else if (form.values.tipoActivo === 'Maquina') url = '/api/gestionMantenimiento/maquina';

      const res = await http.get(url);
      if (res.success) {
        // Mapeamos para el Select
        const lista = res.data.map(m => ({
          value: m.id.toString(),
          label: `${m.marca?.nombre || 'S/M'} ${m.modelo || m.tipoRemolque || ''} ${m.anio || ''}`
        }));
        setModelosDisponibles(lista);
      }
    } catch (error) {
      console.error(error);
      notifications.show({ title: 'Error', message: 'No se pudieron cargar los modelos', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const cargarSubsistemasYRecomendaciones = async () => {
    setLoading(true);
    try {
        // 1. Buscamos los Subsistemas definidos para este modelo
        // Usamos el endpoint que creamos: GET /api/gestionMantenimiento/subsistemas?plantillaId=X&tipo=Y
        // Si no lo tienes, puedes usar el endpoint de detalle del vehiculo/remolque
        
        let urlDetalle = '';
        if (form.values.tipoActivo === 'Vehiculo') urlDetalle = `/api/gestionMantenimiento/vehiculo/${form.values.plantillaId}`;
        // ... otros tipos ...

        // SIMULACIÓN: Asumimos que traemos los subsistemas. 
        // En tu implementación real, asegúrate de tener un endpoint que devuelva los subsistemas del modelo abstracto.
        // Aquí voy a hacer un fetch simulado a 'subsistemas' filtrando (necesitas ajustar esto a tu API real)
        const res = await http.get(`/api/gestionMantenimiento/subsistemas?plantillaId=${form.values.plantillaId}&tipo=${form.values.tipoActivo}`);
        
        if (res.success) {
            setSubsistemasPlantilla(res.data);
            
            // También cargamos consumibles recomendados o inventario general
            // Esto es ideal para el Select de "Qué le pongo"
            const resInv = await http.get('/api/inventario/consumibles'); // Trae todo el inventario
            if(resInv.success) {
                const stock = resInv.data.map(c => ({
                    value: c.id.toString(),
                    label: `${c.nombre} (Stock: ${c.stockActual})`,
                    disabled: c.stockActual <= 0,
                    ...c
                }));
                setConsumiblesCompatibles(stock);
            }
        }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const nextStep = () => setActive((current) => (current < 3 ? current + 1 : current));
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  // Manejador Final: SUBIR IMAGEN + CREAR ACTIVO
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
        let imageUrl = null;

        // 1. Subir Imagen a Vercel Blob (si existe)
        if (imagenFile) {
            const blob = await upload(imagenFile.name, imagenFile, {
                access: 'public',
                handleUploadUrl: '/api/upload', // Asegúrate de tener este helper o usa la url directa si tienes token
            });
            imageUrl = blob.url;
        }

        // 2. Preparar Payload
        const payload = {
            ...values,
            imagen: imageUrl,
            // Convertir IDs a números
            plantillaId: parseInt(values.plantillaId),
            instalacionesIniciales: values.instalacionesIniciales.map(i => ({
                subsistemaId: parseInt(i.subsistemaId),
                consumibleId: parseInt(i.consumibleId),
                fechaInstalacion: new Date()
            }))
        };

        // 3. Enviar a la API Centralizada
        const res = await http.post('/api/gestionMantenimiento/activos', payload);

        if (res.success) {
            notifications.show({ title: 'Éxito', message: 'Activo creado correctamente', color: 'green' });
            router.push(`/superuser/flota/activos/${res.data.id}`); // Redirigir al detalle
        } else {
            throw new Error(res.error || 'Error al guardar');
        }

    } catch (error) {
        console.error(error);
        notifications.show({ title: 'Error', message: error.message, color: 'red' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Stack gap="lg" p="md">
      <Group justify="space-between">
        <Title order={2}>Crear Nuevo Activo</Title>
        <Button variant="subtle" onClick={() => router.back()}>Cancelar</Button>
      </Group>

      <Paper p="xl" radius="md" withBorder>
        <LoadingOverlay visible={loading} />
        
        <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false}>
          <Stepper.Step label="Tipo" description="Categoría del activo">
            <Stack mt="xl" align="center">
              <Text size="lg" mb="md">¿Qué tipo de activo deseas registrar?</Text>
              <TipoSelector 
                value={form.values.tipoActivo} 
                onChange={(val) => {
                  form.setFieldValue('tipoActivo', val);
                  form.setFieldValue('plantillaId', ''); // Reset modelo si cambia tipo
                  nextStep();
                }} 
              />
            </Stack>
          </Stepper.Step>

          <Stepper.Step label="Modelo" description="Selección de plantilla">
             <Stack mt="xl" maxW={600} mx="auto">
                <Text>Selecciona el modelo base para este {form.values.tipoActivo?.toLowerCase()}:</Text>
                
                {modelosDisponibles.length > 0 ? (
                    <Select
                        label="Modelo / Plantilla"
                        placeholder="Buscar modelo (ej. Mack Granite)..."
                        data={modelosDisponibles}
                        searchable
                        nothingFoundMessage="No encontrado"
                        {...form.getInputProps('plantillaId')}
                    />
                ) : (
                    <Alert icon={<IconAlertCircle size={16}/>} color="orange" title="Sin Modelos">
                        No hay modelos creados para este tipo de activo. Debes crear uno primero.
                    </Alert>
                )}

                <Divider label="O" labelPosition="center" my="sm" />

                <Button 
                    variant="light" 
                    leftSection={<IconPlus size={18}/>}
                    onClick={() => setModalModeloOpen(true)}
                >
                    Crear Nuevo Modelo de {form.values.tipoActivo}
                </Button>
             </Stack>
          </Stepper.Step>

          <Stepper.Step label="Detalles" description="Datos específicos">
            <SimpleGrid cols={{ base: 1, sm: 2 }} mt="xl" spacing="xl">
                {/* COLUMNA IZQUIERDA: FORMULARIO */}
                <Stack>
                    <TextInput label="Código Interno" placeholder="ej. V-045" required {...form.getInputProps('codigoInterno')} />
                    <Select 
                        label="Estado Inicial" 
                        data={['Operativo', 'En Mantenimiento', 'Inactivo']} 
                        {...form.getInputProps('estado')} 
                    />
                    <TextInput label="Ubicación" placeholder="Base Principal" {...form.getInputProps('ubicacionActual')} />
                    
                    <Divider my="sm" label="Identificación" />
                    
                    <TextInput label="Placa / Patente" required {...form.getInputProps('placa')} />
                    <TextInput label="Serial Carrocería / VIN" {...form.getInputProps('serialCarroceria')} />
                    
                    {form.values.tipoActivo !== 'Remolque' && (
                         <TextInput label="Serial Motor" {...form.getInputProps('serialMotor')} />
                    )}

                    <Group grow>
                        <ColorInput label="Color" {...form.getInputProps('color')} />
                        <NumberInput label="Año" min={1980} max={2030} {...form.getInputProps('anioFabricacion')} />
                    </Group>

                    {form.values.tipoActivo === 'Vehiculo' && (
                        <NumberInput label="Kilometraje Inicial" suffix=" km" {...form.getInputProps('kilometrajeActual')} />
                    )}
                    
                    {(form.values.tipoActivo === 'Maquina' || form.values.tipoActivo === 'Vehiculo') && (
                        <NumberInput label="Horómetro Inicial" suffix=" hrs" {...form.getInputProps('horometroActual')} />
                    )}
                </Stack>

                {/* COLUMNA DERECHA: FOTO */}
                <Stack>
                    <Text fw={500} size="sm">Fotografía del Activo</Text>
                    <ImageDropzone 
                        value={imagenFile} 
                        onChange={setImagenFile} // Asumiendo que Dropzone devuelve el File
                        height={300}
                    />
                    {imagenFile && <Text size="xs" c="dimmed" align="center">Archivo listo para subir: {imagenFile.name}</Text>}
                </Stack>
            </SimpleGrid>
          </Stepper.Step>

          <Stepper.Step label="Configuración" description="Subsistemas iniciales">
            <Stack mt="xl">
                <Alert icon={<IconTool size={16}/>} title="Instalación Inicial de Componentes">
                    El modelo seleccionado tiene definidos los siguientes subsistemas. 
                    Si conoces qué consumibles (filtros, correas, baterías) tiene instalados actualmente, selecciónalos aquí.
                    Si no, puedes dejarlos vacíos e instalarlos luego.
                </Alert>

                {subsistemasPlantilla.length === 0 ? (
                    <Text c="dimmed" align="center" py="xl">Este modelo no tiene subsistemas definidos (Motor, Frenos, etc.). Puedes crearlos luego en "Editar Modelo".</Text>
                ) : (
                    <SimpleGrid cols={1} spacing="md">
                        {subsistemasPlantilla.map((sub) => {
                            // Buscar si ya seleccionamos algo para este subsistema
                            const instalacionActual = form.values.instalacionesIniciales.find(i => i.subsistemaId === sub.id);
                            
                            return (
                                <Group key={sub.id} p="sm" bg="gray.0" style={{ borderRadius: 8 }} justify="space-between">
                                    <Stack gap={0}>
                                        <Text fw={600}>{sub.nombre}</Text>
                                        <Text size="xs" c="dimmed">{sub.descripcion || 'Sin descripción'}</Text>
                                        {/* Aquí podrías mostrar la recomendación teórica si la trajiste del back */}
                                    </Stack>

                                    <Select 
                                        placeholder="Seleccionar pieza instalada..."
                                        data={consumiblesCompatibles} // Aquí deberías filtrar por tipo si tuvieras la metadata
                                        searchable
                                        clearable
                                        style={{ width: 300 }}
                                        value={instalacionActual?.consumibleId?.toString() || null}
                                        onChange={(val) => {
                                            const currentList = [...form.values.instalacionesIniciales];
                                            const index = currentList.findIndex(i => i.subsistemaId === sub.id);
                                            
                                            if (val) {
                                                const newItem = { subsistemaId: sub.id, consumibleId: val };
                                                if (index >= 0) currentList[index] = newItem;
                                                else currentList.push(newItem);
                                            } else {
                                                // Si limpia el select, removemos
                                                if (index >= 0) currentList.splice(index, 1);
                                            }
                                            form.setFieldValue('instalacionesIniciales', currentList);
                                        }}
                                    />
                                </Group>
                            );
                        })}
                    </SimpleGrid>
                )}
            </Stack>
          </Stepper.Step>

          <Stepper.Completed>
            <Stack align="center" mt="xl" gap="xl">
                <ThemeIcon size={80} radius="xl" color="green">
                    <IconCheck size={50} />
                </ThemeIcon>
                <Title order={3}>¡Todo listo!</Title>
                <Text c="dimmed" align="center" maxW={500}>
                    Estás a punto de crear el activo <b>{form.values.codigoInterno}</b> ({form.values.tipoActivo}).
                    Se generarán automáticamente las instancias de sus subsistemas y se registrará la instalación de {form.values.instalacionesIniciales.length} componentes iniciales.
                </Text>
                <Button size="lg" onClick={() => handleSubmit(form.values)} loading={loading}>
                    Confirmar y Crear Activo
                </Button>
            </Stack>
          </Stepper.Completed>
        </Stepper>

        {/* BOTONES DE NAVEGACIÓN (Solo si no está completado) */}
        {active < 4 && (
            <Group justify="right" mt="xl">
                {active > 0 && <Button variant="default" onClick={prevStep}>Atrás</Button>}
                {active < 3 && (
                    <Button onClick={() => {
                        // Validaciones manuales por paso
                        if(active === 0 && !form.values.tipoActivo) return form.validateField('tipoActivo');
                        if(active === 1 && !form.values.plantillaId) return form.validateField('plantillaId');
                        nextStep();
                    }}>
                        Siguiente
                    </Button>
                )}
                {active === 3 && (
                    <Button onClick={nextStep}>Finalizar Configuración</Button>
                )}
            </Group>
        )}
      </Paper>

      {/* MODAL PARA CREAR MODELO ON-THE-FLY */}
      <Modal 
        opened={modalModeloOpen} 
        onClose={() => setModalModeloOpen(false)}
        title={`Crear Nuevo Modelo de ${form.values.tipoActivo}`}
        size="lg"
      >
        <ModeloActivoForm 
            tipoPreseleccionado={form.values.tipoActivo}
            onSuccess={(nuevoModelo) => {
                // Callback mágico: Se cierra el modal y se selecciona el nuevo modelo
                cargarModelos().then(() => {
                    form.setFieldValue('plantillaId', nuevoModelo.id.toString());
                    setModalModeloOpen(false);
                    notifications.show({ message: 'Modelo creado y seleccionado', color: 'blue' });
                });
            }}
            onCancel={() => setModalModeloOpen(false)}
        />
      </Modal>

    </Stack>
  );
}