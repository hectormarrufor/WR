'use client';
import { useState, useEffect } from 'react';
import { 
    Table, Badge, Button, Group, Text, Title, Paper, ActionIcon, 
    Modal, Stack, Divider, Box, Tooltip, ScrollArea, Card, Checkbox, 
    Select, NumberInput, Avatar, Image, Grid
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { 
    IconCarCrash, IconRefresh, IconShoppingCartPlus, IconPlus, IconTrash, 
    IconUser, IconCheck, IconFileInvoice, IconEye, IconAlertTriangle, IconCalendar
} from '@tabler/icons-react';

import { useAuth } from '@/hooks/useAuth'; 

export default function PanelFallas() {
    // Extraemos userId y departamentos del contexto
    const { userId, departamentos } = useAuth(); 
    const isMobile = useMediaQuery('(max-width: 48em)');

    // Lógica de Permisos: Es el SuperUsuario(1) o pertenece al departamento de IT
    // (Ajusta el string 'IT' al nombre exacto que tengas en tu base de datos)
    const puedeCrearReq = userId === 1 || departamentos?.some(dep => dep.nombre?.toUpperCase() === 'IT');

    const blobBaseUrl = process.env.NEXT_PUBLIC_BLOB_BASE_URL || '';

    const [fallas, setFallas] = useState([]);
    const [consumibles, setConsumibles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);

    const [seleccionadas, setSeleccionadas] = useState([]);
    const [modalBatchOpened, setModalBatchOpened] = useState(false);
    const [repuestosAsignados, setRepuestosAsignados] = useState({});
    
    const [selectedFalla, setSelectedFalla] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resFallas, resConsumibles] = await Promise.all([
                fetch('/api/gestionMantenimiento/hallazgos/pendientes'),
                fetch('/api/inventario/consumibles') 
            ]);
            
            const dataFallas = await resFallas.json();
            const dataConsumibles = await resConsumibles.json();
            
            if (dataFallas.success) setFallas(dataFallas.data);
            if (dataConsumibles.success) {
                setConsumibles(dataConsumibles.data.map(c => ({ value: c.id.toString(), label: c.nombre })));
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: 'No se pudieron cargar los datos', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const valoresImpacto = { 'No Operativo': 3, 'Advertencia': 2, 'Operativo': 1 };
    
    const fallasOrdenadas = [...fallas].sort((a, b) => {
        const valA = valoresImpacto[a.impacto] || 0;
        const valB = valoresImpacto[b.impacto] || 0;
        return valB - valA; 
    });

    const getColorImpacto = (impacto) => ({ 'No Operativo': 'red', 'Advertencia': 'orange', 'Operativo': 'green' }[impacto] || 'gray');

    const toggleSeleccion = (id) => {
        setSeleccionadas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleTodas = () => {
        const fallasElegibles = fallasOrdenadas.filter(f => !f.requisiciones || f.requisiciones.length === 0);
        setSeleccionadas(seleccionadas.length === fallasElegibles.length ? [] : fallasElegibles.map(f => f.id));
    };

    const eliminarFallasLote = async () => {
        if (!window.confirm(`¿Estás seguro de eliminar permanentemente ${seleccionadas.length} fallas seleccionadas?`)) return;
        setProcesando(true);
        try {
            const res = await fetch('/api/gestionMantenimiento/hallazgos/lote', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: seleccionadas })
            });
            const data = await res.json();
            if (data.success) {
                notifications.show({ title: 'Eliminadas', message: 'Fallas purgadas del sistema', color: 'red' });
                setSeleccionadas([]);
                fetchData();
            } else { throw new Error(data.error); }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally { setProcesando(false); }
    };

    const iniciarCreacionLote = () => {
        if (seleccionadas.length === 0) return notifications.show({ message: 'Seleccione al menos una falla', color: 'orange' });
        const iniciales = {};
        seleccionadas.forEach(id => { iniciales[id] = [{ consumibleId: '', cantidad: 1 }]; });
        setRepuestosAsignados(iniciales);
        setModalBatchOpened(true);
    };

    const agregarLineaRepuesto = (fallaId) => setRepuestosAsignados(prev => ({ ...prev, [fallaId]: [...prev[fallaId], { consumibleId: '', cantidad: 1 }] }));
    const eliminarLineaRepuesto = (fallaId, indexLinea) => setRepuestosAsignados(prev => ({ ...prev, [fallaId]: prev[fallaId].filter((_, i) => i !== indexLinea) }));
    const actualizarLinea = (fallaId, indexLinea, campo, valor) => setRepuestosAsignados(prev => {
        const nuevasLineas = [...prev[fallaId]];
        nuevasLineas[indexLinea][campo] = valor;
        return { ...prev, [fallaId]: nuevasLineas };
    });

    const generarRequisicionesLote = async () => {
        setProcesando(true);
        try {
            let valido = true;
            const payloads = seleccionadas.map(fallaId => {
                const falla = fallasOrdenadas.find(f => f.id === fallaId);
                const lineas = repuestosAsignados[fallaId];
                lineas.forEach(l => { if (!l.consumibleId) valido = false; });

                return {
                    solicitadoPorId: userId,
                    hallazgoId: fallaId,
                    justificacion: `Solución para hallazgo: ${falla.descripcion}`,
                    prioridad: falla.impacto === 'No Operativo' ? 'Critica' : (falla.impacto === 'Advertencia' ? 'Alta' : 'Media'),
                    detalles: lineas.map(l => ({ consumibleId: parseInt(l.consumibleId), cantidadSolicitada: l.cantidad }))
                };
            });

            if (!valido) throw new Error("Asegúrese de seleccionar un repuesto en todas las líneas creadas.");

            const res = await fetch('/api/compras/requisiciones/lote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requisiciones: payloads })
            });

            const data = await res.json();
            if (data.success) {
                notifications.show({ title: 'Éxito', message: `Se generaron ${payloads.length} requisiciones.`, color: 'teal' });
                setModalBatchOpened(false);
                setSeleccionadas([]);
                fetchData();
            } else { throw new Error(data.error); }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally { setProcesando(false); }
    };
    
    const obtenerInfoActivo = (activo) => {
        if (!activo) return 'Equipo no especificado';
        const { vehiculoInstancia, remolqueInstancia, maquinaInstancia, codigoInterno } = activo;
        if (vehiculoInstancia?.plantilla) return `${vehiculoInstancia.plantilla.marca} ${vehiculoInstancia.plantilla.modelo} [${vehiculoInstancia.placa}]`;
        if (remolqueInstancia?.plantilla) return `${remolqueInstancia.plantilla.marca} ${remolqueInstancia.plantilla.modelo} [${remolqueInstancia.placa}]`;
        if (maquinaInstancia?.plantilla) return `${maquinaInstancia.plantilla.marca} ${maquinaInstancia.plantilla.modelo} [${maquinaInstancia.placa || maquinaInstancia.serialChasis}]`;
        return codigoInterno || 'Activo s/n';
    };

    const getUrlImagen = (path) => path ? `${blobBaseUrl}/${path}` : null;

    return (
        <Box p={isMobile ? 'xs' : 'md'}>
            <Group justify="space-between" mb="xl">
                <Group gap="sm">
                    <IconCarCrash size={isMobile ? 28 : 36} color="#fa5252" />
                    <Title order={isMobile ? 3 : 2} c="dark.8" tt="uppercase">Backlog de Fallas</Title>
                </Group>
                
                <Group gap="sm">
                    {/* Renderiza los botones de lote SOLO si hay selección y tiene permisos */}
                    {seleccionadas.length > 0 && puedeCrearReq && (
                        <Group gap="sm">
                            {userId === 1 && (
                                <Button color="red" variant="light" leftSection={<IconTrash size={16}/>} onClick={eliminarFallasLote} loading={procesando}>
                                    Eliminar ({seleccionadas.length})
                                </Button>
                            )}
                            <Button color="teal" leftSection={<IconShoppingCartPlus size={16}/>} onClick={iniciarCreacionLote}>
                                Crear Req. ({seleccionadas.length})
                            </Button>
                        </Group>
                    )}
                    <Button variant="light" color="gray" size={isMobile ? 'xs' : 'sm'} onClick={fetchData} loading={loading}>
                        <IconRefresh size={16}/>
                    </Button>
                </Group>
            </Group>

            {/* VISTA MÓVIL */}
            <Box hiddenFrom="sm">
                <Stack gap="sm">
                    {fallasOrdenadas.map((falla) => {
                        const tieneReq = falla.requisiciones && falla.requisiciones.length > 0;
                        return (
                            <Card key={falla.id} shadow="sm" radius="md" withBorder style={{ borderColor: seleccionadas.includes(falla.id) ? '#20c997' : undefined, opacity: tieneReq ? 0.7 : 1 }}>
                                <Group justify="space-between" mb="xs" align="flex-start">
                                    {/* Muestra checkbox si puede crear req y no tiene ya una asignada */}
                                    {puedeCrearReq ? (
                                        <Checkbox 
                                            color="teal" 
                                            checked={seleccionadas.includes(falla.id)} 
                                            onChange={() => toggleSeleccion(falla.id)} 
                                            disabled={tieneReq}
                                        />
                                    ) : (
                                        <Box /> // Espaciador para mantener al badge a la derecha
                                    )}
                                    <Badge color={getColorImpacto(falla.impacto)} variant="filled">{falla.impacto}</Badge>
                                </Group>
                                <Text size="sm" fw={900} c="blue.9">{obtenerInfoActivo(falla.inspeccion?.activo)}</Text>
                                <Text size="sm" fw={600} mb="xs" lineClamp={2}>"{falla.descripcion}"</Text>
                                
                                <Group justify="space-between" mt="md">
                                    <Group gap="xs">
                                        <Avatar src={getUrlImagen(falla.inspeccion?.reportadoPor?.empleado?.foto || falla.inspeccion?.reportadoPor?.empleado?.imagen)} color="blue" radius="xl" size="xs">
                                            <IconUser size="0.8rem" />
                                        </Avatar>
                                        <Text size="xs" c="dimmed">
                                            {falla.inspeccion?.reportadoPor?.empleado ? `${falla.inspeccion.reportadoPor.empleado.nombre}` : falla.inspeccion?.reportadoPor?.user}
                                        </Text>
                                    </Group>
                                    <Group gap="xs">
                                        <ActionIcon variant="light" color="blue" onClick={() => setSelectedFalla(falla)}>
                                            <IconEye size={18} />
                                        </ActionIcon>
                                        {tieneReq ? (
                                            <Badge color="blue" variant="light" leftSection={<IconFileInvoice size={12}/>}>
                                                {falla.requisiciones[0].codigo}
                                            </Badge>
                                        ) : (
                                            <Badge color="gray" variant="outline">Sin Req.</Badge>
                                        )}
                                    </Group>
                                </Group>
                            </Card>
                        )
                    })}
                </Stack>
            </Box>

            {/* VISTA ESCRITORIO */}
            <Paper withBorder shadow="sm" radius="md" visibleFrom="sm">
                <ScrollArea h={600}>
                    <Table striped highlightOnHover verticalSpacing="md">
                        <Table.Thead bg="dark.9">
                            <Table.Tr>
                                <Table.Th w={40}>
                                    {puedeCrearReq && (
                                        <Checkbox 
                                            color="teal" 
                                            onChange={toggleTodas} 
                                            checked={seleccionadas.length > 0} 
                                            indeterminate={seleccionadas.length > 0 && seleccionadas.length < fallasOrdenadas.filter(f => !f.requisiciones?.length).length} 
                                        />
                                    )}
                                </Table.Th>
                                <Table.Th c="white" w={100}>Fecha</Table.Th>
                                <Table.Th c="white">Equipo Afectado</Table.Th>
                                <Table.Th c="white">Falla Reportada</Table.Th>
                                <Table.Th c="white">Reportado Por</Table.Th>
                                <Table.Th c="white" ta="center">Requisición</Table.Th>
                                <Table.Th c="white" ta="center">Impacto</Table.Th>
                                <Table.Th c="white" ta="right">Detalle</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {fallasOrdenadas.map((falla) => {
                                const tieneReq = falla.requisiciones && falla.requisiciones.length > 0;
                                return (
                                    <Table.Tr key={falla.id} bg={seleccionadas.includes(falla.id) ? 'teal.0' : undefined} style={{ opacity: tieneReq ? 0.6 : 1 }}>
                                        <Table.Td>
                                            {puedeCrearReq && (
                                                <Checkbox 
                                                    color="teal" 
                                                    checked={seleccionadas.includes(falla.id)} 
                                                    onChange={() => toggleSeleccion(falla.id)} 
                                                    disabled={tieneReq}
                                                />
                                            )}
                                        </Table.Td>
                                        <Table.Td><Text size="sm" fw={700}>{new Date(falla.createdAt).toLocaleDateString('es-VE')}</Text></Table.Td>
                                        <Table.Td><Text size="sm" fw={900} c="blue.9">{obtenerInfoActivo(falla.inspeccion?.activo)}</Text></Table.Td>
                                        <Table.Td><Text size="sm" fw={600}>"{falla.descripcion}"</Text></Table.Td>
                                        <Table.Td>
                                            <Group gap="xs">
                                                <Avatar src={getUrlImagen(falla.inspeccion?.reportadoPor?.empleado?.foto || falla.inspeccion?.reportadoPor?.empleado?.imagen)} color="blue" radius="xl" size="sm">
                                                    <IconUser size="1rem" />
                                                </Avatar>
                                                <Text size="sm" fw={600}>
                                                    {falla.inspeccion?.reportadoPor?.empleado ? `${falla.inspeccion.reportadoPor.empleado.nombre} ${falla.inspeccion.reportadoPor.empleado.apellido}` : falla.inspeccion?.reportadoPor?.user}
                                                </Text>
                                            </Group>
                                        </Table.Td>
                                        
                                        <Table.Td ta="center">
                                            {tieneReq ? (
                                                <Tooltip label={`Estado: ${falla.requisiciones[0].estado}`}>
                                                    <Badge color="blue" variant="light" leftSection={<IconFileInvoice size={14}/>}>
                                                        {falla.requisiciones[0].codigo}
                                                    </Badge>
                                                </Tooltip>
                                            ) : (
                                                <Badge color="gray" variant="outline">Pendiente</Badge>
                                            )}
                                        </Table.Td>

                                        <Table.Td ta="center"><Badge color={getColorImpacto(falla.impacto)} variant="filled">{falla.impacto}</Badge></Table.Td>
                                        <Table.Td ta="right">
                                            <Tooltip label="Ver Detalle Completo">
                                                <ActionIcon variant="light" color="blue" onClick={() => setSelectedFalla(falla)}>
                                                    <IconEye size={18} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Table.Td>
                                    </Table.Tr>
                                )
                            })}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </Paper>

            <Modal opened={!!selectedFalla} onClose={() => setSelectedFalla(null)} title={<Text fw={900} size="lg" tt="uppercase">Inspección de Falla</Text>} size="xl" fullScreen={isMobile}>
                {selectedFalla && (
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Box>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={800}>Código de Falla / Hallazgo</Text>
                                <Text size={isMobile ? "lg" : "xl"} fw={900}>#{selectedFalla.id.toString().padStart(5, '0')}</Text>
                            </Box>
                            <Badge color={getColorImpacto(selectedFalla.impacto)} size="lg" variant="filled">{selectedFalla.impacto}</Badge>
                        </Group>

                        <Divider />

                        <Grid>
                            <Grid.Col span={isMobile ? 12 : 7}>
                                <Stack gap="md">
                                    <Paper withBorder p="md" radius="md">
                                        <Text size="xs" c="dimmed" tt="uppercase" fw={800} mb="xs">Equipo Afectado</Text>
                                        <Group wrap="nowrap">
                                            <Image 
                                                src={getUrlImagen(selectedFalla.inspeccion?.activo?.imagen)} 
                                                fallbackSrc="https://placehold.co/150x150?text=Sin+Foto"
                                                w={80} h={80} radius="md" fit="cover"
                                            />
                                            <Box>
                                                <Text size="lg" fw={900} c="blue.9">{obtenerInfoActivo(selectedFalla.inspeccion?.activo)}</Text>
                                                <Text size="sm" fw={600} c="dimmed">Cod: {selectedFalla.inspeccion?.activo?.codigoInterno}</Text>
                                            </Box>
                                        </Group>
                                    </Paper>

                                    <Paper withBorder p="md" bg="red.0" radius="md">
                                        <Group gap="xs" mb="sm">
                                            <IconAlertTriangle size={20} color="red" />
                                            <Text fw={800} size="md" c="red.9" tt="uppercase">Descripción del Problema</Text>
                                        </Group>
                                        <Text size="md" fw={600} fs="italic" c="dark.9">"{selectedFalla.descripcion}"</Text>
                                    </Paper>
                                </Stack>
                            </Grid.Col>

                            <Grid.Col span={isMobile ? 12 : 5}>
                                <Stack gap="md">
                                    <Paper withBorder p="md" radius="md" bg="gray.0">
                                        <Text size="xs" c="dimmed" tt="uppercase" fw={800} mb="xs">Datos del Reporte</Text>
                                        <Group wrap="nowrap" mb="sm">
                                            <Avatar 
                                                src={getUrlImagen(selectedFalla.inspeccion?.reportadoPor?.empleado?.foto || selectedFalla.inspeccion?.reportadoPor?.empleado?.imagen)} 
                                                color="blue" radius="xl" size="lg"
                                            >
                                                <IconUser size="1.5rem" />
                                            </Avatar>
                                            <Box>
                                                <Text size="sm" fw={800}>
                                                    {selectedFalla.inspeccion?.reportadoPor?.empleado ? `${selectedFalla.inspeccion.reportadoPor.empleado.nombre} ${selectedFalla.inspeccion.reportadoPor.empleado.apellido}` : selectedFalla.inspeccion?.reportadoPor?.user}
                                                </Text>
                                                <Text size="xs" c="dimmed">@{selectedFalla.inspeccion?.reportadoPor?.user}</Text>
                                            </Box>
                                        </Group>
                                        <Group gap="xs">
                                            <IconCalendar size={16} color="gray"/>
                                            <Text size="sm" fw={600} c="dimmed">{new Date(selectedFalla.createdAt).toLocaleString('es-VE')}</Text>
                                        </Group>
                                    </Paper>

                                    {selectedFalla.imagenEvidencia && (
                                        <Paper withBorder p="xs" radius="md">
                                            <Text size="xs" c="dimmed" tt="uppercase" fw={800} mb="xs">Evidencia Fotográfica</Text>
                                            <Image 
                                                src={getUrlImagen(selectedFalla.imagenEvidencia)} 
                                                fallbackSrc="https://placehold.co/400x300?text=Error+Cargando+Evidencia" 
                                                radius="md" h={150} fit="cover" 
                                            />
                                        </Paper>
                                    )}
                                </Stack>
                            </Grid.Col>
                        </Grid>
                        
                        <Group justify="flex-end" mt="md">
                            <Button variant="default" onClick={() => setSelectedFalla(null)}>Cerrar Detalle</Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            <Modal opened={modalBatchOpened} onClose={() => setModalBatchOpened(false)} title={<Text fw={900} size="lg" tt="uppercase">Generar Requisiciones</Text>} size="xl" fullScreen={isMobile}>
                <Stack gap="md">
                    <ScrollArea h={isMobile ? 'calc(100vh - 200px)' : 500} type="auto">
                        <Stack gap="xl">
                            {seleccionadas.map((fallaId) => {
                                const falla = fallasOrdenadas.find(f => f.id === fallaId);
                                const lineas = repuestosAsignados[fallaId] || [];

                                return (
                                    <Paper key={fallaId} withBorder p="md" radius="md" bg="gray.0">
                                        <Group justify="space-between" mb="sm">
                                            <Box>
                                                <Text size="sm" fw={800} c="blue.9">{obtenerInfoActivo(falla.inspeccion?.activo)}</Text>
                                                <Text size="md" fw={700} fs="italic">"{falla.descripcion}"</Text>
                                            </Box>
                                            <Badge color={getColorImpacto(falla.impacto)}>{falla.impacto}</Badge>
                                        </Group>
                                        <Divider my="sm" variant="dashed" />
                                        {lineas.map((linea, idx) => (
                                            <Group key={idx} align="flex-end" mb="sm" wrap={isMobile ? "wrap" : "nowrap"}>
                                                <Select label={idx === 0 ? "Repuesto a Solicitar" : ""} placeholder="Buscar repuesto..." data={consumibles} searchable w={isMobile ? '100%' : 300} value={linea.consumibleId} onChange={(val) => actualizarLinea(fallaId, idx, 'consumibleId', val)}/>
                                                <NumberInput label={idx === 0 ? "Cant." : ""} min={1} w={isMobile ? 100 : 80} value={linea.cantidad} onChange={(val) => actualizarLinea(fallaId, idx, 'cantidad', val)}/>
                                                <ActionIcon color="red" variant="subtle" size="lg" mb={4} onClick={() => eliminarLineaRepuesto(fallaId, idx)} disabled={lineas.length === 1}><IconTrash size={18} /></ActionIcon>
                                            </Group>
                                        ))}
                                        <Button variant="subtle" color="teal" size="xs" leftSection={<IconPlus size={14}/>} onClick={() => agregarLineaRepuesto(fallaId)}>Pedir otro repuesto para esta falla</Button>
                                    </Paper>
                                );
                            })}
                        </Stack>
                    </ScrollArea>
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => setModalBatchOpened(false)}>Cancelar</Button>
                        <Button color="teal" leftSection={<IconCheck size={16}/>} onClick={generarRequisicionesLote} loading={procesando}>Generar {seleccionadas.length} Requisiciones</Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
}