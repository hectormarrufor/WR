"use client";

import { MantineReactTable } from "mantine-react-table";
import { Badge, ActionIcon, Group, Avatar, Text, Flex } from "@mantine/core";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

const getColumns = (openDeleteModal, router) => [
  {
    accessorKey: "nroODT",
    header: "Nro ODT",
    size: 100,
  },
  {
    accessorKey: "cliente",
    header: "Cliente",
    size: 150,
    Cell: ({ cell }) =>
      cell.getValue() && (
        <Flex align="center">
          <Avatar h={50} w={50} src={`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${cell.getValue().imagen}`} alt="Logo cliente" radius="xl" size="sm" mr="xs" />
          <Text key={cell.getValue().id}>{cell.getValue().nombre}</Text>
        </Flex>
      ),
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
        <Flex  key={emp.id}>
          <Avatar h={40} w={40} src={`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${emp.imagen}`} alt="Foto empleado" radius="xl" size="sm" mr="xs" />
          <Badge
            key={emp.id}
            color={emp.ODT_Empleados.rol === "chofer" ? "blue" : "green"}
            mr="xs"
          >
            {emp.nombre} ({emp.ODT_Empleados.rol})
          </Badge>
        </Flex>
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
          {veh.modelo?.nombre} ({veh.ODT_Vehiculos.tipo})
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

  const openDeleteModal = async (id) => {
    if (confirm("¿Seguro que quieres eliminar esta ODT?")) {
      try {
        const res = await fetch(`/api/odts/${id}`, {
          method: "DELETE",
        });

        if (res.ok) {
          // refrescar la tabla o router
          router.refresh(); // en Next 13/14
        } else {
          const error = await res.json();
          alert("Error eliminando ODT: " + error.message);
        }
      } catch (err) {
        console.error(err);
        alert("Error de red eliminando ODT");
      }
    }

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