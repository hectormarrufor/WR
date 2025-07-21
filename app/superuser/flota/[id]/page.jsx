// app/superuser/flota/[id]/page.jsx
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
  Center,
  Loader,
  Checkbox,
} from '@mantine/core';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter, notFound } from 'next/navigation';
import * as html2pdf from 'html2pdf.js';
import BackButton from '../../../components/BackButton';
import { useMediaQuery } from '@mantine/hooks';
import { httpGet } from '../../../ApiFunctions/httpServices'; //
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
  IconWrench,
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
  const router = useRouter();
  const pdfRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const { id } = params;
  const [vehiculo, setVehiculo] = useState(null);
  const [showFichaTecnica, setShowFichaTecnica] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHallazgos, setSelectedHallazgos] = useState([]);

  const fetchVehiculoData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await httpGet(`/api/vehiculos/${id}`); ///route.js]
      if (!data) {
        notFound();
        return;
      }
      console.log(data);
      const v = {
        ano: data.ano,
        color: data.color,
        createdAt: data.createdAt,
        fichaTecnica: data.fichaTecnica,
        horometro: data.horometros?.[0]?.horas,
        imagen: data.imagen,
        inspecciones: data.inspecciones,
        kilometraje: data.kilometrajes?.[0]?.kilometrajeActual,
        mantenimientos: data.mantenimientos,
        marca: data.marca,
        modelo: data.modelo,
        placa: data.placa,
        updatedAt: data.updatedAt,
        vin: data.vin,
        estadoOperativoGeneral: data.estadoOperativoGeneral,
        estadosSistemasActuales: data.estadosSistemas,
      };
      setVehiculo(v);
      setSelectedHallazgos([]); // Limpiar selección al recargar datos
    } catch (err) {
      setError(err.message);
      console.error('Error al cargar datos del vehículo:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchVehiculoData();
    }
  }, [id, fetchVehiculoData]);

  const handleCheckboxChange = (hallazgoId) => {
    setSelectedHallazgos((prevSelected) =>
      prevSelected.includes(hallazgoId)
        ? prevSelected.filter((id) => id !== hallazgoId)
        : [...prevSelected, hallazgoId]
    );
  };

  const handleCrearMantenimientoConSeleccionados = () => {
    if (selectedHallazgos.length === 0) {
      alert('Por favor, selecciona al menos un hallazgo para crear la orden de mantenimiento.');
      return;
    }
    const selectedIdsString = selectedHallazgos.join(',');
    router.push(`/superuser/flota/${id}/mantenimiento/nueva?hallazgoIds=${selectedIdsString}`);
  };

  const { kmToday, avgKm7Days, avgKm30Days } = useMemo(() => {
    if (!vehiculo || !vehiculo.kilometrajes) {
      return { kmToday: 0, avgKm7Days: 0, avgKm30Days: 0 };
    }
    return calculateMetrics(vehiculo.kilometrajes, vehiculo.kilometraje);
  }, [vehiculo]);

  const estimatedNextMotorOilChange = useMemo(() => {
    const ultimoCambioKm = vehiculo?.fichaTecnica?.motor?.aceite?.ultimoCambioKm;
    const intervaloCambioKm = vehiculo?.fichaTecnica?.motor?.aceite?.intervaloCambioKm;

    if (!intervaloCambioKm || ultimoCambioKm === null || avgKm30Days <= 0) {
      return { km: 'N/A', days: 'N/A' };
    }

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

  const estimatedNextTransmisionOilChange = useMemo(() => {
    const ultimoCambioKm = vehiculo?.fichaTecnica?.transmision?.aceite?.ultimoCambioKm;
    const intervaloCambioKm = vehiculo?.fichaTecnica?.transmision?.aceite?.intervaloCambioKm;

    if (!intervaloCambioKm || ultimoCambioKm === null || avgKm30Days <= 0) {
      return { km: 'N/A', days: 'N/A' };
    }

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
    return (
      <Paper p="md" mt={90} mx={20} shadow="md">
        <Center style={{ height: '300px' }}>
          <Loader size="lg" />
          <Text ml="md">Cargando información del vehículo...</Text>
        </Center>
      </Paper>
    );
  }

  if (error) {
    return <Paper p="md" mt={90} mx={20} shadow="md">Error: {error}</Paper>;
  }

  if (!vehiculo) {
    return <Paper p="md" mt={90} mx={20} shadow="md">Vehículo no encontrado.</Paper>;
  }

  // Filtrar hallazgos que no están Resueltos ni Descartados
  const allHallazgosFromInspecciones = vehiculo.inspecciones?.flatMap(inspeccion => inspeccion.hallazgos || []) || [];
  const pendingHallazgos = allHallazgosFromInspecciones.filter(hallazgo => 
    hallazgo.estado === 'Pendiente' || hallazgo.estado === 'Asignado'
  );

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
      <Paper px={isMobile ? 0 : 100} py={30} mt={90} mx={isMobile ? 0 : 20} shadow="md" radius="lg">
        <Group position="right" mb="xl" grow={isMobile}>
          <Flex justify="space-between" wrap="wrap" w="100%" gap="md">
            <BackButton onClick={() => router.push('/superuser/flota')} />
            <Button leftSection={<IconClipboardList size={18} />} color="blue" onClick={() => router.push(`/superuser/flota/${id}/nuevaInspeccion`)}>
              Registrar Nueva Inspección
            </Button>
            <Button leftSection={<IconTools size={18} />} color="teal" onClick={handleMantenimiento}>
              Gestionar Mantenimientos
            </Button>
            <Button leftSection={<IconListDetails size={18} />} color="grape" onClick={() => setShowFichaTecnica(!showFichaTecnica)}>
              {showFichaTecnica ? 'Ocultar Ficha Técnica' : 'Mostrar Ficha Técnica'}
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

                 <Group spacing="xs">
                  <Text size="md"><strong>Estado Operativo General:</strong></Text>
                  <Badge
                    color={
                      vehiculo.estadoOperativoGeneral === 'Operativo' ? 'green' :
                      vehiculo.estadoOperativoGeneral === 'Operativo con Advertencias' ? 'yellow' :
                      vehiculo.estadoOperativoGeneral === 'No Operativo' ? 'red' :
                      vehiculo.estadoOperativoGeneral === 'En Taller' ? 'blue' :
                      'gray'
                    }
                    size="lg"
                    radius="sm"
                  >
                    {vehiculo.estadoOperativoGeneral}
                  </Badge>
                </Group>

                <Text size="md"><strong>Kilómetros recorridos hoy:</strong> {kmToday.toFixed(0)} km</Text>
                <Text size="md"><strong>Promedio KM (últimos 7 días):</strong> {avgKm7Days.toFixed(2)} km/día</Text>
                <Text size="md"><strong>Promedio KM (últimos 30 días):</strong> {avgKm30Days.toFixed(2)} km/día</Text>
                <Text size="md" c={estimatedNextMotorOilChange.km === 'Cambio requerido' ? 'red' : 'blue'}>
                  <strong>Próximo Cambio Aceite Motor (KM):</strong> {estimatedNextMotorOilChange.km}
                </Text>
                <Text size="md" c={estimatedNextMotorOilChange.days === 'Cambio requerido' ? 'red' : 'blue'}>
                  <strong>Próximo Cambio Aceite Motor (Fecha Estimada):</strong> {estimatedNextMotorOilChange.days}
                </Text>
                <Text size="md" c={estimatedNextTransmisionOilChange.km === 'Cambio requerido' ? 'red' : 'blue'}>
                  <strong>Próximo Cambio Aceite Transmisión (KM):</strong> {estimatedNextTransmisionOilChange.km}
                </Text>
                <Text size="md" c={estimatedNextTransmisionOilChange.days === 'Cambio requerido' ? 'red' : 'blue'}>
                  <strong>Próximo Cambio Aceite Transmisión (Fecha Estimada):</strong> {estimatedNextTransmisionOilChange.days}
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
          </Paper>

          {vehiculo.estadosSistemasActuales && vehiculo.estadosSistemasActuales.length > 0 && (
            <Paper shadow="xs" p="xl" radius="md" mb="xl" withBorder>
              <Divider my="md" />
              <Title order={4} align="center" mb="md" c="blue.7">Estado Actual de los Sistemas</Title>
              <Accordion chevronPosition="right" variant="filled">
                {vehiculo.estadosSistemasActuales.map((sistema, index) => (
                  <Accordion.Item value={sistema.nombreSistema} key={index}>
                    <Accordion.Control icon={
                      sistema.estado === 'Operativo' ? <IconCircleCheck style={{ color: 'green' }} /> :
                      sistema.estado === 'Advertencia' ? <IconAlertCircle style={{ color: 'orange' }} /> :
                      sistema.estado === 'Fallo Crítico' ? <IconCircleX style={{ color: 'red' }} /> :
                      <IconCircleDot style={{ color: 'gray' }} />
                    }>
                      <Text fw={500}>{sistema.nombreSistema}</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Text>Estado: <Badge color={
                        sistema.estado === 'Operativo' ? 'green' :
                        sistema.estado === 'Advertencia' ? 'orange' :
                        sistema.estado === 'Fallo Crítico' ? 'red' :
                        'gray'
                      } variant="light">{sistema.estado}</Badge></Text>
                      {sistema.notas && <Text mt="xs" size="sm" color="dimmed">Notas: {sistema.notas}</Text>}
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </Paper>
          )}

          {pendingHallazgos.length > 0 && (
            <Paper shadow="xs" p="xl" radius="md" mb="xl" withBorder>
              <Title order={3} align="center" mb="md" c="red.7">Hallazgos Pendientes de Resolver</Title>
              <Group justify="flex-end" mb="md">
                <Button
                  leftSection={<IconWrench size={18} />}
                  color="orange"
                  onClick={handleCrearMantenimientoConSeleccionados}
                  disabled={selectedHallazgos.length === 0}
                >
                  Crear Mantenimiento con Seleccionados ({selectedHallazgos.length})
                </Button>
              </Group>

              <List spacing="xs" size="sm" center icon={<ThemeIcon color="red" size={24} radius="xl"><IconAlertCircle style={{ width: '80%', height: '80%' }} /></ThemeIcon>}>
                {pendingHallazgos.map((hallazgo) => (
                  <List.Item key={hallazgo.id}>
                    <Flex justify="space-between" align="center" wrap="wrap" gap="xs">
                      <Checkbox
                        checked={selectedHallazgos.includes(hallazgo.id)}
                        onChange={() => handleCheckboxChange(hallazgo.id)}
                        label={
                          <Box style={{ flex: 1 }}>
                            <Text>
                              <Text fw={700} span>{hallazgo.nombreSistema}:</Text>{' '}
                              {hallazgo.descripcion}{' '}
                              (Reportado en inspección del{' '}
                              {new Date(hallazgo.createdAt).toLocaleDateString('es-VE', { year: 'numeric', month: '2-digit', day: '2-digit' })} -{' '}
                              <Text fw={700} span>Gravedad: {hallazgo.gravedad}</Text>)
                            </Text>
                          </Box>
                        }
                        size="md"
                      />
                    </Flex>
                  </List.Item>
                ))}
              </List>
            </Paper>
          )}

          <Collapse in={showFichaTecnica} transitionDuration={300} transitionTimingFunction="ease-in-out">
            {vehiculo.fichaTecnica ? (
              <Paper shadow="xs" p="xl" radius="md" mb="xl" withBorder>
                <Divider my="md" />
                <Title order={3} align="center" mb="md" c="grape.7">Detalles de Ficha Técnica</Title>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" mb="xl">
                    <Text size="md"><strong>Ejes:</strong> {vehiculo.fichaTecnica.ejes}</Text>
                    <Text size="md"><strong>Tipo de Vehículo:</strong> {vehiculo.fichaTecnica.tipo}</Text>
                    <Text size="md"><strong>Tipo de Peso:</strong> {vehiculo.fichaTecnica.tipoPeso}</Text>
                    <Text size="md"><strong>Tipo de Combustible Principal:</strong> {vehiculo.fichaTecnica.combustible?.tipoCombustible || 'N/A'}</Text>
                </SimpleGrid>

                <Accordion defaultValue="motor" chevronPosition="right" variant="separated">
                  <Accordion.Item value="motor">
                    <Accordion.Control icon={<IconEngine style={{ color: '#E64980' }} />}>
                      <Text fw={500}>Motor</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {renderObjectDetails(vehiculo.fichaTecnica.motor)}
                    </Accordion.Panel>
                  </Accordion.Item>

                  <Accordion.Item value="correas">
                    <Accordion.Control icon={<IconTool style={{ color: '#FAB005' }} />}>
                      <Text fw={500}>Correas</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {renderObjectDetails(vehiculo.fichaTecnica.correas)}
                    </Accordion.Panel>
                  </Accordion.Item>

                  <Accordion.Item value="neumaticos">
                    <Accordion.Control icon={<IconWheel style={{ color: '#1098AD' }} />}>
                      <Text fw={500}>Neumáticos</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {renderObjectDetails(vehiculo.fichaTecnica.neumaticos)}
                    </Accordion.Panel>
                  </Accordion.Item>

                  <Accordion.Item value="combustible">
                    <Accordion.Control icon={<IconGasStation style={{ color: '#82C91E' }} />}>
                      <Text fw={500}>Combustible</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {renderObjectDetails(vehiculo.fichaTecnica.combustible)}
                    </Accordion.Panel>
                  </Accordion.Item>

                  <Accordion.Item value="transmision">
                    <Accordion.Control icon={<IconTransfer style={{ color: '#FD7E14' }} />}>
                      <Text fw={500}>Transmisión</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {renderObjectDetails(vehiculo.fichaTecnica.transmision)}
                    </Accordion.Panel>
                  </Accordion.Item>

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