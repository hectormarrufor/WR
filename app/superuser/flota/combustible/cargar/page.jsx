'use client';

import { useState, useEffect } from 'react';
import { 
  Paper, Title, SimpleGrid, Select, NumberInput, 
  SegmentedControl, Switch, Button, Group, Text, 
  LoadingOverlay, Stack, Alert, Divider, ActionIcon,
  Card, ThemeIcon
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
  IconGasStation, IconBuildingWarehouse, IconCheck, 
  IconAlertCircle, IconDashboard, IconCurrencyDollar 
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

export default function CargarCombustiblePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activos, setActivos] = useState([]);
  const [tanquesInternos, setTanquesInternos] = useState([]);
  
  // Estado para guardar la data del activo seleccionado (para validaciones visuales)
  const [activoSeleccionado, setActivoSeleccionado] = useState(null);

  const form = useForm({
    initialValues: {
      activoId: '',
      fecha: new Date(),
      origen: 'externo', // 'externo' | 'interno'
      
      // Datos de Carga
      litros: '',
      fullTanque: true,
      
      // Contadores
      kilometrajeActual: '',
      horometroActual: '',
      
      // Solo si es Externo
      costoPorLitro: '',
      
      // Solo si es Interno
      consumibleId: null 
    },
    validate: {
      activoId: (val) => (!val ? 'Seleccione un activo' : null),
      litros: (val) => (val <= 0 ? 'Cantidad inválida' : null),
      kilometrajeActual: (val, values) => {
        if (!val) return 'Requerido';
        // Validación Frontend: No permitir bajar kilometraje
        if (activoSeleccionado && val < activoSeleccionado.kmActual) {
          return `No puede ser menor al actual (${activoSeleccionado.kmActual} km)`;
        }
        return null;
      },
      consumibleId: (val, values) => (values.origen === 'interno' && !val ? 'Seleccione el tanque origen' : null),
    }
  });

  // 1. Cargar Lista de Activos
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Asumo que tienes un endpoint que lista activos vehiculares
        const res = await fetch('/api/gestionMantenimiento/activos?tipo=Vehiculo'); 
        const data = await res.json();
        
        if (data.success || Array.isArray(data)) {
            const lista = data.data || data; // Ajustar según tu respuesta API
            setActivos(lista.map(a => ({
                value: a.id.toString(),
                label: `${a.codigoInterno} - ${a.placa || 'Sin Placa'}`,
                // Guardamos meta-datos para validaciones
                kmActual: a.VehiculoInstancia?.kilometrajeActual || 0,
                hrActual: a.VehiculoInstancia?.horometroActual || 0,
                modelo: a.VehiculoInstancia?.ModeloVehiculo?.modelo || 'Desconocido'
            })));
        }
      } catch (error) {
        console.error("Error cargando activos", error);
        notifications.show({ title: 'Error', message: 'No se pudieron cargar los activos', color: 'red' });
      }
    };
    fetchData();
  }, []);

  // 2. Cargar Inventario de Combustible (Solo si selecciona Interno)
  useEffect(() => {
    if (form.values.origen === 'interno' && tanquesInternos.length === 0) {
      const fetchTanques = async () => {
        try {
          // Buscamos consumibles que sean categoría combustible
          const res = await fetch('/api/inventario/consumibles?categoria=combustible');
          const data = await res.json();
          const items = data.items || data.data || [];
          
          setTanquesInternos(items.map(t => ({
            value: t.id.toString(),
            label: `${t.nombre} (Stock: ${t.stockAlmacen} Lts)`,
            stock: t.stockAlmacen
          })));
        } catch (error) {
          console.error(error);
        }
      };
      fetchTanques();
    }
  }, [form.values.origen]);

  // Handler al cambiar activo para actualizar pistas visuales
  const handleActivoChange = (val) => {
    form.setFieldValue('activoId', val);
    const selected = activos.find(a => a.value === val);
    if (selected) {
        setActivoSeleccionado(selected);
        // Pre-llenamos con el actual para facilitar
        form.setFieldValue('kilometrajeActual', selected.kmActual);
        form.setFieldValue('horometroActual', selected.hrActual);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
        // Preparamos payload
        const payload = {
            activoId: parseInt(values.activoId),
            fecha: values.fecha,
            litros: parseFloat(values.litros),
            fullTanque: values.fullTanque,
            kilometrajeActual: parseFloat(values.kilometrajeActual),
            horometroActual: values.horometroActual ? parseFloat(values.horometroActual) : null,
            origen: values.origen,
        };

        if (values.origen === 'externo') {
            // Calculamos Costo Total para el backend
            // Backend espera costoTotal, aquí pedimos por litro por comodidad
            const costoUnitario = parseFloat(values.costoPorLitro || 0);
            payload.costoTotal = costoUnitario * payload.litros;
        } else {
            // Interno
            payload.consumibleId = parseInt(values.consumibleId);
        }

        const res = await fetch('/api/gestionMantenimiento/combustible', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (result.success) {
            notifications.show({ 
                title: 'Carga Exitosa', 
                message: `Rendimiento: ${result.data.rendimiento}`, 
                color: 'green',
                icon: <IconCheck size={18} />
            });
            // Resetear form o redirigir
            form.reset();
            setActivoSeleccionado(null);
            // router.push('/superuser/flota/combustible'); // Opcional
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        notifications.show({ title: 'Error', message: error.message, color: 'red' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Stack maxW={800} mx="auto">
      <Title order={2} mb="md">Registrar Carga de Gasoil</Title>
      
      <Paper p="xl" radius="md" withBorder pos="relative">
        <LoadingOverlay visible={loading} />
        
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
            
            {/* SECCIÓN 1: DATOS BÁSICOS */}
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <Select 
                    label="Vehículo / Activo"
                    placeholder="Buscar por placa o código..."
                    data={activos}
                    searchable
                    nothingFoundMessage="No encontrado"
                    {...form.getInputProps('activoId')}
                    onChange={handleActivoChange}
                />
                <DateInput 
                    label="Fecha y Hora"
                    {...form.getInputProps('fecha')}
                />
            </SimpleGrid>

            {/* INFO VISUAL DEL ACTIVO (Km Anterior) */}
            {activoSeleccionado && (
                <Alert icon={<IconDashboard size={16}/>} title="Odómetro Actual en Sistema" color="blue" variant="light">
                    <Group gap="xl">
                        <Text size="sm"><b>KM Actual:</b> {activoSeleccionado.kmActual} km</Text>
                        {activoSeleccionado.hrActual > 0 && <Text size="sm"><b>Horómetro:</b> {activoSeleccionado.hrActual} hrs</Text>}
                    </Group>
                </Alert>
            )}

            <Divider label="Datos de Lectura" labelPosition="center" />

            {/* SECCIÓN 2: LECTURAS */}
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <NumberInput 
                    label="Nuevo Kilometraje"
                    placeholder="Lectura del tablero"
                    suffix=" km"
                    thousandSeparator
                    min={0}
                    {...form.getInputProps('kilometrajeActual')}
                />
                <NumberInput 
                    label="Nuevo Horómetro (Opcional)"
                    placeholder="Si aplica"
                    suffix=" hrs"
                    min={0}
                    {...form.getInputProps('horometroActual')}
                />
            </SimpleGrid>

            <Divider label="Datos del Combustible" labelPosition="center" />

            {/* SECCIÓN 3: ORIGEN Y CANTIDAD */}
            <Card withBorder bg="gray.0" p="md">
                <Stack>
                    <Group justify="space-between">
                        <Text fw={500} size="sm">Origen del Gasoil</Text>
                        <SegmentedControl 
                            data={[
                                { label: 'Estación de Servicio (Externo)', value: 'externo' },
                                { label: 'Tanque Empresa (Interno)', value: 'interno' }
                            ]}
                            {...form.getInputProps('origen')}
                            color="blue"
                        />
                    </Group>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} mt="sm">
                        <NumberInput 
                            label="Litros Cargados"
                            placeholder="0.00"
                            suffix=" L"
                            decimalScale={2}
                            min={0}
                            required
                            size="md"
                            {...form.getInputProps('litros')}
                        />

                        {/* CONDICIONAL: EXTERNO VS INTERNO */}
                        {form.values.origen === 'externo' ? (
                            <NumberInput 
                                label="Costo por Litro ($)"
                                placeholder="0.50"
                                prefix="$ "
                                decimalScale={3}
                                min={0}
                                size="md"
                                {...form.getInputProps('costoPorLitro')}
                                rightSection={
                                    form.values.litros && form.values.costoPorLitro ? (
                                        <Text size="xs" c="dimmed" mr="md">
                                            Total: ${(form.values.litros * form.values.costoPorLitro).toFixed(2)}
                                        </Text>
                                    ) : null
                                }
                                rightSectionWidth={100}
                            />
                        ) : (
                            <Select 
                                label="Tanque de Origen"
                                placeholder="Seleccionar tanque..."
                                data={tanquesInternos}
                                size="md"
                                leftSection={<IconBuildingWarehouse size={16}/>}
                                {...form.getInputProps('consumibleId')}
                            />
                        )}
                    </SimpleGrid>

                    <Switch 
                        label="¿Tanque Full?"
                        description="Activar si se llenó por completo (Vital para calcular Km/L)"
                        size="md"
                        mt="xs"
                        {...form.getInputProps('fullTanque', { type: 'checkbox' })}
                    />
                </Stack>
            </Card>

            <Group justify="flex-end" mt="xl">
                <Button variant="default" onClick={() => router.back()}>Cancelar</Button>
                <Button 
                    type="submit" 
                    size="md" 
                    leftSection={<IconGasStation size={20}/>}
                    color="blue"
                >
                    Registrar Carga
                </Button>
            </Group>

          </Stack>
        </form>
      </Paper>
    </Stack>
  );
}