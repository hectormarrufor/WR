'use client';
import { useState, useEffect } from 'react';
import { 
    Modal, Text, Group, Stack, Paper, Badge, Divider, ThemeIcon, Alert, Box, Button, Loader,
    Select, Textarea, Collapse
} from '@mantine/core';
import { 
    IconEngine, IconSettings, IconAlertTriangle, IconCheck, 
    IconPackage, IconInfoCircle, IconCalendar, IconShoppingCart, IconFileDescription
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { generarPDFRequisicion } from '@/app/helpers/generarPDFRequisicion';

export default function ModalVistaFalla({ opened, onClose, hallazgo, userId, activo }) {
    const [compatibles, setCompatibles] = useState([]);
    const [cargandoStock, setCargandoStock] = useState(false);
    
    // Estados para el formulario de requisición
    const [modoRequisicion, setModoRequisicion] = useState(false);
    const [prioridadReq, setPrioridadReq] = useState('Media');
    const [justificacionReq, setJustificacionReq] = useState('');
    const [creandoReq, setCreandoReq] = useState(false);

    const subsistema = hallazgo?.subsistema;
    const piezaInstalada = hallazgo?.componenteDañado; 
    const piezaGeneral = piezaInstalada?.fichaTecnica;
    
    useEffect(() => {
        if (opened && piezaInstalada?.recomendacionId) {
            setCargandoStock(true);
            setModoRequisicion(false); // Reset al abrir
            setJustificacionReq('');
            setPrioridadReq(hallazgo?.impacto === 'No Operativo' ? 'Alta' : 'Media');

            fetch(`/api/inventario/compatibles?recomendacionId=${piezaInstalada.recomendacionId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setCompatibles(data.data || []);
                    } else {
                        setCompatibles([]);
                    }
                })
                .catch(err => console.error("Error cargando compatibles:", err))
                .finally(() => setCargandoStock(false));
        } else {
            setCompatibles([]);
        }
    }, [opened, piezaInstalada, hallazgo]);

    const handleCrearRequisicion = async () => {
        if (!justificacionReq.trim()) {
            return notifications.show({ title: 'Atención', message: 'Debe ingresar una justificación para compras', color: 'orange' });
        }

        setCreandoReq(true);
        try {
            const res = await fetch('/api/compras/requisiciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hallazgoId: hallazgo.id,
                    consumibleId: piezaGeneral.id, 
                    cantidadSolicitada: piezaInstalada.cantidad || 1, 
                    prioridad: prioridadReq,
                    justificacion: justificacionReq,
                    solicitadoPorId: userId
                })
            });

            const data = await res.json();
            if (data.success) {
                notifications.show({ title: 'Requisición Creada', message: 'Descargando PDF de la orden...', color: 'green' });
                
                // Formateamos el nombre del equipo si viene por props, si no, genérico
                const nombreEquipo = activo 
                    ? `${activo.vehiculoInstancia?.plantilla?.tipoVehiculo || 'Equipo'} - Placa: ${activo.vehiculoInstancia?.placa || activo.maquinaInstancia?.placa || 'N/A'}`
                    : `Asociado a Hallazgo #${hallazgo.id}`;

                generarPDFRequisicion(data.data, nombreEquipo, hallazgo.descripcion);
                
                onClose();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setCreandoReq(false);
        }
    };

    if (!hallazgo) return null;

    const fechaReporte = hallazgo.createdAt ? new Date(hallazgo.createdAt).toLocaleDateString('es-VE', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'Fecha desconocida';

    const totalStockCompatible = compatibles.reduce((acc, curr) => acc + (curr.stockActual || 0), 0);
    const sinStock = !cargandoStock && totalStockCompatible <= 0;

    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            title={<Text fw={900} size="lg" tt="uppercase">Detalle de Reporte #{hallazgo.id}</Text>}
            size="md" 
            centered
            radius="md"
        >
            <Stack gap="md">
                <Group justify="space-between" align="center">
                    <Group gap="xs">
                        <IconCalendar size={16} color="gray" />
                        <Text size="xs" c="dimmed" fw={600}>{fechaReporte}</Text>
                    </Group>
                    <Badge 
                        color={hallazgo.impacto === 'No Operativo' ? 'red' : hallazgo.impacto === 'Advertencia' ? 'yellow.7' : 'teal'}
                        variant="light"
                        leftSection={hallazgo.impacto === 'No Operativo' ? <IconAlertTriangle size={12} /> : <IconCheck size={12} />}
                    >
                        {hallazgo.impacto || 'Operativo'}
                    </Badge>
                </Group>

                <Paper withBorder p="md" bg="gray.0" radius="md">
                    <Text size="xs" fw={800} tt="uppercase" c="dark.4" mb={4}>Problema Reportado</Text>
                    <Text size="sm" fw={600} c="dark.9">"{hallazgo.descripcion}"</Text>
                </Paper>

                <Divider label="Anatomía Afectada" labelPosition="center" />

                {subsistema ? (
                    <Paper withBorder p="sm" radius="md" style={{ borderLeft: '4px solid #f59f00' }}>
                        <Group wrap="nowrap">
                            <ThemeIcon color="orange.6" variant="light" size="lg" radius="md">
                                <IconEngine size={20} />
                            </ThemeIcon>
                            <Box style={{ flex: 1 }}>
                                <Text size="xs" fw={700} c="orange.9" tt="uppercase">Área / Subsistema</Text>
                                <Text size="sm" fw={800} c="dark.7">{subsistema.nombre}</Text>
                            </Box>
                        </Group>
                    </Paper>
                ) : (
                    <Alert variant="light" color="gray" icon={<IconInfoCircle size={16} />}>
                        Este hallazgo aún no ha sido vinculado a un subsistema (Huérfano).
                    </Alert>
                )}

                {piezaGeneral ? (
                    <Paper withBorder p="sm" radius="md" style={{ borderLeft: '4px solid #339af0' }}>
                        <Group wrap="nowrap" align="flex-start">
                            <ThemeIcon color="blue.6" variant="light" size="lg" radius="md">
                                <IconSettings size={20} />
                            </ThemeIcon>
                            <Box style={{ flex: 1 }}>
                                <Text size="xs" fw={700} c="blue.9" tt="uppercase">Componente Específico</Text>
                                <Text size="sm" fw={800} c="dark.7" mb="xs">{piezaGeneral.nombre}</Text>
                                
                                {piezaInstalada.estado === 'faltante' && (
                                    <Badge color="red" variant="filled" size="xs" mb="sm">REGISTRADO COMO FALTANTE</Badge>
                                )}

                                {!modoRequisicion && (
                                    <Paper withBorder p="xs" radius="sm" bg={cargandoStock ? 'gray.0' : sinStock ? 'red.0' : 'green.0'}>
                                        {cargandoStock ? (
                                            <Group justify="center" p="xs">
                                                <Loader size="sm" color="blue" />
                                                <Text size="xs" fw={600} c="dimmed">Consultando catálogo compatible...</Text>
                                            </Group>
                                        ) : (
                                            <Stack gap="xs">
                                                <Group justify="space-between" align="center">
                                                    <Group gap={4}>
                                                        <IconPackage size={16} color={sinStock ? '#e03131' : '#2b8a3e'} />
                                                        <Text size="xs" fw={800} c={sinStock ? 'red.9' : 'green.9'}>
                                                            STOCK COMPATIBLE EN ALMACÉN
                                                        </Text>
                                                    </Group>
                                                    <Text size="sm" fw={900} c={sinStock ? 'red.9' : 'green.9'}>
                                                        {totalStockCompatible} {piezaGeneral.unidadMedida || 'unidades'}
                                                    </Text>
                                                </Group>
                                                
                                                {totalStockCompatible > 0 && compatibles.map((c) => (
                                                    <Group key={c.value} justify="space-between" pl="md" style={{ borderLeft: '2px solid #51cf66' }}>
                                                        <Text size="xs" c="dark.6" fw={600}>{c.label.split(' - ')[0]}</Text>
                                                        <Badge size="xs" variant="light" color="green.7">{c.stockActual} und</Badge>
                                                    </Group>
                                                ))}
                                            </Stack>
                                        )}
                                    </Paper>
                                )}
                            </Box>
                        </Group>
                    </Paper>
                ) : (
                    subsistema && (
                        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
                            No se especificó una pieza exacta para este hallazgo.
                        </Alert>
                    )
                )}

                {/* FORMULARIO DE REQUISICIÓN DESPLEGABLE */}
                {piezaGeneral && !cargandoStock && sinStock && (
                    <Box>
                        {!modoRequisicion ? (
                            <Alert icon={<IconShoppingCart size={18} />} title="Atención: Almacén sin stock" color="red" variant="light" radius="md">
                                <Text size="xs" mb="sm" fw={600} c="red.9">
                                    No existen repuestos en el inventario para atender esta falla.
                                </Text>
                                <Button 
                                    fullWidth color="red.7" size="sm"
                                    leftSection={<IconFileDescription size={16} />}
                                    onClick={() => setModoRequisicion(true)}
                                >
                                    REDACTAR REQUISICIÓN DE COMPRA
                                </Button>
                            </Alert>
                        ) : (
                            <Paper withBorder p="md" radius="md" bg="blue.0" style={{ border: '1px solid #339af0' }}>
                                <Stack gap="sm">
                                    <Text size="sm" fw={800} c="blue.9" tt="uppercase" display="flex" style={{ alignItems: 'center', gap: 8 }}>
                                        <IconShoppingCart size={18} />
                                        Formulario de Requisición
                                    </Text>
                                    
                                    <Select 
                                        label="Nivel de Prioridad"
                                        data={['Baja', 'Media', 'Alta', 'Critica']}
                                        value={prioridadReq}
                                        onChange={setPrioridadReq}
                                        allowDeselect={false}
                                        withAsterisk
                                    />

                                    <Textarea 
                                        label="Justificación para Compras"
                                        placeholder="Ej: Se requiere con urgencia para liberar el equipo de mantenimiento..."
                                        minRows={3}
                                        value={justificacionReq}
                                        onChange={(e) => setJustificacionReq(e.target.value)}
                                        withAsterisk
                                    />

                                    <Group justify="flex-end" mt="xs">
                                        <Button variant="subtle" color="gray" onClick={() => setModoRequisicion(false)}>
                                            Cancelar
                                        </Button>
                                        <Button 
                                            color="blue.7" 
                                            loading={creandoReq}
                                            onClick={handleCrearRequisicion}
                                        >
                                            CONFIRMAR Y GENERAR PDF
                                        </Button>
                                    </Group>
                                </Stack>
                            </Paper>
                        )}
                    </Box>
                )}
            </Stack>
        </Modal>
    );
}