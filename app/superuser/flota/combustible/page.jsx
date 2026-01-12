'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  Paper, Title, Group, TextInput, Button, Table, Badge, 
  Text, ActionIcon, SimpleGrid, Card, Stack, 
  ThemeIcon, Select, Tabs, rem, Box, Divider, LoadingOverlay,
  Modal, NumberInput
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form'; // <--- Importante
import { notifications } from '@mantine/notifications';
import { 
  IconSearch, IconGasStation, IconFilter, IconDownload, 
  IconPlus, IconTruckDelivery, IconDroplet, IconCurrencyDollar,
  IconCalendar, IconGauge, IconBuildingWarehouse, IconRefresh, IconFileInvoice
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

export default function HistorialCombustiblePage() {
  const router = useRouter();
  
  // ESTADOS
  const [loading, setLoading] = useState(false);
  const [dataList, setDataList] = useState([]); // Lista genérica (consumo o abastecimiento)
  const [activeTab, setActiveTab] = useState('consumo'); 
  const [modalAbastecerOpen, setModalAbastecerOpen] = useState(false);
  const [tanques, setTanques] = useState([]); // Para el select del modal

  // FILTROS
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
  const [origenFilter, setOrigenFilter] = useState('todos');

  // --- FETCH PRINCIPAL (Dinámico según TAB) ---
  const fetchData = async () => {
    setLoading(true);
    try {
        // Consultamos con ?tipo=abastecimiento si estamos en el tab 2
        const endpoint = activeTab === 'consumo' 
            ? '/api/gestionMantenimiento/combustible'
            : '/api/gestionMantenimiento/combustible?tipo=abastecimiento';
            
        const res = await fetch(endpoint);
        const result = await res.json();
        
        if (result.success) {
            const dataConFechas = result.data.map(item => ({
                ...item,
                fecha: new Date(item.fecha)
            }));
            setDataList(dataConFechas);
        }
    } catch (error) {
        console.error(error);
        notifications.show({ title: 'Error', message: 'Error cargando datos', color: 'red' });
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]); // Recargar cuando cambie el Tab

  // --- CARGAR TANQUES PARA EL MODAL ---
  useEffect(() => {
    if (modalAbastecerOpen && tanques.length === 0) {
        fetch('/api/inventario/consumibles?categoria=combustible')
            .then(res => res.json())
            .then(res => {
                const items = res.items || res.data || [];
                setTanques(items.map(t => ({ value: t.id.toString(), label: t.nombre })));
            });
    }
  }, [modalAbastecerOpen]);


  // --- FORMULARIO DE ABASTECIMIENTO (MODAL) ---
  const formAbastecer = useForm({
      initialValues: {
          consumibleId: '',
          litros: '',
          costoTotal: '',
          proveedor: '',
          ordenCompra: ''
      },
      validate: {
          consumibleId: (v) => !v ? 'Seleccione tanque' : null,
          litros: (v) => v <= 0 ? 'Cantidad inválida' : null,
          costoTotal: (v) => v <= 0 ? 'Costo inválido' : null,
          proveedor: (v) => !v ? 'Requerido' : null
      }
  });

  const handleAbastecerSubmit = async (values) => {
      setLoading(true);
      try {
          const res = await fetch('/api/gestionMantenimiento/combustible/abastecer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values)
          });
          const result = await res.json();
          if (result.success) {
              notifications.show({ title: 'Éxito', message: 'Recepción registrada', color: 'green' });
              setModalAbastecerOpen(false);
              formAbastecer.reset();
              fetchData(); // Recargar tabla
          } else {
              throw new Error(result.error);
          }
      } catch (err) {
          notifications.show({ title: 'Error', message: err.message, color: 'red' });
      } finally {
          setLoading(false);
      }
  };


  // --- FILTRADO EN CLIENTE ---
  const filteredData = useMemo(() => {
    return dataList.filter(item => {
      // Filtro Fecha
      const matchDate = (!dateRange[0] || item.fecha >= dateRange[0]) && 
                        (!dateRange[1] || item.fecha <= dateRange[1]);
      
      if (activeTab === 'consumo') {
          const matchSearch = (item.codigo || '').toLowerCase().includes(search.toLowerCase()) || 
                              (item.placa || '').toLowerCase().includes(search.toLowerCase());
          const matchOrigen = origenFilter === 'todos' || item.origen === origenFilter;
          return matchDate && matchSearch && matchOrigen;
      } else {
          // Filtros Abastecimiento
          const matchSearch = (item.proveedor || '').toLowerCase().includes(search.toLowerCase()) || 
                              (item.tanque || '').toLowerCase().includes(search.toLowerCase());
          return matchDate && matchSearch;
      }
    });
  }, [dataList, search, dateRange, origenFilter, activeTab]);


  // --- RENDERIZADO ---
  return (
    <Paper>
       <Stack gap="lg">
            
            {/* CABECERA */}
            <Group justify="space-between">
                <div>
                    <Title order={2}>Gestión de Combustible</Title>
                    <Text c="dimmed" size="sm">Control de consumo y compras de gasoil</Text>
                </div>
                <Group>
                    <ActionIcon variant="light" size="lg" onClick={fetchData} loading={loading}>
                        <IconRefresh size={20} />
                    </ActionIcon>
                    {/* Botón Acción Principal Dinámico */}
                    {activeTab === 'consumo' ? (
                        <Button leftSection={<IconPlus size={18} />} onClick={() => router.push('/superuser/flota/combustible/cargar')}>
                            Despachar a Vehículo
                        </Button>
                    ) : (
                        <Button leftSection={<IconPlus size={18} />} color="teal" onClick={() => setModalAbastecerOpen(true)}>
                            Recepcionar Compra
                        </Button>
                    )}
                </Group>
            </Group>

            {/* TABS */}
            <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
                <Tabs.List>
                    <Tabs.Tab value="consumo" leftSection={<IconTruckDelivery size={16}/>}>Consumo (Flota)</Tabs.Tab>
                    <Tabs.Tab value="abastecimiento" leftSection={<IconBuildingWarehouse size={16}/>}>Abastecimiento (Cisterna)</Tabs.Tab>
                </Tabs.List>
            </Tabs>

            {/* FILTROS */}
            <Paper withBorder p="md" radius="md" bg="gray.0">
                <SimpleGrid cols={{ base: 1, sm: 4 }}>
                    <TextInput 
                        placeholder={activeTab === 'consumo' ? "Buscar Placa/Código..." : "Buscar Proveedor..."}
                        leftSection={<IconSearch size={16} />}
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                    />
                    <DatePickerInput 
                        type="range" placeholder="Rango Fechas" leftSection={<IconCalendar size={16}/>}
                        value={dateRange} onChange={setDateRange} clearable
                    />
                    {activeTab === 'consumo' && (
                        <Select 
                            data={[{ value: 'todos', label: 'Todos' }, { value: 'interno', label: 'Tanque Interno' }, { value: 'externo', label: 'Est. Servicio' }]}
                            value={origenFilter} onChange={setOrigenFilter} leftSection={<IconFilter size={16}/>}
                        />
                    )}
                </SimpleGrid>
            </Paper>

            {/* TABLA DINÁMICA */}
            <Paper withBorder radius="md" pos="relative" mih={200}>
                <LoadingOverlay visible={loading} />
                
                {filteredData.length === 0 && !loading ? (
                    <Stack align="center" py="xl" c="dimmed">
                        <IconGasStation size={48} stroke={1.5} />
                        <Text>No hay registros</Text>
                    </Stack>
                ) : (
                    <Box overflow="auto">
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Fecha</Table.Th>
                                {activeTab === 'consumo' ? (
                                    <>
                                        <Table.Th>Activo</Table.Th>
                                        <Table.Th>Litros</Table.Th>
                                        <Table.Th>Origen</Table.Th>
                                        <Table.Th>Km</Table.Th>
                                        <Table.Th>Rendimiento</Table.Th>
                                        <Table.Th>Costo ($)</Table.Th>
                                    </>
                                ) : (
                                    <>
                                        <Table.Th>Proveedor</Table.Th>
                                        <Table.Th>Destino</Table.Th>
                                        <Table.Th>OC / Ref</Table.Th>
                                        <Table.Th>Litros</Table.Th>
                                        <Table.Th>Costo Total</Table.Th>
                                    </>
                                )}
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {filteredData.map((row) => (
                                <Table.Tr key={row.id}>
                                    <Table.Td>{row.fecha.toLocaleDateString()}</Table.Td>
                                    
                                    {activeTab === 'consumo' ? (
                                        <>
                                            <Table.Td>
                                                <Text fw={500} size="sm">{row.codigo}</Text>
                                                <Text c="dimmed" size="xs">{row.placa}</Text>
                                            </Table.Td>
                                            <Table.Td fw={700}>{row.litros} L</Table.Td>
                                            <Table.Td>
                                                <Badge color={row.origen === 'interno' ? 'blue' : 'orange'} variant="light">
                                                    {row.origen}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>{row.km?.toLocaleString()} km</Table.Td>
                                            <Table.Td>
                                                {row.rendimiento ? <Badge color={row.rendimiento > 3 ? 'green' : 'yellow'} variant="dot">{row.rendimiento} km/L</Badge> : '-'}
                                            </Table.Td>
                                            <Table.Td>{row.costo > 0 ? `$${row.costo.toFixed(2)}` : '-'}</Table.Td>
                                        </>
                                    ) : (
                                        <>
                                            <Table.Td fw={500}>{row.proveedor}</Table.Td>
                                            <Table.Td>{row.tanque}</Table.Td>
                                            <Table.Td>{row.ordenCompra}</Table.Td>
                                            <Table.Td fw={700} c="blue">{parseFloat(row.litros).toLocaleString()} L</Table.Td>
                                            <Table.Td fw={700}>${parseFloat(row.costoTotal).toLocaleString()}</Table.Td>
                                        </>
                                    )}
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                    </Box>
                )}
            </Paper>

            {/* --- MODAL PARA ABASTECER (COMPRAR) --- */}
            <Modal centered opened={modalAbastecerOpen} onClose={() => setModalAbastecerOpen(false)} title="Recepcionar Compra de Gasoil">
                <form onSubmit={formAbastecer.onSubmit(handleAbastecerSubmit)}>
                    <Stack>
                        <Select 
                            label="Tanque de Destino"
                            placeholder="Seleccione tanque..."
                            data={tanques}
                            {...formAbastecer.getInputProps('consumibleId')}
                        />
                        <TextInput 
                            label="Proveedor"
                            placeholder="Ej. PDVSA / Distribuidora"
                            {...formAbastecer.getInputProps('proveedor')}
                        />
                        <TextInput 
                            label="Nro. Orden de Compra / Referencia"
                            placeholder="OC-0001"
                            leftSection={<IconFileInvoice size={16}/>}
                            {...formAbastecer.getInputProps('ordenCompra')}
                        />
                        <SimpleGrid cols={2}>
                            <NumberInput 
                                label="Litros Recibidos"
                                suffix=" L"
                                min={0}
                                {...formAbastecer.getInputProps('litros')}
                            />
                            <NumberInput 
                                label="Costo Total Pagado ($)"
                                prefix="$"
                                min={0}
                                {...formAbastecer.getInputProps('costoTotal')}
                            />
                        </SimpleGrid>
                        
                        {/* Info de cálculo */}
                        {formAbastecer.values.litros && formAbastecer.values.costoTotal && (
                            <Text size="xs" c="dimmed" ta="right">
                                Costo Unitario de esta compra: <b>${(formAbastecer.values.costoTotal / formAbastecer.values.litros).toFixed(4)} / L</b>
                            </Text>
                        )}

                        <Group justify="flex-end" mt="md">
                            <Button variant="default" onClick={() => setModalAbastecerOpen(false)}>Cancelar</Button>
                            <Button type="submit" color="teal">Registrar Entrada</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

       </Stack>
    </Paper>
  );
}