"use client";

import { useEffect, useState } from "react";
import { Loader, Badge } from "@mantine/core";

export default function ODTDetallePage({ params }) {
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
    <div>
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
    </div>
  );
}