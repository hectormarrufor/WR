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
    IconPrinter, IconRefresh, IconTrash, IconUpload, IconPlus, 
    IconTrophy, IconAlertTriangle, IconPackage, IconUser, IconSend
} from '@tabler/icons-react';
import { generarPDFRequisicion } from '@/app/helpers/generarPDFRequisicion';

// Importamos tu hook de autenticación
import { useAuth } from '@/hooks/useAuth';

export default function PanelRequisiciones() {
    const { userId, departamentos } = useAuth(); 
    
    // Lógica de Permisos
    const esPresidente = userId === 1; // Presidencia autoriza y aprueba dinero
    const esCompras = departamentos?.some(dep => dep.nombre?.toUpperCase() === 'COMPRAS') || userId === 1;

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
    
    const getColorEstado = (estado) => {
        switch(estado) {
            case 'Aprobada': return 'teal';
            case 'En Evaluacion': return 'grape'; // Fase Presidente evaluando plata
            case 'En Cotizacion': return 'blue';  // Fase Compras
            case 'Rechazada': return 'red';
            default: return 'orange';             // Fase Pendiente de Autorización
        }
    };

    const obtenerInfoActivo = (activo) => {
        if (!activo) return 'Uso General / Almacén';
        const { vehiculoInstancia, remolqueInstancia, maquinaInstancia, codigoInterno } = activo;
        if (vehiculoInstancia?.plantilla) return `${vehiculoInstancia.plantilla.marca} ${vehiculoInstancia.plantilla.modelo} [${vehiculoInstancia.placa}]`;
        if (remolqueInstancia?.plantilla) return `${remolqueInstancia.plantilla.marca} ${remolqueInstancia.plantilla.modelo} [${remolqueInstancia.placa}]`;
        if (maquinaInstancia?.plantilla) return `${maquinaInstancia.plantilla.marca} ${maquinaInstancia.plantilla.modelo} [${maquinaInstancia.placa || maquinaInstancia.serialChasis}]`;
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
                notifications.show({ message: 'Cotización registrada. Puede cargar otra o enviar a Presidencia.', color: 'blue' });
                setCotizacionForm(prev => ({ ...prev, proveedorId: '', archivo: null, precios: {} }));
                // Refrescamos data localmente sin cerrar el modal para que siga cargando
                fetchData(); 
                const updatedReqResponse = await fetch('/api/compras/requisiciones');
                const updatedReqData = await updatedReqResponse.json();
                if(updatedReqData.success) {
                    setSelectedReq(updatedReqData.data.find(r => r.id === selectedReq.id));
                }
            }
        } finally { setProcesando(false); }
    };

    const handleAprobarCuadro = async () => {
        if (Object.keys(ganadores).length !== selectedReq.detalles.length) {
            return notifications.show({ message: 'Debe seleccionar un ganador para CADA ítem antes de aprobar.', color: 'orange' });
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
            } else { throw new Error(data.error); }
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
                <Button variant="light" color="gray" size={isMobile ? 'xs' : 'sm'} onClick={fetchData} loading={loading} leftSection={<IconRefresh size={16}/>}>
                    Actualizar
                </Button>
            </Group>

            {/* VISTA MÓVIL (Tarjetas) */}
            <Box hiddenFrom="sm">
                <Stack gap="sm">
                    {requisicionesOrdenadas.map((req) => (
                        <Card key={req.id} shadow="sm" radius="md" withBorder>
                            <Group justify="space-between" mb="xs">
                                <Text fw={900} size="lg">{req.codigo}</Text>
                                <Badge color={getColorPrioridad(req.prioridad)}>{req.prioridad}</Badge>
                            </Group>
                            
                            <Text size="sm" fw={800} c="blue.9" mb="xs">
                                {req.hallazgoOrigen?.inspeccion?.activo ? obtenerInfoActivo(req.hallazgoOrigen.inspeccion.activo) : 'STOCK GENERAL / ALMACÉN'}
                            </Text>

                            <List size="xs" spacing={2} icon={<IconPackage size={14} />} mb="sm">
                                {req.detalles?.map(det => (
                                    <List.Item key={det.id}>
                                        <Text span fw={800} c="dark.9">{det.cantidadSolicitada}x</Text> {det.consumible?.nombre}
                                    </List.Item>
                                ))}
                            </List>

                            <Group justify="space-between" mt="md">
                                <Badge variant="dot" color={getColorEstado(req.estado)}>
                                    {req.estado === 'Pendiente' ? 'Falta Autorización' : req.estado}
                                </Badge>
                                <Group gap="xs">
                                    <ActionIcon variant="light" color="blue" onClick={() => abrirModalGestion(req)}><IconEye size={18} /></ActionIcon>
                                    {esPresidente && (
                                        <ActionIcon variant="light" color="red" onClick={() => eliminarRequisicion(req.id)}><IconTrash size={18} /></ActionIcon>
                                    )}
                                </Group>
                            </Group>
                        </Card>
                    ))}
                </Stack>
            </Box>

            {/* VISTA ESCRITORIO (Tabla) */}
            <Paper withBorder shadow="sm" radius="md" visibleFrom="sm">
                <ScrollArea h={600}>
                    <Table striped highlightOnHover verticalSpacing="md">
                        <Table.Thead bg="dark.9">
                            <Table.Tr>
                                <Table.Th c="white">Repuestos Solicitados</Table.Th>
                                <Table.Th c="white">Equipo Destino</Table.Th>
                                <Table.Th c="white">Solicitado Por</Table.Th>
                                <Table.Th c="white">Estado del Flujo</Table.Th>
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
                                            <Badge variant="dot" color={getColorEstado(req.estado)}>
                                                {req.estado === 'Pendiente' ? 'Falta Autorización' : req.estado}
                                            </Badge>
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
                                            {esPresidente && (
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

            {/* MODAL PRINCIPAL DE GESTIÓN (MÁQUINA DE ESTADOS) */}
            <Modal opened={!!selectedReq} onClose={() => setSelectedReq(null)} title={<Text fw={900} size="lg">GESTIÓN DE REQUISICIÓN</Text>} size="90rem" fullScreen={isMobile}>
                {selectedReq && (
                    <Stack gap="lg">
                        <Group justify="space-between">
                            <Box>
                                <Text size={isMobile ? "lg" : "xl"} fw={900}>{selectedReq.codigo}</Text>
                                <Badge color={getColorEstado(selectedReq.estado)}>{selectedReq.estado}</Badge>
                            </Box>
                            <Button variant="outline" color="gray" size="xs" leftSection={<IconPrinter size={14}/>} onClick={() => handleImprimir(selectedReq)}>Imprimir</Button>
                        </Group>

                        {/* INFO DE LA FALLA */}
                        <Paper withBorder p="md" bg="gray.0" radius="md">
                            <Group gap="xs" mb="xs">
                                <IconAlertTriangle size={20} color={selectedReq.hallazgoOrigen?.impacto === 'Critico' ? 'red' : 'orange'} />
                                <Text fw={800} size="md" c="dark.9" tt="uppercase">Justificación Técnica (¿Por qué se pide?)</Text>
                            </Group>
                            <Text size="md" fw={600} fs="italic" mb="sm">"{selectedReq.hallazgoOrigen?.descripcion || selectedReq.justificacion}"</Text>
                        </Paper>

                        {/* TABLA DE DETALLES UNIVERSAL */}
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

                        {/* 🔥 FASE 1: ESPERANDO AUTORIZACIÓN TÉCNICA DEL PRESIDENTE 🔥 */}
                        {selectedReq.estado === 'Pendiente' && (
                            <Paper withBorder p="md" radius="md" bg="orange.0" style={{ borderColor: 'orange' }}>
                                <Group justify="space-between" align="center">
                                    <Box>
                                        <Text fw={900} c="orange.9" size="lg">Fase 1: Autorización Técnica Requerida</Text>
                                        <Text size="sm" fw={600} c="dimmed">Compras no puede buscar precios hasta que Presidencia dé luz verde.</Text>
                                    </Box>
                                    {esPresidente ? (
                                        <Group>
                                            <Button variant="outline" color="red" leftSection={<IconX size={16}/>} onClick={() => cambiarEstadoBasico(selectedReq.id, 'Rechazada')} loading={procesando}>Rechazar Petición</Button>
                                            <Button color="teal" size="md" leftSection={<IconCheck size={18}/>} onClick={() => cambiarEstadoBasico(selectedReq.id, 'En Cotizacion')} loading={procesando}>
                                                Dar Luz Verde a Compras
                                            </Button>
                                        </Group>
                                    ) : (
                                        <Badge color="orange" size="lg" variant="filled">Esperando al Presidente...</Badge>
                                    )}
                                </Group>
                            </Paper>
                        )}

                        {/* 🔥 FASE 2: COMPRAS TRABAJANDO (CARGANDO OFERTAS) 🔥 */}
                        {selectedReq.estado === 'En Cotizacion' && (
                            <Paper withBorder p={isMobile ? "xs" : "md"} radius="md" bg="blue.0" style={{ borderColor: '#339af0' }}>
                                <Group justify="space-between" mb="sm">
                                    <Box>
                                        <Text fw={900} c="blue.9" size="lg">Fase 2: Cotización de Proveedores</Text>
                                        <Text size="sm" fw={600} c="dimmed">Compras está armando el cuadro comparativo.</Text>
                                    </Box>
                                    <Badge color="blue" variant="filled">Ofertas actuales: {selectedReq.cotizaciones?.length || 0}</Badge>
                                </Group>

                                {/* Solo el departamento de Compras ve el formulario para agregar */}
                                {esCompras && (
                                    <>
                                        <Divider my="md" />
                                        <Stack gap="xs" mb="md">
                                            <Select label="Proveedor" placeholder="Buscar..." data={proveedores} searchable value={cotizacionForm.proveedorId} onChange={(v) => setCotizacionForm({...cotizacionForm, proveedorId: v})} />
                                            <Button variant="light" color="teal" size="xs" leftSection={<IconPlus size={14}/>} onClick={() => setModalProvOpened(true)} w={180}>Nuevo Proveedor</Button>
                                            <FileInput label="Respaldar PDF" placeholder="Subir Archivo" leftSection={<IconUpload size={14}/>} />
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
                                                                <NumberInput placeholder="Cant" min={1} value={cotizacionForm.cantidades[det.id] || det.cantidadSolicitada} onChange={(val) => setCotizacionForm({ ...cotizacionForm, cantidades: { ...cotizacionForm.cantidades, [det.id]: val }})} />
                                                            </Table.Td>
                                                            <Table.Td>
                                                                <NumberInput placeholder="0.00" decimalScale={2} hideControls value={cotizacionForm.precios[det.id] || ''} onChange={(val) => setCotizacionForm({ ...cotizacionForm, precios: { ...cotizacionForm.precios, [det.id]: val }})} />
                                                            </Table.Td>
                                                            <Table.Td fw={800} c="green.7">
                                                                ${ ((cotizacionForm.precios[det.id] || 0) * (cotizacionForm.cantidades[det.id] || det.cantidadSolicitada)).toFixed(2) }
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    ))}
                                                </Table.Tbody>
                                            </Table>
                                        </ScrollArea>
                                        <Group justify="flex-end" mt="md">
                                            <Button variant="outline" color="blue" onClick={handleGuardarCotizacion} loading={procesando}>Guardar esta Oferta</Button>
                                            
                                            {/* BOTÓN PARA PASAR A FASE 3 */}
                                            {selectedReq.cotizaciones?.length > 0 && (
                                                <Button color="blue" leftSection={<IconSend size={16}/>} onClick={() => cambiarEstadoBasico(selectedReq.id, 'En Evaluacion')} loading={procesando}>
                                                    Terminé, Enviar a Evaluación
                                                </Button>
                                            )}
                                        </Group>
                                    </>
                                )}
                            </Paper>
                        )}

                        {/* 🔥 FASE 3: PRESIDENTE EVALUANDO FINANZAS (CUADRO COMPARATIVO) 🔥 */}
                        {(selectedReq.estado === 'En Evaluacion' || selectedReq.estado === 'Aprobada') && (
                            <Paper withBorder p={isMobile ? "xs" : "md"} radius="md" bg={selectedReq.estado === 'Aprobada' ? 'teal.0' : undefined}>
                                <Group mb="md" gap="xs">
                                    <IconTrophy color="gold" size={24}/>
                                    <Text fw={900} size={isMobile ? "md" : "lg"} c="dark.9" tt="uppercase">
                                        {selectedReq.estado === 'Aprobada' ? 'Cuadro Comparativo Aprobado' : 'Fase 3: Evaluación Financiera'}
                                    </Text>
                                </Group>
                                
                                <ScrollArea type="auto">
                                    <Table withTableBorder withColumnBorders striped miw={isMobile ? 800 : 0}>
                                        <Table.Thead bg="gray.2">
                                            <Table.Tr>
                                                <Table.Th>Repuesto</Table.Th>
                                                {selectedReq.cotizaciones?.map((cot, i) => (
                                                    <Table.Th key={`col-${cot.id}`} ta="center" c="blue.9">Opción {i+1}: {cot.proveedor?.nombre}</Table.Th>
                                                ))}
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {selectedReq.detalles?.map((det) => (
                                                <Table.Tr key={`cuadro-${det.id}`}>
                                                    <Table.Td fw={800} size="sm">{det.consumible?.nombre}</Table.Td>
                                                    
                                                    {selectedReq.cotizaciones?.map((cot) => {
                                                        const detalleCotizado = cot.detalles?.find(cd => cd.requisicionDetalleId === det.id);
                                                        
                                                        // Si ya está aprobada, el ganador está en la base de datos (estadoSeleccion)
                                                        // Si está en evaluación, el ganador está en el state local de React (Radio button)
                                                        const esGanadorConfirmado = detalleCotizado?.estadoSeleccion === 'Ganador';
                                                        const esGanadorTemporal = ganadores[det.id] === cot.id;
                                                        const pintarVerde = selectedReq.estado === 'Aprobada' ? esGanadorConfirmado : esGanadorTemporal;

                                                        return (
                                                            <Table.Td key={`celda-${cot.id}-${det.id}`} ta="center" bg={pintarVerde ? 'teal.0' : undefined}>
                                                                {detalleCotizado ? (
                                                                    <Stack align="center" gap="xs" p="xs">
                                                                        <Badge color="gray" variant="light" size="xs">C: {detalleCotizado.cantidadOfertada}</Badge>
                                                                        <Text fw={900} size="sm" c={pintarVerde ? 'teal.9' : 'gray.7'}>${detalleCotizado.precioUnitario}</Text>
                                                                        
                                                                        {/* Solo mostramos los Radio Buttons si es el Presidente y está en Evaluación */}
                                                                        {selectedReq.estado === 'En Evaluacion' && esPresidente && (
                                                                            <Radio color="teal" size={isMobile ? "sm" : "md"} label="Elegir" checked={esGanadorTemporal} onChange={() => setGanadores({ ...ganadores, [det.id]: cot.id })} />
                                                                        )}
                                                                        
                                                                        {/* Etiqueta Visual de Ganador para cuando ya se aprobó */}
                                                                        {selectedReq.estado === 'Aprobada' && esGanadorConfirmado && (
                                                                            <Badge color="teal" variant="filled" leftSection={<IconCheck size={10}/>}>Elegido</Badge>
                                                                        )}
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

                                {/* Botón de Aprobación Final solo para Presidencia */}
                                {selectedReq.estado === 'En Evaluacion' && esPresidente && (
                                    <Group justify="flex-end" mt="xl">
                                        <Button variant="outline" color="red" leftSection={<IconX size={16}/>} onClick={() => cambiarEstadoBasico(selectedReq.id, 'Rechazada')} loading={procesando}>Rechazar Todos los Presupuestos</Button>
                                        <Button color="teal" size={isMobile ? "sm" : "lg"} leftSection={<IconCheck />} onClick={handleAprobarCuadro} loading={procesando}>
                                            Aprobar Ganadores y Generar OC
                                        </Button>
                                    </Group>
                                )}
                                
                                {selectedReq.estado === 'En Evaluacion' && !esPresidente && (
                                    <Alert color="grape" mt="md" title="Esperando Decisión Financiera">
                                        La gerencia está evaluando el cuadro comparativo para emitir las Órdenes de Compra.
                                    </Alert>
                                )}
                            </Paper>
                        )}
                    </Stack>
                )}
            </Modal>

            {/* MODAL CREAR PROVEEDOR RÁPIDO */}
            <Modal opened={modalProvOpened} onClose={() => setModalProvOpened(false)} title="Nuevo Proveedor" size="sm" zIndex={2000} fullScreen={isMobile}>
                <Stack>
                    <TextInput label="Nombre Comercial" required value={nuevoProv.nombre} onChange={(e) => setNuevoProv({...nuevoProv, nombre: e.currentTarget.value})} />
                    <TextInput label="RIF" placeholder="J-12345678-9" value={nuevoProv.rif} onChange={(e) => setNuevoProv({...nuevoProv, rif: e.currentTarget.value})} />
                    <Button fullWidth mt="md" onClick={handleCrearProveedor} loading={procesando}>Guardar Proveedor</Button>
                </Stack>
            </Modal>
        </Box>
    );
}