// filepath: c:\Users\Hector Marrufo\Documents\App Web DADICA hector marrufo\WR\app\superuser\flota\modelos\[id]\page.jsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  IconPencil, IconPhotoOff, IconArrowLeft, IconSettings, IconTruck
} from '@tabler/icons-react';
import {

  Paper, Title, Text, Group, Button, Loader, Alert, Grid, Badge,
  Divider, Image, Center, Stack, Tabs, Accordion, Table, ThemeIcon
} from '@mantine/core';

export default function DetalleModeloPage() {
  const { id, type } = useParams(); // Asumiendo estructura carpeta: [type]/[id]
  const router = useRouter();


  // Si la estructura de carpetas no incluye [type], podemos intentar leerlo de query params como fallback
  // const searchParams = useSearchParams();
  // const modelType = type || searchParams.get('type') || 'vehiculo'; 

  // Nota: Basado en tu prompt, asumimos que viene en params. 
  // Asegúrate de que tu carpeta sea por ejemplo: app/superuser/flota/modelos/[type]/[id]/page.jsx
  const modelType = type;

  const [modelo, setModelo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id && modelType) {
      const fetchModelo = async () => {
        setLoading(true);
        try {
          // Mapeo simple por si el param difiere del endpoint
          // (ej: 'vehiculos' -> 'vehiculo')
          let endpointType = modelType.toLowerCase();
          if (modelType.endsWith('s')) endpointType = modelType.slice(0, -1);

          const response = await fetch(`/api/gestionMantenimiento/${endpointType}/${id}`);

          if (!response.ok) throw new Error('Modelo no encontrado');

          const data = await response.json();
          setModelo(data.data);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchModelo();
    }
  }, [id, modelType]);

  if (loading) return <Loader size="xl" style={{ display: 'block', margin: 'auto', marginTop: '50px' }} />;
  if (error) return <Alert color="red" title="Error">{error}</Alert>;
  if (!modelo) return <Alert color="yellow" title="Aviso">No se encontraron datos para el modelo.</Alert>;

  // Helpers de renderizado
  const renderInfoRow = (label, value) => (
    <Group align="flex-start" mb="xs">
      <Text fw={700} w={150} c="dimmed">{label}:</Text>
      <Text style={{ flex: 1 }}>{value || '-'}</Text>
    </Group>
  );

  return (
    <Paper>
      
      <Stack spacing="lg">
        {/* Header de Navegación */}
        <Group justify="space-between">
          <Group>
            <Button variant="subtle" leftSection={<IconArrowLeft size={18} />} onClick={() => router.back()}>
              Volver
            </Button>
            <Title order={2}>Detalles del Modelo</Title>
            <Badge size="lg" variant="dot" color="blue">{modelType?.toUpperCase()}</Badge>
          </Group>
      
          <Button
            leftSection={<IconPencil size={18} />}
            onClick={() => router.push(`/superuser/flota/modelos/${id}/${modelType}/editar`)}
          >
            Editar Modelo
          </Button>
        </Group>
      
        {/* Sección General */}
        <Paper p="xl" radius="md" withBorder>
          <Grid gutter="xl">
            {/* Columna Izquierda: Imagen */}
            <Grid.Col span={{ base: 12, md: 4 }}>
              {modelo.imagen ? (
                <Image
                  src={`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${modelo.imagen}?v=${process.env.NEXT_PUBLIC_APP_VERSION}`}
                  radius="md"
                  h={250}
                  fit="contain"
                  bg="gray.1"
                />
              ) : (
                <Paper h={250} radius="md" bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Center>
                    <Stack align="center" spacing="xs">
                      <IconPhotoOff size={48} color="var(--mantine-color-gray-5)" />
                      <Text c="dimmed">Sin imagen de referencia</Text>
                    </Stack>
                  </Center>
                </Paper>
              )}
            </Grid.Col>
      
            {/* Columna Derecha: Datos Técnicos */}
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Title order={3} mb="md">{modelo.nombre || `${modelo.marca} ${modelo.modelo}`}</Title>
      
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  {renderInfoRow('Marca', modelo.marca)}
                  {renderInfoRow('Modelo', modelo.modelo)}
                  {renderInfoRow('Año', modelo.anio)}
                  {renderInfoRow('Tipo', modelo.tipo)}
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  {renderInfoRow('Peso', modelo.peso ? `${modelo.peso} Kg` : null)}
                  {renderInfoRow('Nº Ejes', modelo.numeroEjes)}
                  {renderInfoRow('Combustible', modelo.tipoCombustible)}
      
                  {(modelo.capacidadArrastre || modelo.pesoMaximoCombinado) && (
                    <>
                      <Divider my="sm" label="Capacidades" labelPosition="center" />
                      {renderInfoRow('Cap. Arrastre', modelo.capacidadArrastre)}
                      {renderInfoRow('Peso Max. Comb', modelo.pesoMaximoCombinado)}
                    </>
                  )}
                </Grid.Col>
              </Grid>
            </Grid.Col>
          </Grid>
        </Paper>
      
        {/* Pestañas de Detalles Específicos */}
        <Tabs defaultValue="subsistemas" radius="md" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="subsistemas" leftSection={<IconSettings size={18} />}>
              Subsistemas y Mantenimiento
            </Tabs.Tab>
            <Tabs.Tab value="instancias" leftSection={<IconTruck size={18} />}>
              Flota Existente ({modelo.instancias?.length || 0})
            </Tabs.Tab>
          </Tabs.List>
      
          {/* TAB 1: SUBSISTEMAS */}
          <Tabs.Panel value="subsistemas" pt="md">
            {(!modelo.subsistemas || modelo.subsistemas.length === 0) ? (
              <Alert color="blue" title="Sin configuración">
                Este modelo no tiene subsistemas configurados.
              </Alert>
            ) : (
              <Accordion variant="separated" radius="md">
                {modelo.subsistemas.map((sub) => (
                  <Accordion.Item key={sub.id} value={sub.id.toString()}>
                    <Accordion.Control icon={<ThemeIcon color="blue" variant="light"><IconSettings size={14} /></ThemeIcon>}>
                      <Text fw={600}>{sub.nombre}</Text>
                      <Text size="xs" c="dimmed">{sub.categoria}</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                      {sub.listaRecomendada && sub.listaRecomendada.length > 0 ? (
                        <Table striped highlightOnHover withTableBorder>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Etiqueta / Consumible</Table.Th>
                              <Table.Th>Categoría</Table.Th>
                              <Table.Th>Cantidad</Table.Th>
                              <Table.Th>Criterio</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {sub.listaRecomendada.map((rec, index) => (
                              <Table.Tr key={index}>
                                <Table.Td fw={500}>{rec.label}</Table.Td>
                                <Table.Td>
                                  <Badge variant="outline" size="sm">{rec.categoria}</Badge>
                                </Table.Td>
                                <Table.Td>{rec.cantidad}</Table.Td>
                                <Table.Td style={{ textTransform: 'capitalize' }}>
                                  {rec.tipoCriterio}
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      ) : (
                        <Text c="dimmed" fs="italic">No hay consumibles recomendados definidos para este subsistema.</Text>
                      )}
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            )}
          </Tabs.Panel>
      
          {/* TAB 2: INSTANCIAS (VEHÍCULOS REALES) */}
          <Tabs.Panel value="instancias" pt="md">
            <Paper withBorder p="md" radius="md">
              {modelo.instancias && modelo.instancias.length > 0 ? (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Código / Placa</Table.Th>
                      <Table.Th>Acciones</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {modelo.instancias.map((instancia) => (
                      <Table.Tr key={instancia.id}>
                        <Table.Td>
                          {instancia.placa || instancia.codigoActivo || 'Sin Identificador'}
                        </Table.Td>
                        <Table.Td>
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() => router.push(`/superuser/flota/activos/${instancia.id}`)}
                          >
                            Ver Activo
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              ) : (
                <Text align="center" c="dimmed" py="xl">
                  No hay activos físicos registrados bajo este modelo actualmente.
                </Text>
              )}
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Paper>
  );
}