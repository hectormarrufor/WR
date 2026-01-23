"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Paper, Title, Text, Group, Button, Loader, Table,
  Badge, ScrollArea, Card, Avatar, Stack, Grid, ActionIcon,
  Tooltip, Center, Divider, Container, ThemeIcon
} from "@mantine/core";
import { 
  IconCurrencyDollar, IconCheck, IconCalendarTime, 
  IconCalculator, IconAlertCircle 
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { actualizarSueldos } from "@/app/helpers/calcularSueldo";
import { getRangoPago } from "@/app/helpers/getRangoPago"; // <--- Tu helper nuevo

export default function PagosPage() {
  const router = useRouter();
  
  // Estados de datos
  const [empleados, setEmpleados] = useState([]);
  const [tasas, setTasas] = useState({ bcv: 0, eur: 0, usdt: 0 });
  const [loading, setLoading] = useState(true);
  
  // Estado para controlar a quién ya se le dio click en "Pagar" visualmente
  const [pagados, setPagados] = useState({}); 

  // Fechas del corte
  const rango = useMemo(() => getRangoPago(), []);

  // --- CARGAR DATOS ---
  useEffect(() => {
    async function fetchData() {
      try {
        const [resEmpleados, resBcv] = await Promise.all([
          fetch("/api/rrhh/empleados?include=horasTrabajadas&where=estado:Activo").then(r => r.json()), // Asegúrate que esto traiga HorasTrabajadas
          fetch("/api/bcv").then(r => r.json())
        ]);

        // Guardar tasas
        setTasas({
          bcv: resBcv.precio,
          eur: resBcv.eur,
          usdt: resBcv.usdt
        });

        // Guardar empleados activos
        // Filtramos solo los activos si tu API devuelve todos
        const activos = Array.isArray(resEmpleados) 
          ? resEmpleados.filter(e => e.status === 'activo' || !e.status) // Ajusta según tu DB
          : [];
        
        setEmpleados(activos);

      } catch (error) {
        console.error(error);
        notifications.show({ title: "Error", message: "No se pudo cargar la nómina", color: "red" });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);


  // --- LÓGICA DE CÁLCULO DE NÓMINA (MEMOIZADA) ---
  const nominaCalculada = useMemo(() => {
    if (!empleados.length) return [];

    return empleados.map(emp => {
      // 1. Obtener tasa de cambio según preferencia del empleado
      const tasaCambio = emp.tasaSueldo === "euro" ? tasas.eur 
                       : emp.tasaSueldo === "usdt" ? tasas.usdt 
                       : tasas.bcv; // Default BCV

      // 2. Calcular valores monetarios del sueldo (usando tu helper existente)
      const valoresSueldo = actualizarSueldos("mensual", emp.sueldo); 
      // valoresSueldo devuelve { diario, semanal, horario, etc. } en DÓLARES

      // 3. Filtrar Horas trabajadas en el rango (Viernes a Jueves)
      const horasRango = emp.HorasTrabajadas?.filter(h => {
        const fechaHora = new Date(h.fecha);
        // Ajustamos horas para evitar problemas de zona horaria al comparar
        return fechaHora >= rango.inicio && fechaHora <= rango.fin;
      }) || [];

      // 4. Sumar horas
      const totalHoras = horasRango.reduce((acc, curr) => acc + curr.horas, 0);
      
      // 5. Calcular Extras (> 8h diarias)
      // Nota: Tu lógica anterior sumaba horas totales y restaba 8. 
      // Lo ideal es iterar día por día, pero usaremos tu lógica simplificada de la página detalle:
      // Si un registro tiene > 8 horas, el excedente es extra.
      const horasExtra = horasRango.reduce((acc, curr) => {
        return curr.horas > 8 ? acc + (curr.horas - 8) : acc;
      }, 0);

      const horasNormales = totalHoras - horasExtra;

      // 6. Calcular Totales a Pagar
      // Formula: (Horas * PrecioHoraUSD * TasaCambio)
      const totalPagarUsd = (totalHoras * valoresSueldo.horario);
      const totalPagarBs = totalPagarUsd * tasaCambio;

      return {
        ...emp,
        calculos: {
          horasNormales,
          horasExtra,
          totalHoras,
          totalPagarUsd,
          totalPagarBs,
          tasaUtilizada: tasaCambio,
          moneda: emp.tasaSueldo || 'bcv'
        }
      };
    });
  }, [empleados, tasas, rango]);

  // --- TOTALES GLOBALES (Para el Dashboard arriba) ---
  const totalNominaBs = nominaCalculada.reduce((acc, curr) => acc + curr.calculos.totalPagarBs, 0);
  const totalNominaUsd = nominaCalculada.reduce((acc, curr) => acc + curr.calculos.totalPagarUsd, 0);


  // --- MANEJO DE PAGO ---
  const handlePagar = async (empleadoId) => {
    // AQUÍ IRÍA LA LLAMADA A TU API PARA REGISTRAR EL PAGO EN DB
    // await fetch('/api/rrhh/pagos', { method: 'POST', body: ... })
    
    // Por ahora, solo simulación visual
    setPagados(prev => ({ ...prev, [empleadoId]: true }));
    notifications.show({ title: "Procesado", message: "Pago marcado como realizado", color: "green" });
  };


  if (loading) return (
    <Center h="80vh"><Stack align="center"><Loader /><Text>Calculando nómina...</Text></Stack></Center>
  );

  return (
    <Container size="xl" p="md">
      
      {/* CABECERA Y RANGO DE FECHAS */}
      <Stack mb="xl">
        <Group justify="space-between">
          <div>
            <Title order={2}>Gestión de Pagos Semanales</Title>
            <Text c="dimmed">Corte automático de viernes a jueves</Text>
          </div>
          <Card withBorder padding="sm" radius="md" bg="gray.0">
             <Group>
                <ThemeIcon variant="light" size="lg"><IconCalendarTime /></ThemeIcon>
                <div>
                   <Text size="xs" tt="uppercase" fw={700} c="dimmed">Periodo de Pago</Text>
                   <Text fw={700}>{rango.inicioStr} - {rango.finStr}</Text>
                </div>
             </Group>
          </Card>
        </Group>

        {/* TARJETAS DE RESUMEN */}
        <Grid>
           <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <Paper withBorder p="md" radius="md">
                 <Text size="xs" c="dimmed" fw={700} tt="uppercase">Total a Pagar (Bolívares)</Text>
                 <Text size="xl" fw={900} c="blue">Bs. {totalNominaBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
              </Paper>
           </Grid.Col>
           <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <Paper withBorder p="md" radius="md">
                 <Text size="xs" c="dimmed" fw={700} tt="uppercase">Equivalente (USD)</Text>
                 <Text size="xl" fw={900} c="green">${totalNominaUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </Paper>
           </Grid.Col>
           <Grid.Col span={{ base: 12, sm: 12, md: 4 }}>
              <Paper withBorder p="md" radius="md">
                 <Text size="xs" c="dimmed" fw={700} tt="uppercase">Tasa BCV Referencia</Text>
                 <Text size="xl" fw={900}>Bs. {tasas.bcv}</Text>
              </Paper>
           </Grid.Col>
        </Grid>
      </Stack>

      {/* TABLA DE EMPLEADOS */}
      <Paper withBorder shadow="sm" radius="md" overflow="hidden">
        <ScrollArea>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead bg="gray.1">
              <Table.Tr>
                <Table.Th>Empleado</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>Horas (N/Ext)</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Total (USD)</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Total ({tasas.bcv} Bs)</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>Acción</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {nominaCalculada.map((emp) => {
                 const yaPagado = pagados[emp.id];
                 const tieneHoras = emp.calculos.totalHoras > 0;

                 return (
                  <Table.Tr key={emp.id} style={{ opacity: yaPagado ? 0.5 : 1 }}>
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar src={emp.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${emp.imagen}` : null} radius="xl" />
                        <div>
                          <Text size="sm" fw={500}>{emp.nombre} {emp.apellido}</Text>
                          <Text size="xs" c="dimmed">{emp.cedula}</Text>
                        </div>
                      </Group>
                    </Table.Td>
                    
                    <Table.Td align="center">
                       {tieneHoras ? (
                         <Group gap={4} justify="center">
                           <Badge variant="outline" color="gray">{emp.calculos.horasNormales}h</Badge>
                           {emp.calculos.horasExtra > 0 && (
                             <Badge variant="filled" color="orange">+{emp.calculos.horasExtra}h</Badge>
                           )}
                         </Group>
                       ) : (
                         <Text size="xs" c="dimmed" fs="italic">Sin registros</Text>
                       )}
                    </Table.Td>

                    <Table.Td align="right">
                      <Text fw={700} c="green">${emp.calculos.totalPagarUsd.toFixed(2)}</Text>
                      <Text size="xs" c="dimmed">Base: ${emp.horario}/h</Text>
                    </Table.Td>

                    <Table.Td align="right">
                      <Text fw={700} size="md">Bs. {emp.calculos.totalPagarBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</Text>
                      <Badge size="xs" variant="dot" color={emp.calculos.moneda === 'bcv' ? 'blue' : 'yellow'}>
                        Tasa: {emp.calculos.moneda.toUpperCase()}
                      </Badge>
                    </Table.Td>

                    <Table.Td align="center">
                       {yaPagado ? (
                          <Button 
                             leftSection={<IconCheck size={16}/>} 
                             color="green" variant="light" size="xs" disabled
                          >
                             Pagado
                          </Button>
                       ) : (
                          <Button 
                             size="xs" 
                             color="blue" 
                             disabled={!tieneHoras}
                             onClick={() => handlePagar(emp.id)}
                          >
                             Pagar
                          </Button>
                       )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        {nominaCalculada.length === 0 && (
            <Center p="xl">
                <Stack align="center" gap="xs">
                    <IconAlertCircle size={30} color="gray"/>
                    <Text c="dimmed">No hay empleados activos para mostrar.</Text>
                </Stack>
            </Center>
        )}
      </Paper>
    </Container>
  );
}