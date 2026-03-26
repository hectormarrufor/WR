'use client';
import { useState, useEffect } from 'react';
import {
    Table, Badge, Button, Group, Text, Title, Paper, ActionIcon,
    Modal, Stack, Divider, Box, Tooltip, ScrollArea, FileInput,
    TextInput, NumberInput, Select, Alert, List, Avatar, Card
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
    IconShoppingCart, IconEye, IconCheck, IconX,
    IconPrinter, IconRefresh, IconTrash, IconUpload, IconPlus, IconTrophy, IconAlertTriangle, IconPackage, IconUser
} from '@tabler/icons-react';
import { generarPDFRequisicion } from '@/app/helpers/generarPDFRequisicion';

export default function PanelRequisiciones() {
    const userIdLogueado = 1;
    const esPresidente = userIdLogueado === 1;

    // Detectar si es pantalla móvil (menor a 768px)
    const isMobile = useMediaQuery('(max-width: 48em)');

    const [requisiciones, setRequisiciones] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReq, setSelectedReq] = useState(null);
    const [procesando, setProcesando] = useState(false);

    const [cotizacionForm, setCotizacionForm] = useState({ proveedorId: '', archivo: null, precios: {}, cantidades: {} });
    const [modalProvOpened, setModalProvOpened] = useState(false);
    const [nuevoProv, setNuevoProv] = useState({ nombre: '', rif: '' });
    const [ganadores, setGanadores] = useState({});

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resReq, resProv] = await Promise.all([
                fetch('/api/compras/requisiciones'),
                fetch('/api/compras/proveedores')
            ]);
            const dataReq = await resReq.json();
            const dataProv = await resProv.json();

            if (dataReq.success) setRequisiciones(dataReq.data);
            if (dataProv.success) setProveedores(dataProv.data.map(p => ({ value: p.id.toString(), label: p.nombre })));
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Fallo al cargar datos', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const valoresPrioridad = { 'Critica': 4, 'Alta': 3, 'Media': 2, 'Baja': 1 };

    const requisicionesOrdenadas = [...requisiciones].sort((a, b) => {
        const valA = valoresPrioridad[a.prioridad] || 0;
        const valB = valoresPrioridad[b.prioridad] || 0;
        return valB - valA;
    });

    const abrirModalGestion = (req) => {
        const cantidadesIniciales = {};
        req.detalles?.forEach(det => {
            const solicitado = parseFloat(det.cantidadSolicitada) || 0;
            const stockActual = parseFloat(det.consumible?.stockAlmacen) || 0;
            const stockMinimo = parseFloat(det.consumible?.stockMinimo) || 0;

            let sugerido = solicitado;
            if (stockActual < stockMinimo) sugerido = solicitado + (stockMinimo - stockActual);
            cantidadesIniciales[det.id] = sugerido;
        });

        setCotizacionForm(prev => ({ ...prev, cantidades: cantidadesIniciales, precios: {}, proveedorId: '' }));
        setSelectedReq(req);
        setGanadores({});
    };

    const getColorPrioridad = (p) => ({ 'Critica': 'red.8', 'Alta': 'orange.7', 'Media': 'blue.6', 'Baja': 'gray.6' }[p] || 'gray.5');

    const obtenerInfoActivo = (activo) => {
        if (!activo) return 'Uso General / Almacén';
        const { vehiculoInstancia, remolqueInstancia, maquinaInstancia, codigoInterno } = activo;
        if (vehiculoInstancia?.plantilla) return `${vehiculoInstancia.plantilla.tipoVehiculo || 'Vehículo'} ${vehiculoInstancia.plantilla.marca} ${vehiculoInstancia.plantilla.modelo} [${vehiculoInstancia.placa}]`;
        if (remolqueInstancia?.plantilla) return `${remolqueInstancia.plantilla.tipoRemolque || 'Remolque'} ${remolqueInstancia.plantilla.marca} ${remolqueInstancia.plantilla.modelo} [${remolqueInstancia.placa}]`;
        if (maquinaInstancia?.plantilla) return `${maquinaInstancia.plantilla.tipo || 'Máquina'} ${maquinaInstancia.plantilla.marca} ${maquinaInstancia.plantilla.modelo} [${maquinaInstancia.placa || maquinaInstancia.serialChasis}]`;
        return codigoInterno || 'Activo s/n';
    };

    const handleImprimir = (req) => {
        const infoEquipo = req.hallazgoOrigen?.inspeccion?.activo ? obtenerInfoActivo(req.hallazgoOrigen.inspeccion.activo) : (req.ordenOrigen?.codigo || 'Uso General');
        generarPDFRequisicion(req, infoEquipo, req.hallazgoOrigen?.descripcion || req.justificacion);
    };

    const cambiarEstadoBasico = async (id, nuevoEstado) => {
        setProcesando(true);
        try {
            const res = await fetch(`/api/compras/requisiciones/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });
            if (res.ok) {
                notifications.show({ title: 'Actualizado', message: `Pasó a ${nuevoEstado}`, color: 'teal' });
                setSelectedReq(null);
                fetchData();
            }
        } finally { setProcesando(false); }
    };

    const handleCrearProveedor = async () => {
        if (!nuevoProv.nombre) return notifications.show({ message: 'El nombre es obligatorio', color: 'red' });
        setProcesando(true);
        try {
            const res = await fetch('/api/compras/proveedores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoProv)
            });
            const data = await res.json();
            if (data.success) {
                setProveedores([...proveedores, { value: data.data.id.toString(), label: data.data.nombre }]);
                setCotizacionForm({ ...cotizacionForm, proveedorId: data.data.id.toString() });
                setModalProvOpened(false);
                setNuevoProv({ nombre: '', rif: '' });
                notifications.show({ message: 'Proveedor agregado', color: 'green' });
            } else {
                notifications.show({ title: 'Error', message: data.error, color: 'red' });
            }
        } finally { setProcesando(false); }
    };

    const handleGuardarCotizacion = async () => {
        if (!cotizacionForm.proveedorId) return notifications.show({ message: 'Seleccione un proveedor', color: 'red' });

        setProcesando(true);
        try {
            const payload = {
                requisicionId: selectedReq.id,
                proveedorId: cotizacionForm.proveedorId,
                detalles: Object.entries(cotizacionForm.precios).map(([reqDetalleId, precio]) => {
                    const detalleOriginal = selectedReq.detalles.find(d => d.id == reqDetalleId);
                    return {
                        requisicionDetalleId: parseInt(reqDetalleId),
                        consumibleId: detalleOriginal?.consumibleId,
                        precioUnitario: precio,
                        cantidadOfertada: cotizacionForm.cantidades[reqDetalleId] || detalleOriginal?.cantidadSolicitada || 1
                    };
                })
            };

            const res = await fetch('/api/compras/cotizaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                notifications.show({ message: 'Cotización registrada. Puede cargar otra.', color: 'blue' });
                setCotizacionForm(prev => ({ ...prev, proveedorId: '', archivo: null, precios: {} }));
                fetchData();
                setSelectedReq(null);
            }
        } finally { setProcesando(false); }
    };

    const handleAprobarCuadro = async () => {
        if (Object.keys(ganadores).length !== selectedReq.detalles.length) {
            return notifications.show({ message: 'Debe seleccionar un ganador para CADA ítem', color: 'orange' });
        }
        setProcesando(true);
        try {
            const res = await fetch(`/api/compras/requisiciones/${selectedReq.id}/aprobar-cuadro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ganadores })
            });
            if (res.ok) {
                notifications.show({ title: '¡Aprobada!', message: 'Se han generado las Órdenes de Compra.', color: 'teal' });
                setSelectedReq(null);
                fetchData();
            }
        } finally { setProcesando(false); }
    };

    const eliminarRequisicion = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar esta requisición de forma permanente?")) return;
        try {
            const res = await fetch(`/api/compras/requisiciones/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                notifications.show({ title: 'Eliminada', message: 'Requisición borrada con éxito', color: 'red' });
                setSelectedReq(null);
                fetchData();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        }
    };

    return (
        <Box p={isMobile ? 'xs' : 'md'}>
            <Group justify="space-between" mb="xl">
                <Group gap="sm">
                    <IconShoppingCart size={isMobile ? 24 : 32} color="#fab005" />
                    <Title order={isMobile ? 3 : 2} c="dark.8" tt="uppercase">Requisiciones</Title>
                </Group>
                <Button variant="light" color="gray" size={isMobile ? 'xs' : 'sm'} onClick={fetchData} loading={loading} leftSection={<IconRefresh size={16} />}>
                    Actualizar
                </Button>
            </Group>

            {/* VISTA MÓVIL (Tarjetas en vez de Tabla) */}
            <Box hiddenFrom="sm">
                <Stack gap="sm">
                    {requisicionesOrdenadas.map((req) => (
                        <Card key={req.id} shadow="sm" radius="md" withBorder>
                            <Badge color={getColorPrioridad(req.prioridad)} mb={10}>PRIORIDAD {req.prioridad}</Badge>
                            <Text size="sm" fw={800} c="blue.9" mb="xs">
                                {req.hallazgoOrigen?.inspeccion?.activo ? obtenerInfoActivo(req.hallazgoOrigen.inspeccion.activo) : 'STOCK GENERAL / ALMACÉN'}
                            </Text>
                            <List size="xs" spacing={2} icon={<IconPackage size={20} />} mb="sm">
                                {req.detalles?.map(det => (
                                    <List.Item key={det.id}>
                                        <Text span fz="5vw" fw={800} c="red.7">{det.consumible?.nombre} ({det.cantidadSolicitada} Und)</Text>
                                    </List.Item>
                                ))}
                            </List>


                            <Text fw={900} size="lg">Nro requisicion: {req.codigo}</Text>

                            <Group justify="space-between" mt="md">
                                <Badge variant="dot" color={req.estado === 'Aprobada' ? 'teal' : req.estado === 'En Cotizacion' ? 'blue' : 'orange'}>
                                    {req.estado}
                                </Badge>
                                <Group gap="xs">
                                    <ActionIcon variant="light" color="blue" onClick={() => abrirModalGestion(req)}><IconEye size={18} /></ActionIcon>
                                    {userIdLogueado === 1 && (
                                        <ActionIcon variant="light" color="red" onClick={() => eliminarRequisicion(req.id)}><IconTrash size={18} /></ActionIcon>
                                    )}
                                </Group>
                            </Group>
                        </Card>
                    ))}
                </Stack>
            </Box>

            {/* VISTA ESCRITORIO (La tabla completa) */}
            <Paper withBorder shadow="sm" radius="md" visibleFrom="sm">
                <ScrollArea h={600}>
                    <Table striped highlightOnHover verticalSpacing="md">
                        <Table.Thead bg="dark.9">
                            <Table.Tr>
                                <Table.Th c="white">Repuestos / Ítems</Table.Th>
                                <Table.Th c="white">Equipo Destino</Table.Th>
                                <Table.Th c="white">Solicitado Por</Table.Th>
                                <Table.Th c="white">Estado</Table.Th>
                                <Table.Th c="white">Código Req.</Table.Th>
                                <Table.Th c="white" ta="right">Acciones</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {requisicionesOrdenadas.map((req) => (
                                <Table.Tr key={req.id}>
                                    <Table.Td>
                                        <List size="xs" spacing={4} icon={<IconPackage size={14} />}>
                                            {req.detalles?.map(det => (
                                                <List.Item key={det.id}>
                                                    <Text span fw={800} c="dark.9">{det.cantidadSolicitada}x</Text> {det.consumible?.nombre}
                                                </List.Item>
                                            ))}
                                        </List>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm" fw={800} c="blue.9" style={{ lineHeight: 1.2 }}>
                                            {req.hallazgoOrigen?.inspeccion?.activo ? obtenerInfoActivo(req.hallazgoOrigen.inspeccion.activo) : 'STOCK GENERAL / ALMACÉN'}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs">
                                            <Avatar color="blue" radius="xl" size="sm"><IconUser size="1rem" /></Avatar>
                                            <Box>
                                                <Text size="sm" fw={600}>{req.solicitante?.empleado ? `${req.solicitante.empleado.nombre} ${req.solicitante.empleado.apellido}` : 'Sistema'}</Text>
                                                <Text size="xs" c="dimmed">@{req.solicitante?.user}</Text>
                                            </Box>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Stack gap={4} align="flex-start">
                                            <Badge variant="dot" color={req.estado === 'Aprobada' ? 'teal' : req.estado === 'En Cotizacion' ? 'blue' : 'orange'}>{req.estado}</Badge>
                                            <Badge color={getColorPrioridad(req.prioridad)} size="xs" variant="light">Prioridad: {req.prioridad}</Badge>
                                        </Stack>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text fw={900} size="sm">{req.codigo}</Text>
                                        <Text size="xs" c="dimmed">{new Date(req.fechaSolicitud).toLocaleDateString('es-VE')}</Text>
                                    </Table.Td>
                                    <Table.Td ta="right">
                                        <Group gap="xs" justify="flex-end">
                                            <Tooltip label="Gestionar Requisición">
                                                <ActionIcon variant="light" color="blue" onClick={() => abrirModalGestion(req)}><IconEye size={18} /></ActionIcon>
                                            </Tooltip>
                                            {userIdLogueado === 1 && (
                                                <Tooltip label="Eliminar Definitivamente">
                                                    <ActionIcon variant="light" color="red" onClick={() => eliminarRequisicion(req.id)}><IconTrash size={18} /></ActionIcon>
                                                </Tooltip>
                                            )}
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </Paper>

            {/* MODAL PRINCIPAL DE GESTIÓN (FULLSCREEN EN MÓVIL) */}
            <Modal opened={!!selectedReq} onClose={() => setSelectedReq(null)} title={<Text fw={900} size="lg">GESTIÓN DE REQUISICIÓN</Text>} size="90rem" fullScreen={isMobile}>
                {selectedReq && (
                    <Stack gap="lg">
                        <Group justify="space-between">
                            <Box><Text size={isMobile ? "lg" : "xl"} fw={900}>{selectedReq.codigo}</Text><Badge>{selectedReq.estado}</Badge></Box>
                            <Button variant="outline" color="gray" size="xs" leftSection={<IconPrinter size={14} />} onClick={() => handleImprimir(selectedReq)}>Imprimir</Button>
                        </Group>

                        <Paper withBorder p="md" bg="gray.0" radius="md">
                            <Group gap="xs" mb="xs">
                                <IconAlertTriangle size={20} color={selectedReq.hallazgoOrigen?.impacto === 'Critico' ? 'red' : 'orange'} />
                                <Text fw={800} size="md" c="dark.9" tt="uppercase">Motivo de la Requisición</Text>
                            </Group>
                            <Text size="md" fw={600} fs="italic" mb="sm">"{selectedReq.hallazgoOrigen?.descripcion || selectedReq.justificacion}"</Text>
                        </Paper>

                        {/* TABLA DE DETALLES: En móvil hacemos Scroll horizontal */}
                        <Paper withBorder p={isMobile ? "xs" : "md"} radius="md">
                            <Text fw={800} mb="sm" c="dark.9" tt="uppercase">Repuestos Solicitados</Text>
                            <ScrollArea type="auto">
                                <Table withTableBorder striped miw={isMobile ? 500 : 0}>
                                    <Table.Thead bg="gray.1">
                                        <Table.Tr>
                                            <Table.Th>Detalle Técnico</Table.Th>
                                            <Table.Th ta="center">Cant.</Table.Th>
                                            <Table.Th ta="center">Stock</Table.Th>
                                            <Table.Th ta="center">Mínimo</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {selectedReq.detalles?.map((det) => (
                                            <Table.Tr key={det.id}>
                                                <Table.Td><Text fw={800} size="sm" c="dark.9">{det.consumible?.nombre}</Text></Table.Td>
                                                <Table.Td ta="center"><Text fw={900}>{det.cantidadSolicitada}</Text></Table.Td>
                                                <Table.Td ta="center">
                                                    <Badge color={det.consumible?.stockAlmacen > 0 ? 'green' : 'red'} variant="light" size="lg">{det.consumible?.stockAlmacen || 0}</Badge>
                                                </Table.Td>
                                                <Table.Td ta="center"><Text fw={700} c="dimmed">{det.consumible?.stockMinimo || 0}</Text></Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </ScrollArea>
                        </Paper>

                        {/* --- FASE 1: COMPRAS --- */}
                        {selectedReq.estado === 'En Cotizacion' && !esPresidente && (
                            <Paper withBorder p={isMobile ? "xs" : "md"} radius="md" bg="blue.0">
                                <Text fw={800} c="blue.9" mb="sm">Registrar Oferta (Cotización)</Text>
                                <Stack gap="xs" mb="md">
                                    <Select
                                        label="Proveedor" placeholder="Buscar..."
                                        data={proveedores} searchable
                                        value={cotizacionForm.proveedorId} onChange={(v) => setCotizacionForm({ ...cotizacionForm, proveedorId: v })}
                                    />
                                    <Button variant="light" color="teal" size="xs" leftSection={<IconPlus size={14} />} onClick={() => setModalProvOpened(true)}>Nuevo Proveedor</Button>
                                    <FileInput label="Respaldar PDF" placeholder="Subir Archivo" leftSection={<IconUpload size={14} />} />
                                </Stack>

                                <ScrollArea type="auto">
                                    <Table withTableBorder bg="white" miw={isMobile ? 600 : 0}>
                                        <Table.Thead bg="gray.1">
                                            <Table.Tr>
                                                <Table.Th>Repuesto</Table.Th>
                                                <Table.Th w={isMobile ? 100 : 150} ta="center">Cant. Comprar</Table.Th>
                                                <Table.Th w={isMobile ? 120 : 200}>P. Unitario ($)</Table.Th>
                                                <Table.Th>Subtotal</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {selectedReq.detalles?.map((det) => (
                                                <Table.Tr key={`form-${det.id}`}>
                                                    <Table.Td><Text fw={700} size="sm">{det.consumible?.nombre}</Text></Table.Td>
                                                    <Table.Td>
                                                        <NumberInput placeholder="Cant" min={1} value={cotizacionForm.cantidades[det.id] || det.cantidadSolicitada} onChange={(val) => setCotizacionForm({ ...cotizacionForm, cantidades: { ...cotizacionForm.cantidades, [det.id]: val } })} />
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <NumberInput placeholder="0.00" decimalScale={2} hideControls value={cotizacionForm.precios[det.id] || ''} onChange={(val) => setCotizacionForm({ ...cotizacionForm, precios: { ...cotizacionForm.precios, [det.id]: val } })} />
                                                    </Table.Td>
                                                    <Table.Td fw={800} c="green.7">
                                                        ${((cotizacionForm.precios[det.id] || 0) * (cotizacionForm.cantidades[det.id] || det.cantidadSolicitada)).toFixed(2)}
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </ScrollArea>
                                <Group justify="flex-end" mt="md">
                                    <Button color="blue" onClick={handleGuardarCotizacion} loading={procesando}>Guardar Oferta</Button>
                                </Group>
                            </Paper>
                        )}

                        {/* --- FASE 2: PRESIDENTE --- */}
                        {selectedReq.estado === 'En Cotizacion' && esPresidente && (
                            <Paper withBorder p={isMobile ? "xs" : "md"} radius="md">
                                <Group mb="md" gap="xs">
                                    <IconTrophy color="gold" size={24} />
                                    <Text fw={900} size={isMobile ? "md" : "lg"} c="dark.9" tt="uppercase">Cuadro Comparativo</Text>
                                </Group>

                                {(!selectedReq.cotizaciones || selectedReq.cotizaciones.length === 0) ? (
                                    <Alert color="orange">Compras aún no ha cargado cotizaciones.</Alert>
                                ) : (
                                    <ScrollArea type="auto">
                                        <Table withTableBorder withColumnBorders striped miw={isMobile ? 800 : 0}>
                                            <Table.Thead bg="gray.2">
                                                <Table.Tr>
                                                    <Table.Th>Repuesto</Table.Th>
                                                    {selectedReq.cotizaciones.map((cot, i) => (
                                                        <Table.Th key={`col-${cot.id}`} ta="center" c="blue.9">Opción {i + 1}: {cot.proveedor?.nombre}</Table.Th>
                                                    ))}
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {selectedReq.detalles?.map((det) => (
                                                    <Table.Tr key={`cuadro-${det.id}`}>
                                                        <Table.Td fw={800} size="sm">{det.consumible?.nombre}</Table.Td>

                                                        {selectedReq.cotizaciones.map((cot) => {
                                                            const detalleCotizado = cot.detalles?.find(cd => cd.requisicionDetalleId === det.id);
                                                            const esGanador = ganadores[det.id] === cot.id;

                                                            return (
                                                                <Table.Td key={`celda-${cot.id}-${det.id}`} ta="center" bg={esGanador ? 'teal.0' : undefined}>
                                                                    {detalleCotizado ? (
                                                                        <Stack align="center" gap="xs" p="xs">
                                                                            <Badge color="gray" variant="light" size="xs">C: {detalleCotizado.cantidadOfertada}</Badge>
                                                                            <Text fw={900} size="sm" c={esGanador ? 'teal.9' : 'gray.7'}>${detalleCotizado.precioUnitario}</Text>
                                                                            <Radio color="teal" size={isMobile ? "sm" : "md"} label="Elegir" checked={esGanador} onChange={() => setGanadores({ ...ganadores, [det.id]: cot.id })} />
                                                                        </Stack>
                                                                    ) : (
                                                                        <Text size="xs" c="dimmed">No cotizó</Text>
                                                                    )}
                                                                </Table.Td>
                                                            );
                                                        })}
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    </ScrollArea>
                                )}

                                <Group justify="flex-end" mt="xl">
                                    <Button color="teal" size={isMobile ? "sm" : "lg"} fullWidth={isMobile} leftSection={<IconCheck />} onClick={handleAprobarCuadro} loading={procesando}>
                                        Aprobar y Generar OC
                                    </Button>
                                </Group>
                            </Paper>
                        )}

                        <Divider my="sm" />

                        <Group justify="space-between" align="center">
                            <Button variant="subtle" color="red" size={isMobile ? "xs" : "sm"} leftSection={<IconX size={16} />} onClick={() => cambiarEstadoBasico(selectedReq.id, 'Rechazada')} loading={procesando}>Rechazar</Button>
                            {selectedReq.estado === 'Pendiente' && (
                                <Button color="blue" size={isMobile ? "xs" : "sm"} leftSection={<IconShoppingCart size={18} />} onClick={() => cambiarEstadoBasico(selectedReq.id, 'En Cotizacion')} loading={procesando}>A Cotización</Button>
                            )}
                        </Group>
                    </Stack>
                )}
            </Modal>

            {/* MODAL CREAR PROVEEDOR RÁPIDO */}
            <Modal opened={modalProvOpened} onClose={() => setModalProvOpened(false)} title="Nuevo Proveedor" size="sm" zIndex={2000} fullScreen={isMobile}>
                <Stack>
                    <TextInput label="Nombre Comercial" required value={nuevoProv.nombre} onChange={(e) => setNuevoProv({ ...nuevoProv, nombre: e.currentTarget.value })} />
                    <TextInput label="RIF" placeholder="J-12345678-9" value={nuevoProv.rif} onChange={(e) => setNuevoProv({ ...nuevoProv, rif: e.currentTarget.value })} />
                    <Button fullWidth mt="md" onClick={handleCrearProveedor} loading={procesando}>Guardar Proveedor</Button>
                </Stack>
            </Modal>
        </Box>
    );
}