"use client";

import { MantineReactTable } from "mantine-react-table";
import { Badge, ActionIcon, Group } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

const getColumns = (openDeleteModal, router) => [
  {
    accessorKey: "nroODT",
    header: "Nro ODT",
    size: 100,
  },
  {
    accessorKey: "cliente.nombre",
    header: "Cliente",
    size: 150,
  },
  {
    accessorKey: "fecha",
    header: "Fecha",
    size: 120,
    Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
  },
  {
    accessorKey: "descripcionServicio",
    header: "Servicio",
    size: 250,
  },
  {
    accessorKey: "horaLlegada",
    header: "Llegada",
    size: 100,
  },
  {
    accessorKey: "horaSalida",
    header: "Salida",
    size: 100,
  },
  {
    accessorKey: "empleados",
    header: "Empleados",
    size: 250,
    Cell: ({ cell }) =>
      cell.getValue()?.map((emp) => (
        <Badge
          key={emp.id}
          color={emp.ODT_Empleados.rol === "chofer" ? "blue" : "green"}
          mr="xs"
        >
          {emp.nombreCompleto} ({emp.ODT_Empleados.rol})
        </Badge>
      )),
  },
  {
    accessorKey: "vehiculos",
    header: "Vehículos",
    size: 250,
    Cell: ({ cell }) =>
      cell.getValue()?.map((veh) => (
        <Badge
          key={veh.id}
          color={veh.ODT_Vehiculos.tipo === "principal" ? "orange" : "gray"}
          mr="xs"
        >
          {veh.nombre} ({veh.ODT_Vehiculos.tipo})
        </Badge>
      )),
  },
  {
    id: "acciones",
    header: "Acciones",
    size: 100,
    Cell: ({ row }) => (
      <Group spacing="xs">
        <ActionIcon
          color="blue"
          onClick={() => router.push(`/superuser/odt/${row.original.id}/editar`)}
        >
          <IconEdit size={16} />
        </ActionIcon>
        <ActionIcon
          color="red"
          onClick={() => openDeleteModal(row.original.id)}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
    ),
  },
];

export default function ODTTable({ odts }) {
  const router = useRouter();

  const openDeleteModal = (id) => {
    // Aquí puedes implementar tu modal de confirmación
    console.log("Eliminar ODT:", id);
  };

  return (
    <MantineReactTable
      columns={getColumns(openDeleteModal, router)}
      data={odts}
      enableColumnFilters
      enableSorting
      enablePagination
      initialState={{ density: "compact" }}
    />
  );
}