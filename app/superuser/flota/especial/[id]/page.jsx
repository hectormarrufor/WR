// app/superuser/flota/especial/[id]/page.jsx
'use client';

import { Container, Title, Text, Paper, Group, Button, Box, Divider, Badge, SimpleGrid, Accordion, Center, Loader, Flex, Image } from '@mantine/core';
import { useParams, useRouter, notFound } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { IconTruckLoading, IconTools, IconShip, IconCalendarEvent, IconGauge, IconWrench, IconInfoCircle, IconEdit, IconTrash, IconFileCertificate } from '@tabler/icons-react';
import { httpDelete, httpGet } from '../../../../ApiFunctions/httpServices';
import BackButton from '../../../../components/BackButton';
import DeleteModal from '../../../DeleteModal';


export default function DetalleEquipoEspecialPage() {
  const router = useRouter();
  const { id } = useParams(); // ID del equipo especial

  const [equipoEspecial, setEquipoEspecial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFichaTecnica, setShowFichaTecnica] = useState(false); // Para colapsar/expandir la ficha técnica

  const fetchEquipoEspecialData = useCallback(async () => {
    setLoading(true);
    try {
      // API para obtener un equipo especial por su ID
      const data = await httpGet(`/api/equiposEspeciales/${id}`);
      if (!data) {
        notFound(); // Redirige a la página 404 si no se encuentra
        return;
      }
      setEquipoEspecial(data);
    } catch (err) {
      console.error(`Error al cargar equipo especial con ID ${id}:`, err);
      setError('Error al cargar los detalles del equipo especial.');
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar los detalles del equipo especial.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchEquipoEspecialData();
    }
  }, [id, fetchEquipoEspecialData]);

  const handleDelete = useCallback(async () => {
    if (equipoEspecial) {
      setIsDeleting(true);
      try {
        await httpDelete(`/api/equiposEspeciales/${equipoEspecial.id}`);
        notifications.show({
          title: 'Eliminado',
          message: 'Equipo especial eliminado exitosamente.',
          color: 'green',
        });
        router.push('/superuser/flota/especial'); // Redirigir a la lista después de eliminar
      } catch (err) {
        notifications.show({
          title: 'Error',
          message: 'No se pudo eliminar el equipo especial.',
          color: 'red',
        });
      } finally {
        setIsDeleting(false);
        setDeleteModalOpened(false);
      }
    }
  }, [equipoEspecial, router]);

  const openDeleteModal = () => {
    setDeleteModalOpened(true);
  };

  const renderObjectDetails = (obj, isNested = false) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      if (Array.isArray(obj)) {
        return (
          <List size="sm" mt="xs">
            {obj.map((item, idx) => (
              <List.Item key={idx}>
                {typeof item === 'object' ? Object.entries(item).map(([k, v]) => `${k}: ${String(v)}`).join(', ') : String(item)}
              </List.Item>
            ))}
          </List>
        );
      }
      return <Text color="dimmed" fs="italic">{isNested ? 'No disponible' : 'Información no disponible'}</Text>;
    }
  
    const itemsToRender = Object.entries(obj).map(([key, value]) => {
      // Ignorar campos de id y timestamps que no son relevantes para la visualización directa del detalle
      if (['id', 'createdAt', 'updatedAt', 'equipoEspecialId', 'tipoEquipoEspecial'].includes(key)) {
        return null;
      }
  
      const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
  
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
            // Manejar arrays, especialmente de certificaciones
            return (
                <Box key={key} p="sm" style={{ borderLeft: '3px solid var(--mantine-color-blue-3)', paddingLeft: '10px' }}>
                    <Text size="sm" fw={700} mb={5} c="blue.7">{formattedKey}:</Text>
                    <List size="sm" mt="xs">
                        {value.map((item, idx) => (
                            <List.Item key={idx}>
                                {typeof item === 'object' ? Object.entries(item).map(([k, v]) => `${k}: ${String(v instanceof Date ? v.toLocaleDateString() : v)}`).join(', ') : String(item)}
                            </List.Item>
                        ))}
                    </List>
                </Box>
            );
        }
        // Objeto anidado
        return (
          <Box key={key} p="sm" style={{ borderLeft: '3px solid var(--mantine-color-blue-3)', paddingLeft: '10px' }}>
            <Text size="sm" fw={700} mb={5} c="blue.7">{formattedKey}:</Text>
            {renderObjectDetails(value, true)}
          </Box>
        );
      } else {
        // Valor simple
        return (
          <Text key={key} size="sm">
            <Text fw={600} span>{formattedKey}:</Text>{' '}
            {String(value instanceof Date ? value.toLocaleDateString('es-VE') : value)}
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

  if (loading) {
    return (
      <Center style={{ height: 'calc(100vh - 120px)' }}>
        <Loader size="lg" />
        <Text ml="md">Cargando detalles del equipo especial...</Text>
      </Center>
    );
  }

  if (error || !equipoEspecial) {
    return (
      <Center style={{ height: 'calc(100vh - 120px)' }}>
        <Text color="red">{error || 'Equipo especial no encontrado.'}</Text>
      </Center>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="lg">
        <BackButton onClick={() => router.push('/superuser/flota/especial')} />
        <Title order={2} ta="center">
          Detalles de {equipoEspecial.nombre}
        </Title>
        <Group>
          <Button leftSection={<IconEdit size={18} />} color="blue" onClick={() => router.push(`/superuser/flota/especial/${equipoEspecial.id}/editar`)}>
            Editar
          </Button>
          <Button leftSection={<IconTrash size={18} />} color="red" onClick={openDeleteModal}>
            Eliminar
          </Button>
        </Group>
      </Group>

      <Paper withBorder shadow="md" p="md" mb="lg">
        <Title order={4} mb="sm" c="blue.7">Información General</Title>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Text><strong>Tipo de Equipo:</strong> {equipoEspecial.tipoEquipoEspecial}</Text>
          <Text><strong>Número de Serie:</strong> {equipoEspecial.numeroSerie}</Text>
          <Text><strong>Fabricante:</strong> {equipoEspecial.fabricante}</Text>
          <Text><strong>Modelo:</strong> {equipoEspecial.modelo}</Text>
          <Text><strong>Fecha Adquisición:</strong> {equipoEspecial.fechaAdquisicion ? new Date(equipoEspecial.fechaAdquisicion).toLocaleDateString('es-VE') : 'N/A'}</Text>
          <Text><strong>Costo Adquisición:</strong> ${equipoEspecial.costoAdquisicion?.toFixed(2) || '0.00'}</Text>
          <Text><strong>Horómetro Actual:</strong> {equipoEspecial.horometroActual} horas</Text>
          <Text><strong>Estado Operativo:</strong> 
            <Badge ml="xs" color={
              equipoEspecial.estadoOperativoGeneral === 'Operativo' ? 'green' :
              equipoEspecial.estadoOperativoGeneral === 'Operativo con Advertencias' ? 'yellow' :
              equipoEspecial.estadoOperativoGeneral === 'No Operativo' ? 'red' :
              equipoEspecial.estadoOperativoGeneral === 'En Taller' ? 'blue' :
              'gray'
            }>{equipoEspecial.estadoOperativoGeneral}</Badge>
          </Text>
          <Text><strong>Ubicación Actual:</strong> {equipoEspecial.ubicacionActual || 'No especificada'}</Text>
          <Text><strong>Es Móvil:</strong> {equipoEspecial.esMovil ? 'Sí' : 'No'}</Text>
          {equipoEspecial.vehiculoRemolque && (
            <Text><strong>Vehículo de Remolque:</strong> {equipoEspecial.vehiculoRemolque.marca} {equipoEspecial.vehiculoRemolque.modelo} ({equipoEspecial.vehiculoRemolque.placa})</Text>
          )}
          <Textarea label="Descripción" value={equipoEspecial.descripcion || 'No hay descripción.'} readOnly autosize minRows={2} style={{ gridColumn: '1 / -1' }} />
        </SimpleGrid>
      </Paper>

      {/* Ficha Técnica del Equipo Especial (Colapsable) */}
      {equipoEspecial.fichaTecnica && (
        <Paper withBorder shadow="md" p="md" mb="lg">
          <Group justify="space-between" align="center" mb="md">
            <Title order={4} c="grape.7"><IconInfoCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> Detalles de Ficha Técnica</Title>
            <Button variant="light" onClick={() => setShowFichaTecnica(!showFichaTecnica)}>
              {showFichaTecnica ? 'Ocultar Ficha Técnica' : 'Mostrar Ficha Técnica'}
            </Button>
          </Group>
          {showFichaTecnica && (
            <Box>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
                <Text><strong>Capacidad Operacional:</strong> {equipoEspecial.fichaTecnica.capacidadOperacional || 'N/A'}</Text>
                <Text><strong>Potencia HP:</strong> {equipoEspecial.fichaTecnica.potenciaHP || 'N/A'}</Text>
                {/* Dimensiones */}
                {equipoEspecial.fichaTecnica.dimensiones && (
                  <Box>
                    <Text fw={700} size="sm" mb="xs" c="blue.7">Dimensiones:</Text>
                    <Text size="sm">Largo: {equipoEspecial.fichaTecnica.dimensiones.largoM || 'N/A'} m</Text>
                    <Text size="sm">Ancho: {equipoEspecial.fichaTecnica.dimensiones.anchoM || 'N/A'} m</Text>
                    <Text size="sm">Alto: {equipoEspecial.fichaTecnica.altoM || 'N/A'} m</Text>
                    <Text size="sm">Peso: {equipoEspecial.fichaTecnica.dimensiones.pesoKg || 'N/A'} Kg</Text>
                  </Box>
                )}
              </SimpleGrid>

              <Divider my="md" label="Especificaciones Detalladas" labelPosition="center" />
              {/* Renderizar especificacionesDetalladas (JSONB) */}
              {equipoEspecial.fichaTecnica.especificacionesDetalladas && Object.keys(equipoEspecial.fichaTecnica.especificacionesDetalladas).length > 0 ? (
                <Accordion chevronPosition="right" variant="filled">
                  <Accordion.Item value="especificaciones">
                    <Accordion.Control>Ver Especificaciones Detalladas</Accordion.Control>
                    <Accordion.Panel>
                      {renderObjectDetails(equipoEspecial.fichaTecnica.especificacionesDetalladas)}
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              ) : (
                <Text size="sm" c="dimmed">No hay especificaciones detalladas registradas.</Text>
              )}

              <Divider my="md" label="Mantenimiento de Componentes Clave" labelPosition="center" />
              {/* Renderizar mantenimientoComponentes (JSONB) */}
              {equipoEspecial.fichaTecnica.mantenimientoComponentes && Object.keys(equipoEspecial.fichaTecnica.mantenimientoComponentes).length > 0 ? (
                <Accordion chevronPosition="right" variant="filled">
                  <Accordion.Item value="mantenimiento">
                    <Accordion.Control>Ver Historial de Mantenimiento de Componentes</Accordion.Control>
                    <Accordion.Panel>
                      {renderObjectDetails(equipoEspecial.fichaTecnica.mantenimientoComponentes)}
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              ) : (
                <Text size="sm" c="dimmed">No hay datos de mantenimiento de componentes clave.</Text>
              )}

              <Divider my="md" label="Certificaciones" labelPosition="center" />
              {/* Renderizar certificaciones (JSONB Array) */}
              {equipoEspecial.fichaTecnica.certificaciones && equipoEspecial.fichaTecnica.certificaciones.length > 0 ? (
                <List spacing="xs" size="sm" center icon={<IconFileCertificate size={20} color="green" />}>
                  {equipoEspecial.fichaTecnica.certificaciones.map((cert, index) => (
                    <List.Item key={index}>
                      <Text>
                        <Text fw={700} span>{cert.nombre}:</Text>{' '}
                        Vencimiento: {cert.vencimiento ? new Date(cert.vencimiento).toLocaleDateString('es-VE') : 'N/A'}
                      </Text>
                    </List.Item>
                  ))}
                </List>
              ) : (
                <Text size="sm" c="dimmed">No hay certificaciones registradas.</Text>
              )}
            </Box>
          )}
        </Paper>
      )}

      {/* Modal de confirmación de eliminación */}
      <DeleteModal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        onConfirm={handleDelete}
        itemType="Equipo Especial"
      />
    </Container>
  );
}