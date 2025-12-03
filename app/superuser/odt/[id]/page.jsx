"use client";

import { useEffect, useState } from "react";
import { Loader, Badge, Paper, Button } from "@mantine/core";
import { useRouter } from "next/navigation";

export default function ODTDetallePage({ params }) {
  const router = useRouter();
  const [odt, setOdt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/odts/${params.id}`)
      .then((res) => res.json())
      .then((data) => setOdt(data))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <Loader />;
  if (!odt) return <p>ODT no encontrada</p>;

  return (
    <Paper>
      <h1>ODT {odt.nroODT}</h1>
      <p>Cliente: {odt.cliente?.nombre}</p>
      <p>Fecha: {odt.fecha}</p>
      <p>Servicio: {odt.descripcionServicio}</p>
      <p>Hora llegada: {odt.horaLlegada}</p>
      <p>Hora salida: {odt.horaSalida}</p>

      <h3>Empleados</h3>
      {odt.empleados?.map((emp) => (
        <Badge key={emp.id} color={emp.ODT_Empleados.rol === "chofer" ? "blue" : "green"}>
          {emp.nombreCompleto} ({emp.ODT_Empleados.rol})
        </Badge>
      ))}

      <h3>Vehículos</h3>
      {odt.vehiculos?.map((veh) => (
        <Badge key={veh.id} color={veh.ODT_Vehiculos.tipo === "principal" ? "orange" : "gray"}>
          {veh.nombre} ({veh.ODT_Vehiculos.tipo})
        </Badge>
      ))}
      <Button onClick={() => router.push(`/superuser/odt/${odt.id}/editar`)} mt="md">Editar</Button>
    </Paper>
  );
}