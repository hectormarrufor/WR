// app/superuser/flota/activos/crear/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Stepper, Button, Group, Title, Paper, Text,
  SimpleGrid, UnstyledButton, rem, ThemeIcon,
  Select, Modal, Stack, Divider, Alert, Loader, Center
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconTruck, IconTruckLoading, IconBackhoe,
  IconPlus, IconAlertCircle,
  IconBuilding
} from '@tabler/icons-react';

// IMPORTA TU NUEVO COMPONENTE
import ModeloActivoForm from '../../modelos/components/ModeloActivoForm';
import ActivoForm from '../components/ActivoForm';

// Componente visual para seleccionar tipo
const TipoSelector = ({ value, onChange }) => {
  const tipos = [
    { id: 'Vehiculo', label: 'Vehículo', icon: IconTruck, desc: 'Camiones, Chutos, Vans' },
    { id: 'Remolque', label: 'Remolque', icon: IconTruckLoading, desc: 'Bateas, Lowboys, Cisternas' },
    { id: 'Maquina', label: 'Máquina', icon: IconBackhoe, desc: 'Retroexcavadoras, Taladros' },
    { id: 'Inmueble', label: 'Inmueble', icon: IconBuilding, desc: 'Edificios, Terrenos' },
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
          <Text align="center" size="sm" c="dimmed" mt="xs">{item.desc}</Text>
        </UnstyledButton>
      ))}
    </SimpleGrid>
  );
};

export default function CrearActivoPage() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalModeloOpen, setModalModeloOpen] = useState(false);
  const [modelosDisponibles, setModelosDisponibles] = useState([]);

  const [matricesCostos, setMatricesCostos] = useState([]);
  const [matricesRaw, setMatricesRaw] = useState([]);

  // --- 1. CARGAR MATRICES DE COSTO AL INICIAR ---
  useEffect(() => {
    const fetchMatrices = async () => {
        try {
            const res = await fetch('/api/configuracion/matriz');
            const data = await res.json();
            if (Array.isArray(data)) {
                setMatricesRaw(data); // <--- GUARDAMOS LA DATA CRUDA
                
                const lista = data.map(m => ({ 
                    value: String(m.id), 
                    label: `${m.nombre} (${m.tipoActivo || 'General'}) - $${m.costoKm || 0}/km` // Tip visual
                }));
                setMatricesCostos(lista);
            }
        } catch (error) {
            console.error("Error cargando matrices:", error);
        }
    };
    fetchMatrices();
  }, []);
  
  // ESTADO NUEVO: Almacena la plantilla completa (con subsistemas)
  const [modeloFullData, setModeloFullData] = useState(null);

  // El form del padre SOLO maneja el contexto inicial
  const form = useForm({
    initialValues: {
      tipoActivo: '',
      plantillaId: '',
    },
    validate: {
      tipoActivo: (value) => !value ? 'Seleccione un tipo' : null,
      plantillaId: (value) => !value ? 'Seleccione un modelo' : null,
    }
  });

  // Efecto: Cargar Lista de Modelos cuando cambia el Tipo
  useEffect(() => {
    if (form.values.tipoActivo && active === 1) {
      cargarListaModelos();
    }
  }, [form.values.tipoActivo, active]);

  const cargarListaModelos = async () => {
    setLoading(true);
    try {
      let url = '';
      if (form.values.tipoActivo === 'Vehiculo') url = '/api/gestionMantenimiento/vehiculo';
      else if (form.values.tipoActivo === 'Remolque') url = '/api/gestionMantenimiento/remolque';
      else if (form.values.tipoActivo === 'Maquina') url = '/api/gestionMantenimiento/maquina';

      const response = await fetch(url);
      const res = await response.json();

      if (res.success) {
        // Asumimos que la respuesta trae la lista de modelos
        const dataList = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        const lista = dataList.map(m => ({
          value: m.id.toString(),
          label: `${m.marca || 'S/M'} ${m.modelo || m.tipoRemolque || ''} ${m.anio || ''}`
        }));
        setModelosDisponibles(lista);
      } else {
        setModelosDisponibles([]);
      }
    } catch (error) {
      console.error(error);
      notifications.show({ title: 'Error', message: 'Error cargando modelos', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  // Lógica CRÍTICA: Fetchear el modelo completo antes de pasar al paso 2
  const fetchModeloCompleto = async () => {
    setLoading(true);
    try {
      // Necesitamos un endpoint que traiga el modelo CON sus subsistemas
      const res = await fetch(`/api/gestionMantenimiento/${form.values.tipoActivo.toLowerCase()}/${form.values.plantillaId}`);
      const result = await res.json();
      console.log('Modelo completo fetch:', result);
      
      if (result.success) {
        setModeloFullData(result.data);
        // Solo avanzamos si tenemos la data
        setActive(2); 
      } else {
        notifications.show({ title: 'Error', message: 'No se pudo cargar la plantilla detallada', color: 'red' });
      }
    } catch (error) {
      console.error(error);
      notifications.show({ title: 'Error', message: 'Error de conexión', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
     if (active === 0) {
         if (!form.values.tipoActivo) return form.validateField('tipoActivo');
         setActive(1);
     } else if (active === 1) {
         if (!form.values.plantillaId) return form.validateField('plantillaId');
         // Aquí interceptamos: No hacemos setActive(2) directo, primero cargamos datos
         fetchModeloCompleto();
     }
  };

  const handlePrev = () => {
    setActive((curr) => (curr > 0 ? curr - 1 : curr));
  };


  return (
    <Paper>
      <Stack gap="lg" p="md">
        <Group justify="space-between">
          <Title order={2}>Crear Nuevo Activo</Title>
          <Button variant="subtle" onClick={() => router.back()}>Cancelar</Button>
        </Group>

        <Paper p="xl" radius="md" withBorder>
          
          {/* USAMOS EL STEPPER DEL PADRE SOLO PARA LA SELECCIÓN DE CONTEXTO */}
          <Stepper active={active} onStepClick={null} allowNextStepsSelect={false}>
            <Stepper.Step label="Tipo" description="Categoría del activo">
              <Stack mt="xl" align="center">
                <Text size="lg" mb="md">¿Qué tipo de activo deseas registrar?</Text>
                <TipoSelector
                  value={form.values.tipoActivo}
                  onChange={(val) => {
                    form.setFieldValue('tipoActivo', val);
                    form.setFieldValue('plantillaId', '');
                  }}
                />
              </Stack>
            </Stepper.Step>

            <Stepper.Step label="Modelo" description="Selección de plantilla">
              <Stack mt="xl" maxW={600} mx="auto">
                <Text>Selecciona el modelo base para este {form.values.tipoActivo?.toLowerCase()}:</Text>
                
                {loading ? <Center><Loader /></Center> : (
                    modelosDisponibles.length > 0 ? (
                    <Select
                        label="Modelo / Plantilla"
                        placeholder="Buscar modelo..."
                        data={modelosDisponibles}
                        searchable
                        nothingFoundMessage="No encontrado"
                        {...form.getInputProps('plantillaId')}
                    />
                    ) : (
                    <Alert icon={<IconAlertCircle size={16} />} color="orange" title="Sin Modelos">
                        No hay modelos creados. Debes crear uno primero.
                    </Alert>
                    )
                )}

                <Divider label="O" labelPosition="center" my="sm" />
                <Button variant="light" leftSection={<IconPlus size={18} />} onClick={() => setModalModeloOpen(true)}>
                  Crear Nuevo Modelo
                </Button>
              </Stack>
            </Stepper.Step>

            {/* PASO 3: AQUÍ INSERTAMOS TU COMPONENTE ACTIVOFORM */}
            <Stepper.Step label="Detalles y Configuración" description="Finalizar">
                {active === 2 && modeloFullData && (
                    <div style={{ marginTop: '2rem' }}>
                        <ActivoForm 
                            plantilla={modeloFullData}
                            tipoActivo={form.values.tipoActivo}
                            matricesCostos={matricesCostos}
                            matricesRaw={matricesRaw}
                            onCancel={handlePrev} // Para que el botón "Atrás" del hijo controle al padre
                        />
                    </div>
                )}
            </Stepper.Step>
          </Stepper>

          {/* BOTONES DE NAVEGACIÓN DEL PADRE (SOLO VISIBLES EN PASOS 0 y 1) */}
          {active < 2 && (
            <Group justify="right" mt="xl">
              {active > 0 && <Button variant="default" onClick={handlePrev}>Atrás</Button>}
              <Button onClick={handleNext} loading={loading}>Siguiente</Button>
            </Group>
          )}

        </Paper>

        <Modal opened={modalModeloOpen} fullScreen onClose={() => setModalModeloOpen(false)} title="Definir Nuevo Modelo">
          <ModeloActivoForm
            tipoPreseleccionado={form.values.tipoActivo}
            onSuccess={(nuevoModelo) => {
              cargarListaModelos().then(() => {
                form.setFieldValue('plantillaId', nuevoModelo.id.toString());
                setModalModeloOpen(false);
              });
            }}
            onCancel={() => setModalModeloOpen(false)}
          />
        </Modal>

      </Stack>
    </Paper>
  );
}