'use client';

import { useState, useEffect } from 'react';
import { 
    Container, Title, Paper, Group, Button, Table, 
    Badge, Text, ActionIcon, LoadingOverlay, SimpleGrid, RingProgress, Center, Tabs,
    Card, Flex, ThemeIcon, ScrollArea, Modal
} from '@mantine/core';
import { 
    IconGasStation, IconPlus, IconRefresh, IconBarrel, 
    IconTrash, IconTruckDelivery, IconListDetails, IconTrendingUp, IconDropletFilled, IconAlertTriangle
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/hooks/useAuth'; 
import ModalCargarCombustible from '../flota/combustible/components/ModalCargarCombustible';
import ModalComprarGasoil from '../flota/combustible/components/ModalComprarGasoil';

export default function CombustiblePage() {
    const { user } = useAuth(); 
    
    const isSuperAdmin = user?.id === 1 || user?.id === '1'; 
    const isAdmin = user?.rol === 'admin' || user?.role === 'ADMIN' || user?.rol === 'superadmin';

    const [cargas, setCargas] = useState([]);
    const [compras, setCompras] = useState([]); 
    const [stockGasoil, setStockGasoil] = useState(0);
    const [tanquePrincipalId, setTanquePrincipalId] = useState(null); 
    const [loading, setLoading] = useState(true);
    
    const [modalDespachoOpened, setModalDespachoOpened] = useState(false);
    const [modalCompraOpened, setModalCompraOpened] = useState(false);

    // ESTADO PARA EL MODAL DE CONFIRMACIÓN LOCAL (Sin ModalsProvider)
    const [confirmModal, setConfirmModal] = useState({
        opened: false,
        title: '',
        message: '',
        onConfirm: null,
        loading: false
    });

    const CAPACIDAD_MAXIMA_TANQUE = 8000;

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resCargas, resInventario, resCompras] = await Promise.all([
                fetch('/api/gestionMantenimiento/combustible/cargar'),
                fetch('/api/inventario/consumibles?tipo=gasoil'),
                fetch('/api/inventario/consumibles/comprar-gasoil') 
            ]);

            if (resCargas.ok) {
                const resultCargas = await resCargas.json();
                if (resultCargas.success) setCargas(resultCargas.data);
            }

            if (resCompras.ok) {
                const resultCompras = await resCompras.json();
                if (resultCompras.success) setCompras(resultCompras.data);
            }

            if (resInventario.ok) {
                const resultInventario = await resInventario.json();
                if (resultInventario.items && resultInventario.items.length > 0) {
                    const totalStock = resultInventario.items.reduce((acc, item) => acc + parseFloat(item.stockAlmacen || 0), 0);
                    setStockGasoil(totalStock);
                    setTanquePrincipalId(resultInventario.items[0].id); 
                }
            } else {
                notifications.show({ title: 'Aviso', message: 'No se pudo cargar el inventario actual', color: 'yellow' });
            }

        } catch (error) {
            console.error("Error obteniendo datos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEliminarCarga = (cargaId) => {
        setConfirmModal({
            opened: true,
            title: 'Eliminar Despacho de Combustible',
            message: '¿Estás seguro de que deseas eliminar este despacho? Los litros volverán al tanque y el inventario se ajustará.',
            loading: false,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, loading: true }));
                try {
                    const response = await fetch(`/api/gestionMantenimiento/combustible/cargar/${cargaId}`, { method: 'DELETE' });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'No se pudo eliminar el despacho');
                    notifications.show({ title: 'Restitución Exitosa', message: 'Despacho eliminado.', color: 'green' });
                    fetchData(); 
                    setConfirmModal(prev => ({ ...prev, opened: false }));
                } catch (error) {
                    notifications.show({ title: 'Error', message: error.message, color: 'red' });
                    setConfirmModal(prev => ({ ...prev, loading: false }));
                }
            }
        });
    };

    const handleRevertirCompra = (compraId) => {
        setConfirmModal({
            opened: true,
            title: 'Revertir Ingreso de Gasoil',
            message: '¿Eliminar esta compra de inventario? Se restarán los litros del tanque y se recalculará el precio promedio hacia atrás.',
            loading: false,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, loading: true }));
                try {
                    const response = await fetch(`/api/inventario/consumibles/comprar-gasoil/${compraId}`, { method: 'DELETE' });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'No se pudo revertir la compra');
                    notifications.show({ title: 'Éxito', message: 'Compra revertida y stock ajustado.', color: 'green' });
                    fetchData();
                    setConfirmModal(prev => ({ ...prev, opened: false }));
                } catch (error) {
                    notifications.show({ title: 'Error', message: error.message, color: 'red' });
                    setConfirmModal(prev => ({ ...prev, loading: false }));
                }
            }
        });
    };

    const porcentajeStock = (stockGasoil / CAPACIDAD_MAXIMA_TANQUE) * 100;
    let colorTorta = 'teal'; 
    if (porcentajeStock <= 20) colorTorta = 'red';
    else if (porcentajeStock <= 60) colorTorta = 'orange';

    const totalLitrosDespachados = cargas.reduce((acc, c) => acc + parseFloat(c.litros || 0), 0);
    const totalLitrosComprados = compras.reduce((acc, c) => acc + parseFloat(c.cantidad || 0), 0);

    return (
        <Container size="xl" py="xl">
            <Flex direction={{ base: 'column', sm: 'row' }} justify="space-between" align={{ base: 'stretch', sm: 'center' }} mb="xl" gap="md">
                <Group wrap="nowrap">
                    <ThemeIcon size="xl" radius="md" variant="gradient" gradient={{ from: 'yellow.6', to: 'orange.6' }}>
                        <IconGasStation size={24} />
                    </ThemeIcon>
                    <div>
                        <Title order={2} fw={800} c="dark.8" style={{ lineHeight: 1.1 }}>Combustible</Title>
                        <Text c="dimmed" size="sm">Gestión de inventario y despachos</Text>
                    </div>
                </Group>

                <Flex gap="sm" direction={{ base: 'column', xs: 'row' }}>
                    <ActionIcon variant="default" size="lg" onClick={fetchData} style={{ alignSelf: 'center' }} hiddenFrom="xs">
                        <IconRefresh size={20} />
                    </ActionIcon>

                    {tanquePrincipalId && (
                        <Button color="teal.7" variant="light" leftSection={<IconTruckDelivery size={18} />} onClick={() => setModalCompraOpened(true)} fullWidth>
                            Comprar Gasoil
                        </Button>
                    )}

                    <Button color="blue.7" leftSection={<IconPlus size={18} />} onClick={() => setModalDespachoOpened(true)} fullWidth>
                        Despachar a Equipo
                    </Button>
                    
                    <ActionIcon variant="default" size="input-sm" onClick={fetchData} visibleFrom="xs">
                        <IconRefresh size={20} />
                    </ActionIcon>
                </Flex>
            </Flex>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg" mb="xl">
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group wrap="nowrap" align="center">
                        <RingProgress
                            size={80}
                            roundCaps
                            thickness={8}
                            sections={[{ value: porcentajeStock > 100 ? 100 : porcentajeStock, color: colorTorta }]}
                            label={<Center><IconBarrel size={20} color={colorTorta === 'teal' ? 'gray' : colorTorta} /></Center>}
                        />
                        <div>
                            <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Inventario Actual</Text>
                            <Text fw={900} size="xl" c="dark.8">{stockGasoil.toLocaleString()} L</Text>
                            <Text c="dimmed" size="xs">Máx: {CAPACIDAD_MAXIMA_TANQUE.toLocaleString()} L</Text>
                        </div>
                    </Group>
                </Card>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group wrap="nowrap" h="100%">
                        <ThemeIcon size={54} radius="md" variant="light" color="blue">
                            <IconDropletFilled size={28} />
                        </ThemeIcon>
                        <div>
                            <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Histórico Despachado</Text>
                            <Text fw={900} size="xl" c="blue.8">{totalLitrosDespachados.toLocaleString(undefined, { maximumFractionDigits: 0 })} L</Text>
                            <Text c="dimmed" size="xs">Consumo de flota</Text>
                        </div>
                    </Group>
                </Card>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Group wrap="nowrap" h="100%">
                        <ThemeIcon size={54} radius="md" variant="light" color="teal">
                            <IconTrendingUp size={28} />
                        </ThemeIcon>
                        <div>
                            <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Histórico Comprado</Text>
                            <Text fw={900} size="xl" c="teal.8">{totalLitrosComprados.toLocaleString(undefined, { maximumFractionDigits: 0 })} L</Text>
                            <Text c="dimmed" size="xs">Ingresos a base</Text>
                        </div>
                    </Group>
                </Card>
            </SimpleGrid>

            <Tabs defaultValue="despachos" variant="pills" radius="xl" color="blue">
                <Tabs.List mb="md" grow justify="center">
                    <Tabs.Tab value="despachos" leftSection={<IconListDetails size={16} />}>Despachos a Equipos</Tabs.Tab>
                    <Tabs.Tab value="compras" leftSection={<IconTruckDelivery size={16} />} color="teal">Historial de Ingresos</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="despachos">
                    <Card withBorder shadow="sm" radius="md" p={0} pos="relative">
                        <LoadingOverlay visible={loading} zIndex={100} overlayProps={{ radius: "md", blur: 2 }} />
                        <ScrollArea type="auto" offsetScrollbars>
                            <Table striped highlightOnHover verticalSpacing="md" horizontalSpacing="md" minWidth={800}>
                                <Table.Thead bg="gray.0">
                                    <Table.Tr>
                                        <Table.Th>Fecha</Table.Th>
                                        <Table.Th>Equipo (Activo)</Table.Th>
                                        <Table.Th>Origen</Table.Th>
                                        <Table.Th>Litros</Table.Th>
                                        <Table.Th>Odómetro/Hr</Table.Th>
                                        <Table.Th>Rendimiento</Table.Th>
                                        {isAdmin && <Table.Th ta="center">Acciones</Table.Th>}
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {cargas.map((carga) => (
                                        <Table.Tr key={carga.id}>
                                            <Table.Td fw={600} style={{ whiteSpace: 'nowrap' }}>{new Date(carga.fecha).toLocaleDateString()}</Table.Td>
                                            <Table.Td>
                                                <Text fw={800} c="blue.8">{carga.activo?.codigoInterno}</Text>
                                                <Text size="xs" c="dimmed">{carga.activo?.descripcion} • Placa: {carga.activo?.identificadorExtra}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge color={carga.origen === 'interno' ? 'teal' : 'orange'} variant="light" size="sm">{carga.origen.toUpperCase()}</Badge>
                                            </Table.Td>
                                            <Table.Td fw={900}>{carga.litros} L</Table.Td>
                                            <Table.Td>{carga.kilometrajeAlMomento}</Table.Td>
                                            <Table.Td>
                                                {carga.rendimientoCalculado ? (
                                                    <Badge color="green.7" variant="dot">{carga.rendimientoCalculado} Km/L</Badge>
                                                ) : (
                                                    <Text size="xs" c="dimmed">N/A</Text>
                                                )}
                                            </Table.Td>
                                            {isAdmin && (
                                                <Table.Td ta="center">
                                                    <ActionIcon variant="light" color="red" onClick={() => handleEliminarCarga(carga.id)}>
                                                        <IconTrash size={18} />
                                                    </ActionIcon>
                                                </Table.Td>
                                            )}
                                        </Table.Tr>
                                    ))}
                                    {cargas.length === 0 && !loading && (
                                        <Table.Tr><Table.Td colSpan={isAdmin ? 7 : 6} ta="center" py="xl" c="dimmed">No hay registros de combustible aún.</Table.Td></Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="compras">
                    <Card withBorder shadow="sm" radius="md" p={0} pos="relative">
                        <LoadingOverlay visible={loading} zIndex={100} overlayProps={{ radius: "md", blur: 2 }} />
                        <ScrollArea type="auto" offsetScrollbars>
                            <Table striped highlightOnHover verticalSpacing="md" horizontalSpacing="md" minWidth={700}>
                                <Table.Thead bg="gray.0">
                                    <Table.Tr>
                                        <Table.Th>Fecha</Table.Th>
                                        <Table.Th>Litros Ingresados</Table.Th>
                                        <Table.Th>Costo Factura</Table.Th>
                                        <Table.Th>Costo x Litro</Table.Th>
                                        <Table.Th>Observación</Table.Th>
                                        {isSuperAdmin && <Table.Th ta="center">Acciones</Table.Th>}
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {compras.map((compra) => (
                                        <Table.Tr key={compra.id}>
                                            <Table.Td fw={600} style={{ whiteSpace: 'nowrap' }}>{new Date(compra.fecha).toLocaleDateString()}</Table.Td>
                                            <Table.Td fw={900} c="teal.8">+{parseFloat(compra.cantidad).toLocaleString()} L</Table.Td>
                                            <Table.Td fw={600}>${(parseFloat(compra.cantidad) * parseFloat(compra.costoUnitario)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Table.Td>
                                            <Table.Td c="dimmed">${parseFloat(compra.costoUnitario).toFixed(3)}</Table.Td>
                                            <Table.Td><Text size="sm" lineClamp={2}>{compra.observacion}</Text></Table.Td>
                                            {isSuperAdmin && (
                                                <Table.Td ta="center">
                                                    <ActionIcon variant="light" color="red" onClick={() => handleRevertirCompra(compra.id)} title="Revertir Ingreso">
                                                        <IconTrash size={18} />
                                                    </ActionIcon>
                                                </Table.Td>
                                            )}
                                        </Table.Tr>
                                    ))}
                                    {compras.length === 0 && !loading && (
                                        <Table.Tr><Table.Td colSpan={isSuperAdmin ? 6 : 5} ta="center" py="xl" c="dimmed">No hay historial de compras de gasoil.</Table.Td></Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>
                    </Card>
                </Tabs.Panel>
            </Tabs>

            {/* MODAL DE CONFIRMACIÓN LOCAL PARA ELIMINAR/REVERTIR */}
            <Modal 
                opened={confirmModal.opened} 
                onClose={() => !confirmModal.loading && setConfirmModal(prev => ({ ...prev, opened: false }))} 
                title={<Group gap="xs"><IconAlertTriangle color="red" /><Text fw={700} c="red">{confirmModal.title}</Text></Group>}
                centered
            >
                <Text size="sm" mb="xl">{confirmModal.message}</Text>
                <Group justify="flex-end">
                    <Button variant="default" onClick={() => setConfirmModal(prev => ({ ...prev, opened: false }))} disabled={confirmModal.loading}>
                        Cancelar
                    </Button>
                    <Button color="red" onClick={confirmModal.onConfirm} loading={confirmModal.loading}>
                        Confirmar
                    </Button>
                </Group>
            </Modal>

            <ModalCargarCombustible opened={modalDespachoOpened} onClose={() => setModalDespachoOpened(false)} onSuccess={fetchData} />
            <ModalComprarGasoil opened={modalCompraOpened} onClose={() => setModalCompraOpened(false)} onSuccess={fetchData} tanqueId={tanquePrincipalId} stockActual={stockGasoil} capacidadMaxima={CAPACIDAD_MAXIMA_TANQUE} />
        </Container>
    );
}