"use client";

import { useMemo, useState } from "react";
import { 
  Card, Text, Badge, Group, ActionIcon, 
  SimpleGrid, Stack, Box, Tooltip, Modal, Button, 
  Avatar, ThemeIcon, Divider, Paper, rem
} from "@mantine/core";
import { 
  IconPencil, IconTruck, IconUser, IconBuilding, 
  IconTrash, IconClock, IconMapPin, IconTool, 
  IconSteeringWheel, IconCalendarEvent, IconDotsVertical 
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { MRT_Localization_ES } from 'mantine-react-table/locales/es';
import { notifications } from "@mantine/notifications";
import { formatDateShort } from "@/app/helpers/dateUtils";

// --- HELPERS VISUALES ---
const getStatusConfig = (estado) => {
  switch (estado) {
    case 'Finalizada': return { color: 'teal', label: 'Finalizada' };
    case 'En Curso': return { color: 'blue', label: 'En Curso' };
    case 'Cancelada': return { color: 'red', label: 'Cancelada' };
    default: return { color: 'gray', label: 'Pendiente' };
  }
};

const getAssetIcon = (type) => {
  if (type === 'maquina') return <IconTool size={14} />;
  return <IconTruck size={14} />;
};

export default function ODTList({ odts }) {
  const router = useRouter();
  const { isAdmin } = useAuth();

  // Estado para el modal de confirmación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [odtToDelete, setOdtToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleRowClick = (id) => {
    router.push(`/superuser/odt/${id}`);
  };

  const openDeleteModal = (e, odt) => {
    e.stopPropagation();
    setOdtToDelete(odt);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!odtToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/odts/${odtToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');

      notifications.show({
        title: 'ODT Eliminada',
        message: `La ODT #${odtToDelete.nroODT} ha sido borrada.`,
        color: 'teal',
        icon: <IconTrash size={18} />,
      });

      setDeleteModalOpen(false);
      window.location.reload(); 
    } catch (error) {
      notifications.show({ title: 'Error', message: 'No se pudo eliminar la ODT.', color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  // ==========================================
  // 1. COLUMNAS (DESKTOP)
  // ==========================================
  const columns = useMemo(
    () => [
      {
        accessorKey: 'nroODT',
        header: 'ODT',
        size: 90,
        Cell: ({ cell, row }) => (
          <Stack gap={0}>
            <Text fw={800} size="sm">#{cell.getValue()}</Text>
            <Badge 
                size="xs" 
                variant="light" 
                color={getStatusConfig(row.original.estado).color}
                style={{ marginTop: 2 }}
            >
                {row.original.estado}
            </Badge>
          </Stack>
        )
      },
      {
        accessorFn: (row) => row.fecha, // Raw date for sorting
        id: 'fecha',
        header: 'Fecha',
        size: 110,
        Cell: ({ row }) => (
            <Group gap={6} wrap="nowrap">
                <ThemeIcon variant="light" color="gray" size="sm"><IconCalendarEvent size={14}/></ThemeIcon>
                <Text size="sm">{formatDateShort(row.original.fecha)}</Text>
            </Group>
        )
      },
      {
        accessorKey: 'cliente.nombre',
        header: 'Cliente',
        size: 220,
        Cell: ({ row }) => (
            <Group gap="sm" wrap="nowrap">
                <Avatar src={row.original.cliente?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${row.original.cliente.imagen}` : null} radius="xl" size="sm" />
                <Box>
                    <Text size="sm" fw={600} lineClamp={1}>{row.original.cliente?.nombre}</Text>
                    <Text size="xs" c="dimmed">{row.original.cliente?.identificacion || 'Sin ID'}</Text>
                </Box>
            </Group>
        )
      },
      {
        id: 'personal',
        header: 'Chofer',
        size: 200,
        accessorFn: (row) => row.chofer?.nombre,
        Cell: ({ row }) => row.original.chofer ? (
            <Group gap="xs" wrap="nowrap">
                <Avatar src={row.original.chofer?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${row.original.chofer.imagen}` : null} radius="xl" size="xs" color="blue" />
                <Text size="sm">{row.original.chofer.nombre.split(' ')[0]} {row.original.chofer.apellido.split(' ')[0]}</Text>
            </Group>
        ) : <Badge color="gray" variant="outline" size="xs">Sin Asignar</Badge>
      },
      {
        id: 'activos',
        header: 'Recursos',
        size: 180,
        enableSorting: false,
        Cell: ({ row }) => (
          <Group gap={4}>
            {row.original.vehiculoPrincipal && (
              <Tooltip label={`Principal: ${row.original.vehiculoPrincipal.codigoInterno}`}>
                <ThemeIcon variant="light" color="blue" size="md" radius="sm">
                  <IconTruck size={16} />
                </ThemeIcon>
              </Tooltip>
            )}
            {row.original.vehiculoRemolque && (
              <Tooltip label={`Remolque: ${row.original.vehiculoRemolque.codigoInterno}`}>
                <ThemeIcon variant="light" color="gray" size="md" radius="sm">
                  <IconTruck size={16} style={{ opacity: 0.6 }} />
                </ThemeIcon>
              </Tooltip>
            )}
            {row.original.maquinaria && (
              <Tooltip label={`Maquinaria: ${row.original.maquinaria.codigoInterno}`}>
                <ThemeIcon variant="light" color="orange" size="md" radius="sm">
                  <IconTool size={16} />
                </ThemeIcon>
              </Tooltip>
            )}
             {!row.original.vehiculoPrincipal && !row.original.maquinaria && (
                <Text size="xs" c="dimmed">-</Text>
             )}
          </Group>
        ),
      },
      {
        id: 'horario',
        header: 'Jornada',
        accessorFn: (row) => `${row.horaLlegada}`,
        size: 140,
        Cell: ({ row }) => (
            <Badge variant="dot" color="gray" size="md" tt="none">
                {row.original.horaLlegada?.substring(0, 5)} - {row.original.horaSalida?.substring(0, 5)}
            </Badge>
        )
      }
    ],
    []
  );

  // ==========================================
  // 2. CONFIG TABLE
  // ==========================================
  const table = useMantineReactTable({
    columns,
    data: odts,
    enableGlobalFilter: true,
    enablePagination: true,
    enableRowActions: true, // Siempre true para poder ver detalles, acciones restringidas por isAdmin abajo
    positionActionsColumn: 'last',
    localization: MRT_Localization_ES,
    initialState: { showGlobalFilter: true, density: 'xs', sorting: [{ id: 'fecha', desc: true }] },
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => handleRowClick(row.original.id),
      style: { cursor: 'pointer' },
    }),
    renderRowActions: ({ row }) => (
      <Group gap={0} onClick={(e) => e.stopPropagation()}>
        <Tooltip label="Ver detalle">
             <ActionIcon variant="subtle" color="gray" onClick={() => handleRowClick(row.original.id)}>
                <IconDotsVertical size={18} />
             </ActionIcon>
        </Tooltip>
        {isAdmin && (
             <Tooltip label="Eliminar">
                <ActionIcon variant="subtle" color="red" onClick={(e) => openDeleteModal(e, row.original)}>
                    <IconTrash size={18} />
                </ActionIcon>
             </Tooltip>
        )}
      </Group>
    ),
    mantinePaperProps: { shadow: 'sm', radius: 'md', withBorder: true },
  });

  // ==========================================
  // 3. VISTA MÓVIL (PREMIUM CARD)
  // ==========================================
  const MobileView = () => (
    <SimpleGrid cols={1} spacing="md">
      {odts.length === 0 && (
        <Paper p="xl" withBorder ta="center" bg="gray.0">
            <IconCalendarEvent size={40} color="gray" />
            <Text c="dimmed" mt="xs">No hay ODTs registradas</Text>
        </Paper>
      )}
      
      {odts.map((odt) => {
        const status = getStatusConfig(odt.estado);
        return (
            <Paper 
                key={odt.id} 
                shadow="sm" 
                radius="md" 
                withBorder 
                onClick={() => handleRowClick(odt.id)}
                style={{ 
                    cursor: 'pointer', 
                    borderLeft: `5px solid var(--mantine-color-${status.color}-6)` 
                }}
            >
                {/* HEADER TARJETA */}
                <Group justify="space-between" p="md" bg="gray.0" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
                    <Group gap="xs">
                        <Text fw={800} size="lg">#{odt.nroODT}</Text>
                        <Badge color={status.color} variant="filled" size="sm">{status.label}</Badge>
                    </Group>
                    <Text size="xs" c="dimmed" fw={600}>{formatDateShort(odt.fecha)}</Text>
                </Group>

                {/* BODY TARJETA */}
                <Stack p="md" gap="sm">
                    {/* Cliente */}
                    <Group align="flex-start" wrap="nowrap">
                        <ThemeIcon variant="light" color="gray" size="md"><IconBuilding size={16}/></ThemeIcon>
                        <Box style={{ flex: 1 }}>
                            <Text size="sm" fw={700} lineClamp={1}>{odt.cliente?.nombre}</Text>
                            <Text size="xs" c="dimmed" lineClamp={1}>{odt.cliente?.direccion || 'Sin dirección'}</Text>
                        </Box>
                    </Group>

                    <Divider variant="dashed" />

                    {/* Chofer + Horario */}
                    <Group justify="space-between" align="center">
                        <Group gap="xs">
                            <Avatar src={odt.chofer?.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${odt.chofer.imagen}` : null} radius="xl" size="sm" />
                            <Box>
                                <Text size="sm" fw={600}>{odt.chofer ? odt.chofer.nombre : 'Sin Chofer'}</Text>
                                <Text size="xs" c="dimmed">Operador</Text>
                            </Box>
                        </Group>
                        <Badge variant="outline" color="dark" leftSection={<IconClock size={12}/>}>
                             {odt.horaLlegada?.substring(0, 5)} - {odt.horaSalida?.substring(0, 5)}
                        </Badge>
                    </Group>

                    {/* Activos (Chips) */}
                    {(odt.vehiculoPrincipal || odt.maquinaria) && (
                        <Group gap={6} mt={4}>
                            {odt.vehiculoPrincipal && (
                                <Badge size="sm" color="blue" variant="light" leftSection={<IconTruck size={12}/>}>
                                    {odt.vehiculoPrincipal.codigoInterno}
                                </Badge>
                            )}
                             {odt.maquinaria && (
                                <Badge size="sm" color="orange" variant="light" leftSection={<IconTool size={12}/>}>
                                    {odt.maquinaria.codigoInterno}
                                </Badge>
                            )}
                        </Group>
                    )}
                </Stack>

                {/* FOOTER ACCIONES (Solo Admin) */}
                {isAdmin && (
                    <Group p="xs" justify="flex-end" gap="xs" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                        <Button 
                            variant="subtle" 
                            size="xs" 
                            color="blue" 
                            leftSection={<IconPencil size={14} />}
                            onClick={(e) => { e.stopPropagation(); router.push(`/superuser/odt/${odt.id}/editar`); }}
                        >
                            Editar
                        </Button>
                        <Button 
                            variant="subtle" 
                            size="xs" 
                            color="red" 
                            leftSection={<IconTrash size={14} />}
                            onClick={(e) => openDeleteModal(e, odt)}
                        >
                            Eliminar
                        </Button>
                    </Group>
                )}
            </Paper>
        );
      })}
    </SimpleGrid>
  );

  return (
    <>
      <Box hiddenFrom="sm">
        <MobileView />
      </Box>

      <Box visibleFrom="sm">
        <MantineReactTable table={table} />
      </Box>

      {/* MODAL CONFIRMACION */}
      <Modal 
        opened={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)} 
        title={<Group><IconTrash color="red"/><Text fw={700}>Eliminar ODT</Text></Group>}
        centered
        radius="md"
      >
        <Text size="sm" mb="lg">
          Vas a eliminar la ODT <b>#{odtToDelete?.nroODT}</b> del cliente <b>{odtToDelete?.cliente?.nombre}</b>.
          <br/><br/>
          <Text span c="red" size="xs">⚠️ Esta acción es irreversible y borrará el historial de horas.</Text>
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button>
          <Button color="red" loading={deleting} onClick={handleDelete}>Confirmar Eliminación</Button>
        </Group>
      </Modal>
    </>
  );
}