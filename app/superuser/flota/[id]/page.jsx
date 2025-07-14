'use client';

import {
  Paper,
  Title,
  SimpleGrid,
  Text,
  Divider,
  Group,
  Image,
  Flex,
  Badge,
  Button,
  Box,
  Collapse,
  List,
  ThemeIcon,
  Accordion,
  Stack,
} from '@mantine/core';
import { useEffect, useRef, useState, useMemo, use } from 'react';
import { useRouter, notFound } from 'next/navigation';
import * as html2pdf from 'html2pdf.js';
import BackButton from '../../../components/BackButton';
import { useMediaQuery } from '@mantine/hooks';
import { httpGet } from '../../../ApiFunctions/httpServices';
import CambioAceiteModal from './CambioAceiteModal';
import {
  IconCircleCheck,
  IconCircleDot,
  IconCircleX,
  IconAlertCircle,
  IconCalendarEvent,
  IconGauge,
  IconClockHour4,
  IconTools,
  IconInfoCircle,
  IconCar,
  IconListDetails,
  IconClipboardList,
  IconEngine,
  IconTyre,
  IconGasStation,
  IconGears,
  IconTool,
  IconCarCrane,
  IconTransfer,
  IconWheel,
} from '@tabler/icons-react';

// Helper para calcular promedios y estimaciones
const calculateMetrics = (kilometrajes, currentKm) => {
  if (!kilometrajes || kilometrajes.length < 2) {
    return {
      kmToday: 0,
      avgKm7Days: 0,
      avgKm30Days: 0,
    };
  }

  const sortedKm = [...kilometrajes].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  // Kilometraje de hoy
  let kmToday = 0;
  if (sortedKm.length > 1) {
    const latestKmEntry = sortedKm[sortedKm.length - 1];
    const secondLatestKmEntry = sortedKm[sortedKm.length - 2];
    const latestDate = new Date(latestKmEntry.fecha);
    const secondLatestDate = new Date(secondLatestKmEntry.fecha);
    if (latestDate.toDateString() === new Date().toDateString() && secondLatestDate.toDateString() === new Date(latestDate.getTime() - 24 * 60 * 60 * 1000).toDateString()) {
      kmToday = latestKmEntry.kilometraje - secondLatestKmEntry.kilometraje;
    } else if (latestDate.toDateString() === new Date().toDateString()) {
        kmToday = 0;
    }
  }

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const kmDataLast7Days = sortedKm.filter(k => new Date(k.fecha) >= sevenDaysAgo);
  const kmDataLast30Days = sortedKm.filter(k => new Date(k.fecha) >= thirtyDaysAgo);

  const calculateAvg = (data) => {
    if (data.length < 2) return 0;
    const firstKm = data[0].kilometraje;
    const lastKm = data[data.length - 1].kilometraje;
    const firstDate = new Date(data[0].fecha);
    const lastDate = new Date(data[data.length - 1].fecha);
    const diffDays = Math.max(1, Math.ceil(Math.abs(lastDate - firstDate) / (1000 * 60 * 60 * 24)));
    return (lastKm - firstKm) / diffDays;
  };

  const avgKm7Days = calculateAvg(kmDataLast7Days);
  const avgKm30Days = calculateAvg(kmDataLast30Days);

  return { kmToday, avgKm7Days, avgKm30Days };
};

// Helper para capitalizar y formatear claves de objetos
const formatKey = (key) => {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
};

export default function VehiculoPage({ params }) {
  const [cambioAceiteModal, setCambioAceiteModal] = useState(false);
  const router = useRouter();
  const pdfRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const { id } = use(params);
  const [vehiculo, setVehiculo] = useState(null);
  const [showFichaTecnica, setShowFichaTecnica] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVehiculoData = async () => {
      try {
        setLoading(true);
        const data = await httpGet(`/api/vehiculos/${id}`);
        if (!data) {
          throw new Error('Vehículo no encontrado');
        }
        setVehiculo(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching vehicle data:', err);
        // notFound();
      } finally {
        setLoading(false);
      }
    };
    fetchVehiculoData();
  }, [id]);

  const { kmToday, avgKm7Days, avgKm30Days } = useMemo(() => {
    if (!vehiculo || !vehiculo.kilometrajes) {
      return { kmToday: 0, avgKm7Days: 0, avgKm30Days: 0 };
    }
    return calculateMetrics(vehiculo.kilometrajes, vehiculo.kilometraje);
  }, [vehiculo]);

  const estimatedNextOilChange = useMemo(() => {
    if (!vehiculo?.fichaTecnica?.motor?.aceite?.intervaloCambioKm || !vehiculo?.fichaTecnica?.motor?.aceite?.ultimoCambioKm || avgKm30Days <= 0) {
      return { km: 'N/A', days: 'N/A' };
    }

    const { intervaloCambioKm, ultimoCambioKm } = vehiculo.fichaTecnica.motor.aceite;
    const currentKm = vehiculo.kilometraje;

    const kmRemaining = (parseFloat(ultimoCambioKm) + parseFloat(intervaloCambioKm)) - parseFloat(currentKm);

    if (kmRemaining <= 0) {
      return { km: 'Cambio requerido', days: 'Cambio requerido' };
    }

    const daysRemaining = kmRemaining / avgKm30Days;
    const nextChangeDate = new Date();
    nextChangeDate.setDate(nextChangeDate.getDate() + daysRemaining);

    return {
      km: `${kmRemaining.toFixed(0)} km restantes`,
      days: `${daysRemaining.toFixed(0)} días (aprox. ${nextChangeDate.toLocaleDateString('es-VE', { year: 'numeric', month: '2-digit', day: '2-digit' })})`,
    };
  }, [vehiculo, avgKm30Days]);

  const exportToPDF = () => {
    const opt = {
      margin: 0.3,
      filename: `Reporte_${vehiculo.placa}_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 1.5, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    };
    html2pdf().set(opt).from(pdfRef.current).save();
  };

  if (loading) {
    return <Paper p="md" mt={90} mx={20} shadow="md">Cargando información del vehículo...</Paper>;
  }

  if (error) {
    return <Paper p="md" mt={90} mx={20} shadow="md">Error: {error}</Paper>;
  }

  if (!vehiculo) {
    return null;
  }

  const pendingHallazgos = vehiculo.inspecciones?.flatMap(inspeccion =>
    inspeccion.hallazgos?.filter(hallazgo => !hallazgo.resuelto && !hallazgo.completado)
  ) || [];

  const handleMantenimiento = () => {
    router.push(`/superuser/flota/${id}/mantenimiento`);
  };

  const renderObjectDetails = (obj, isNested = false) => {
    if (!obj || typeof obj !== 'object') {
      return <Text color="dimmed" fs="italic">{isNested ? 'No disponible' : 'Información no disponible'}</Text>;
    }

    const itemsToRender = Object.entries(obj).map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return (
          <Box key={key} p="sm" style={{ borderLeft: '3px solid var(--mantine-color-blue-3)', paddingLeft: '10px' }}>
            <Text size="sm" fw={700} mb={5} c="blue.7">{formatKey(key)}:</Text>
            {renderObjectDetails(value, true)}
          </Box>
        );
      } else {
        return (
          <Text key={key} size="sm">
            <Text fw={600} span>{formatKey(key)}:</Text>{' '}
            {String(value)}
          </Text>
        );
      }
    });

    return (
      <SimpleGrid
        cols={{ base: 1, xs: 2, sm: 2, md: 3 }}
        spacing="md"
        verticalSpacing="sm"
        mt={isNested ? 0 : 'sm'}
      >
        {itemsToRender}
      </SimpleGrid>
    );
  };

  return (
    <>
      <CambioAceiteModal opened={cambioAceiteModal} onClose={() => setCambioAceiteModal(false)} vehiculo={vehiculo} />
      <Paper px={isMobile ? 0 : 100} py={30} mt={90} mx={isMobile ? 0 : 20} shadow="md" radius="lg">
        <Group position="right" mb="xl" grow={isMobile}>
          <Flex justify="space-between" wrap="wrap" w="100%" gap="md">
            <BackButton onClick={() => router.push('/superuser/flota')} />
            <Button leftSection={<IconClipboardList size={18} />} color="blue" onClick={() => router.push(`/superuser/flota/${id}/nuevaInspeccion`)}>
              Nueva Inspección
            </Button>
            <Button leftSection={<IconTools size={18} />} color="teal" onClick={handleMantenimiento}>
              Realizar Mantenimientos
            </Button>
            <Button leftSection={<IconListDetails size={18} />} color="grape" onClick={() => setShowFichaTecnica(!showFichaTecnica)}>
              {showFichaTecnica ? 'Ocultar Ficha Técnica' : 'Mostrar Ficha Técnica'}
            </Button>
            <Button leftSection={<IconCalendarEvent size={18} />} color="orange" onClick={() => setCambioAceiteModal(true)}>
              Registrar Cambio de Aceite
            </Button>
            {!isMobile && <Button leftSection={<IconInfoCircle size={18} />} color="dark" onClick={exportToPDF}>Generar Reporte PDF</Button>}
          </Flex>
        </Group>

        <Box ref={pdfRef} p="md">
          <Title order={2} mb="xl" align="center" style={{ color: '#228BE6' }}>
            <Group position="center" spacing="sm">
              <IconCar size={32} />
              Detalle del Vehículo: {vehiculo.marca} {vehiculo.modelo} ({vehiculo.placa})
            </Group>
          </Title>
          <Divider my="md" />

          {/* Sección de Información General y Rendimiento */}
          <Paper shadow="xs" p="xl" radius="md" mb="xl" withBorder>
            <Title order={3} align="center" mb="md" c="blue.7">Información General y Rendimiento</Title>
            <Flex direction={isMobile ? 'column' : 'row'} gap="xl" align="center" justify="space-around">
              <SimpleGrid
                cols={isMobile ? 1 : 2}
                spacing="md"
                breakpoints={[{ maxWidth: 'sm', cols: 1 }]}
                style={{ flex: 1 }}
              >
                <Text size="md"><strong>Marca:</strong> {vehiculo.marca}</Text>
                <Text size="md"><strong>Modelo:</strong> {vehiculo.modelo}</Text>
                <Text size="md"><strong>Placa:</strong> {vehiculo.placa}</Text>
                <Text size="md"><strong>Año:</strong> {vehiculo.ano}</Text>
                <Text size="md"><strong>Color:</strong> {vehiculo.color}</Text>
                <Text size="md"><strong>VIN:</strong> {vehiculo.vin}</Text>
                <Group spacing="xs">
                  <Text size="md"><strong>Kilometraje Actual:</strong></Text>
                  <Badge leftSection={<IconGauge size={14} />} variant="light" color="blue" size="lg">{vehiculo.kilometraje} km</Badge>
                </Group>
                <Group spacing="xs">
                  <Text size="md"><strong>Horómetro Actual:</strong></Text>
                  <Badge leftSection={<IconClockHour4 size={14} />} variant="light" color="indigo" size="lg">{vehiculo.horometro} horas</Badge>
                </Group>

                {/* ELIMINADO: Estado Operativo General de la ficha del vehículo */}
                {/* <Group spacing="xs">
                  <Text size="md"><strong>Estado Operativo General:</strong></Text>
                  <Badge
                    color={
                      vehiculo.estadoOperativoGeneral === 'Operativo' ? 'green' :
                      vehiculo.estadoOperativoGeneral === 'Operativo con Advertencias' ? 'yellow' :
                      vehiculo.estadoOperativoGeneral === 'No Operativo' ? 'red' :
                      'gray'
                    }
                    size="lg"
                    radius="sm"
                  >
                    {vehiculo.estadoOperativoGeneral}
                  </Badge>
                </Group> */}

                <Text size="md"><strong>Kilómetros recorridos hoy:</strong> {kmToday.toFixed(0)} km</Text>
                <Text size="md"><strong>Promedio KM (últimos 7 días):</strong> {avgKm7Days.toFixed(2)} km/día</Text>
                <Text size="md"><strong>Promedio KM (últimos 30 días):</strong> {avgKm30Days.toFixed(2)} km/día</Text>
                <Text size="md" c={estimatedNextOilChange.km === 'Cambio requerido' ? 'red' : 'blue'}>
                  <strong>Próximo Cambio de Aceite (KM):</strong> {estimatedNextOilChange.km}
                </Text>
                <Text size="md" c={estimatedNextOilChange.days === 'Cambio requerido' ? 'red' : 'blue'}>
                  <strong>Próximo Cambio de Aceite (Fecha Estimada):</strong> {estimatedNextOilChange.days}
                </Text>
              </SimpleGrid>
              <Image
                src={vehiculo.imagen}
                fit="contain"
                alt={`Imagen del vehículo ${vehiculo.modelo}`}
                height={isMobile ? 200 : 250}
                w={isMobile ? '100%' : 250}
                mt={isMobile ? 'md' : 0}
                radius="md"
                crossOrigin="anonymous"
              />
            </Flex>

            {/* AÑADIDO/MOVIDO: Detalles del Estado de Cada Sistema (última inspección) */}
            {vehiculo.inspecciones && vehiculo.inspecciones.length > 0 && vehiculo.inspecciones[0].estadoSistemas && (
              <Box mt="xl"> {/* Agregamos un margen superior para separarlo de la información general */}
                <Divider my="md" />
                <Title order={4} align="center" mb="md" c="blue.7">Estado Actual de los Sistemas (Última Inspección)</Title>
                <Accordion defaultValue={Object.keys(vehiculo.inspecciones[0].estadoSistemas)[0]} chevronPosition="right" variant="filled"> {/* Usamos variant="filled" para un look más destacado */}
                  {Object.entries(vehiculo.inspecciones[0].estadoSistemas).map(([sistema, estado], index) => (
                    <Accordion.Item value={sistema} key={index}>
                      <Accordion.Control icon={
                        estado === 'Operativo' ? <IconCircleCheck style={{ color: 'green' }} /> :
                        estado === 'Advertencia' ? <IconAlertCircle style={{ color: 'orange' }} /> :
                        estado === 'Fallo Crítico' ? <IconCircleX style={{ color: 'red' }} /> :
                        <IconCircleDot style={{ color: 'gray' }} />
                      }>
                        <Text fw={500}>{formatKey(sistema)}</Text>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Text>Estado: <Badge color={
                          estado === 'Operativo' ? 'green' :
                          estado === 'Advertencia' ? 'orange' :
                          estado === 'Fallo Crítico' ? 'red' :
                          'gray'
                        } variant="light">{estado}</Badge></Text>
                        {/* Si tu modelo EstadoSistemaVehiculo tuviera 'notas' aquí, se podría mostrar: */}
                        {/* vehiculo.inspecciones[0].estadoSistemas[sistema].notas &&
                          <Text mt="xs" size="sm" color="dimmed">Notas: {vehiculo.inspecciones[0].estadoSistemas[sistema].notas}</Text>
                        */}
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </Box>
            )}
          </Paper>

          {/* Hallazgos de Inspecciones Anteriores (sin cambios) */}
          {pendingHallazgos.length > 0 && (
            <Paper shadow="xs" p="xl" radius="md" mb="xl" withBorder>
              <Title order={3} align="center" mb="md" c="red.7">Hallazgos Pendientes de Inspecciones</Title>
              <List spacing="xs" size="sm" center icon={<ThemeIcon color="red" size={24} radius="xl"><IconAlertCircle style={{ width: '80%', height: '80%' }} /></ThemeIcon>}>
                {pendingHallazgos.map((hallazgo, index) => (
                  <List.Item key={index}>
                    <Text>
                      <Text fw={700} span>{hallazgo.descripcion}</Text>{' '}
                      (Reportado en inspección del{' '}
                      {new Date(hallazgo.Inspeccion.fecha).toLocaleDateString('es-VE', { year: 'numeric', month: '2-digit', day: '2-digit' })} -{' '}
                      <Text fw={700} span>Sistema: {formatKey(hallazgo.sistemaAfectado)}</Text>)
                    </Text>
                  </List.Item>
                ))}
              </List>
            </Paper>
          )}

          {/* Ficha Técnica (Colapsable con Accordion anidado - usando el renderObjectDetails mejorado) */}
          <Collapse in={showFichaTecnica} transitionDuration={300} transitionTimingFunction="ease-in-out">
            {vehiculo.fichaTecnica ? (
              <Paper shadow="xs" p="xl" radius="md" mb="xl" withBorder>
                <Divider my="md" />
                <Title order={3} align="center" mb="md" c="grape.7">Detalles de Ficha Técnica</Title>
                {/* Propiedades de alto nivel de la ficha técnica que no son objetos */}
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" mb="xl">
                    <Text size="md"><strong>Ejes:</strong> {vehiculo.fichaTecnica.ejes}</Text>
                    <Text size="md"><strong>Tipo de Vehículo:</strong> {vehiculo.fichaTecnica.tipo}</Text>
                    <Text size="md"><strong>Tipo de Peso:</strong> {vehiculo.fichaTecnica.tipoPeso}</Text>
                    <Text size="md"><strong>Tipo de Combustible Principal:</strong> {vehiculo.fichaTecnica.tipoCombustible}</Text>
                </SimpleGrid>

                <Accordion defaultValue="motor" chevronPosition="right" variant="separated">
                  {/* Motor */}
                  <Accordion.Item value="motor">
                    <Accordion.Control icon={<IconEngine style={{ color: '#E64980' }} />}>
                      <Text fw={500}>Motor</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {/* Aquí usamos el renderObjectDetails mejorado */}
                      {renderObjectDetails(vehiculo.fichaTecnica.motor)}
                    </Accordion.Panel>
                  </Accordion.Item>

                  {/* Correas */}
                  <Accordion.Item value="correas">
                    <Accordion.Control icon={<IconTool style={{ color: '#FAB005' }} />}>
                      <Text fw={500}>Correas</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {renderObjectDetails(vehiculo.fichaTecnica.correas)}
                    </Accordion.Panel>
                  </Accordion.Item>

                  {/* Neumáticos */}
                  <Accordion.Item value="neumaticos">
                    <Accordion.Control icon={<IconWheel style={{ color: '#1098AD' }} />}>
                      <Text fw={500}>Neumáticos</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {renderObjectDetails(vehiculo.fichaTecnica.neumaticos)}
                    </Accordion.Panel>
                  </Accordion.Item>

                  {/* Combustible */}
                  <Accordion.Item value="combustible">
                    <Accordion.Control icon={<IconGasStation style={{ color: '#82C91E' }} />}>
                      <Text fw={500}>Combustible</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {renderObjectDetails(vehiculo.fichaTecnica.combustible)}
                    </Accordion.Panel>
                  </Accordion.Item>

                  {/* Transmisión */}
                  <Accordion.Item value="transmision">
                    <Accordion.Control icon={<IconTransfer style={{ color: '#FD7E14' }} />}>
                      <Text fw={500}>Transmisión</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {renderObjectDetails(vehiculo.fichaTecnica.transmision)}
                    </Accordion.Panel>
                  </Accordion.Item>

                  {/* Carrocería */}
                  <Accordion.Item value="carroceria">
                    <Accordion.Control icon={<IconCarCrane style={{ color: '#6741D9' }} />}>
                      <Text fw={500}>Carrocería</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {renderObjectDetails(vehiculo.fichaTecnica.carroceria)}
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </Paper>
            ) : (
              <Text align="center" color="dimmed" mt="xl" size="lg">No hay datos de ficha técnica disponibles para este vehículo.</Text>
            )}
          </Collapse>
        </Box>
      </Paper>
    </>
  );
}