"use client";

import { useState, useEffect } from "react";
import { 
  Button, Modal, NumberInput, Textarea, Stack, Group, LoadingOverlay, 
  Title
} from "@mantine/core";
import { DateInput } from "@mantine/dates"; // Asegúrate de tener @mantine/dates instalado
import { IconClockPlus } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import EmployeeSelector from "./EmployeeSelector"; // Importamos el componente de arriba
import { useAuth } from "@/hooks/useAuth";

export default function ManualHoursButton() {
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const {userId} = useAuth();

  // Estado del Formulario
  const [form, setForm] = useState({
    empleadoId: null,
    fecha: new Date(),
    horas: 8,
    observaciones: ""
  });

  // Cargar empleados al abrir el modal (o al montar el componente)
  useEffect(() => {
    if (opened && employees.length === 0) {
      setLoading(true);
      fetch("/api/rrhh/empleados") // Asumo que tienes este endpoint
        .then((res) => res.json())
        .then((data) => setEmployees(Array.isArray(data) ? data : []))
        .catch((err) => console.error("Error cargando empleados", err))
        .finally(() => setLoading(false));
    }
  }, [opened]);

  // Manejo de envío
  const handleSubmit = async () => {
    // Validaciones
    if (!form.empleadoId) {
        return notifications.show({ title: 'Error', message: 'Debes seleccionar un empleado', color: 'red' });
    }
    if (!form.fecha) {
        return notifications.show({ title: 'Error', message: 'La fecha es obligatoria', color: 'red' });
    }
    if (form.horas <= 0) {
        return notifications.show({ title: 'Error', message: 'Las horas deben ser mayor a 0', color: 'red' });
    }

    setLoading(true);
    try {
      const res = await fetch("/api/rrhh/horas-manuales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
             ...form,
             // Asegurar formato fecha YYYY-MM-DD
             fecha: form.fecha.toISOString().split('T')[0],
             creadorId: userId
        }),
      });

      if (!res.ok) throw new Error("Error al guardar");

      notifications.show({ title: 'Éxito', message: 'Horas registradas correctamente', color: 'green' });
      
      // Reset y Cerrar
      setForm({ empleadoId: null, fecha: new Date(), horas: 8, observaciones: "" });
      setOpened(false);
      
      // Opcional: Recargar la página para ver cambios en la pizarra
      window.location.reload();

    } catch (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button 
        leftSection={<IconClockPlus size={18} />} 
        onClick={() => setOpened(true)}
        color="teal"
      >
        Registrar Horas
      </Button>

      <Modal 
        opened={opened} 
        onClose={() => setOpened(false)} 
        title="Registrar Horas Manuales (Taller/Base)"
        centered
      >
        <Stack pos="relative">
          <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
          
          {/* 1. SELECTOR DE EMPLEADO (Abre su propio modal interno) */}
          <EmployeeSelector 
             label="Empleado"
             data={employees}
             value={form.empleadoId}
             onChange={(id) => setForm({ ...form, empleadoId: id })}
          />

          {/* 2. FECHA */}
          <DateInput
            label="Fecha"
            placeholder="Selecciona fecha"
            value={form.fecha}
            onChange={(date) => setForm({ ...form, fecha: date })}
            withAsterisk
          />

          {/* 3. CANTIDAD DE HORAS */}
          <NumberInput
            label="Horas Trabajadas"
            description="Max 24h"
            value={form.horas}
            onChange={(val) => setForm({ ...form, horas: val })}
            min={0.5}
            max={24}
            step={0.5}
            withAsterisk
          />

          {/* 4. OBSERVACIONES */}
          <Textarea
            label="Observaciones / Motivo"
            placeholder="Ej: Trabajo de soldadura en taller..."
            value={form.observaciones}
            onChange={(e) => setForm({ ...form, observaciones: e.currentTarget.value })}
            minRows={3}
          />
          <Title order={6} color="gray" align="center">
            horas registradas por {employees.find(emp => emp.usuario?.id === userId)?.nombre || 'admin'}
          </Title>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setOpened(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} color="teal" loading={loading}>Guardar Registro</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}