"use client";

import { useMemo, useState } from "react";
import { 
  Card, Text, Badge, Group, ActionIcon, 
  SimpleGrid, Stack, Box, Tooltip, Modal, Button 
} from "@mantine/core";
import { 
  IconPencil, IconTruck, IconUser, IconBuilding, IconTrash 
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { MRT_Localization_ES } from 'mantine-react-table/locales/es';
import { notifications } from "@mantine/notifications";
import { formatDateLong, formatDateShort, parseDateToLocal } from "@/app/helpers/dateUtils";

export default function ODTList({ odts }) {
  const router = useRouter();
  const { isAdmin } = useAuth(); // Destructuramos isAdmin

  // Estado para el modal de confirmación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [odtToDelete, setOdtToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Navegación al detalle
  const handleRowClick = (id) => {
    router.push(`/superuser/odt/${id}`);
  };

  // Abrir modal de confirmación
  const openDeleteModal = (e, odt) => {
    e.stopPropagation(); // Evita navegar al detalle
    setOdtToDelete(odt);
    setDeleteModalOpen(true);
  };

  // Lógica de eliminación
  const handleDelete = async () => {
    if (!odtToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/odts/${odtToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Error al eliminar');

      notifications.show({
        title: 'ODT Eliminada',
        message: `La ODT #${odtToDelete.nroODT} ha sido borrada correctamente.`,
        color: 'green',
      });

      setDeleteModalOpen(false);
      
      // Recargar la página para ver cambios (o podrías manejar estado local)
      window.location.reload(); 

    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'No se pudo eliminar la ODT.',
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  // ==========================================
  // 1. COLUMNAS
  // ==========================================
  const columns = useMemo(
    () => [
      {
        accessorKey: 'nroODT',
        header: 'Nro ODT',
        size: 100,
        Cell: ({ cell }) => <Text fw={700}>#{cell.getValue()}</Text>
      },
      {
        accessorFn: (row) => formatDateShort(row.fecha),
        id: 'fecha',
        header: 'Fecha',
        size: 120,
        filterVariant: 'date-range',
      },
      {
        accessorKey: 'cliente.nombre',
        header: 'Cliente',
        size: 200,
      },
      {
        id: 'personal',
        header: 'Chofer',
        accessorFn: (row) => row.chofer ? `${row.chofer.nombre} ${row.chofer.apellido}` : 'Sin Asignar',
        Cell: ({ row }) => (
            <Text size="sm">{row.original.chofer ? `${row.original.chofer.nombre} ${row.original.chofer.apellido}` : "-"}</Text>
        )
      },
      {
        id: 'activos',
        header: 'Activos Asignados',
        size: 250,
        enableSorting: false,
        Cell: ({ row }) => (
          <Group gap={5}>
            {row.original.vehiculoPrincipal && (
              <Tooltip label="Vehículo Principal">
                <Badge size="sm" variant="outline" color="blue">
                  {row.original.vehiculoPrincipal.codigoInterno}
                </Badge>
              </Tooltip>
            )}
            {row.original.vehiculoRemolque && (
              <Tooltip label="Remolque">
                <Badge size="sm" variant="outline" color="gray">
                  {row.original.vehiculoRemolque.codigoInterno}
                </Badge>
              </Tooltip>
            )}
            {row.original.maquinaria && (
              <Tooltip label="Maquinaria">
                <Badge size="sm" variant="filled" color="orange">
                  {row.original.maquinaria.codigoInterno}
                </Badge>
              </Tooltip>
            )}
          </Group>
        ),
      },
      {
        id: 'horario',
        header: 'Horario',
        accessorFn: (row) => `${row.horaLlegada} - ${row.horaSalida}`,
        size: 150,
      }
    ],
    []
  );

  // ==========================================
  // 2. CONFIGURACIÓN DE LA TABLA (MRT)
  // ==========================================
  const table = useMantineReactTable({
    columns,
    data: odts,
    enableGlobalFilter: true,
    enableColumnFilters: true,
    enablePagination: true,
    enableRowActions: isAdmin, // Solo activa acciones si es admin
    positionActionsColumn: 'last',
    localization: MRT_Localization_ES,
    displayColumnDefOptions: {
      'mrt-row-actions': {
        header: 'Acciones', // Cambiar título de la columna de acciones
        size: 100,
      },
    },
    
    initialState: {
      showGlobalFilter: true,
      density: 'xs',
      sorting: [{ id: 'fecha', desc: true }],
    },

    mantineTableBodyRowProps: ({ row }) => ({
      onClick: (event) => handleRowClick(row.original.id),
      style: { cursor: 'pointer' },
    }),

    // --- ACCIONES EN DESKTOP ---
    renderRowActions: ({ row }) => (
      <Group gap="xs" onClick={(e) => e.stopPropagation()}>
        {/* EDITAR */}
        <Tooltip label="Editar">
          <ActionIcon 
            variant="subtle" 
            color="blue" 
            onClick={() => router.push(`/superuser/odt/${row.original.id}/editar`)}
          >
            <IconPencil size={18} />
          </ActionIcon>
        </Tooltip>

        {/* BORRAR (Solo Admin) */}
        {isAdmin && (
          <Tooltip label="Eliminar">
            <ActionIcon 
              variant="subtle" 
              color="red" 
              onClick={(e) => openDeleteModal(e, row.original)}
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    ),

    mantinePaperProps: {
      shadow: 'sm',
      radius: 'md',
      withBorder: true,
    },
  });

  // ==========================================
  // 3. VISTA MÓVIL
  // ==========================================
  const MobileView = () => (
    <SimpleGrid cols={1} spacing="md">
      {odts.length === 0 && <Text ta="center" c="dimmed">No hay datos</Text>}
      {odts.map((odt) => (
        <Card 
          key={odt.id} 
          shadow="sm" 
          padding="md" 
          radius="md" 
          withBorder
          onClick={() => handleRowClick(odt.id)}
          style={{ cursor: 'pointer' }}
        >
          <Group justify="space-between" mb="xs">
            <Text fw={700} size="lg">ODT #{odt.nroODT}</Text>
            <Badge color="blue" variant="light">
              {formatDateLong(odt.fecha)}
            </Badge>
          </Group>

          <Stack gap="xs" mb="md">
            <Group gap="xs">
              <IconBuilding size={16} color="gray" />
              <Text size="sm" fw={500}>{odt.cliente?.nombre || "Sin Cliente"}</Text>
            </Group>
            
            <Group gap="xs">
              <IconTruck size={16} color="gray" />
              <Text size="sm" c="dimmed">
                {odt.vehiculoPrincipal?.codigoInterno || "N/A"} 
              </Text>
            </Group>
          </Stack>

          {/* ACCIONES MÓVIL */}
          {isAdmin && (
            <Group justify="flex-end" mt="xs" onClick={(e) => e.stopPropagation()}>
               <Button 
                variant="light" 
                size="xs" 
                leftSection={<IconPencil size={16} />}
                onClick={() => router.push(`/superuser/odt/${odt.id}/editar`)}
              >
                Editar
              </Button>
              
              <Button 
                variant="light" 
                color="red"
                size="xs" 
                leftSection={<IconTrash size={16} />}
                onClick={(e) => openDeleteModal(e, odt)}
              >
                Borrar
              </Button>
            </Group>
          )}
        </Card>
      ))}
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

      {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
      <Modal 
        opened={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)} 
        title="Confirmar eliminación"
        centered
      >
        <Text size="sm" mb="lg">
          ¿Estás seguro que deseas eliminar la ODT <b>#{odtToDelete?.nroODT}</b>? 
          Esta acción también eliminará las horas trabajadas y horómetros asociados.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button>
          <Button color="red" loading={deleting} onClick={handleDelete}>Eliminar</Button>
        </Group>
      </Modal>
    </>
  );
}