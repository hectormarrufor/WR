// Ruta: components/guardias/FormularioGuardiaSimplificado.jsx

'use client';

import { useState } from 'react';
import { useForm } from '@mantine/form';
import { Select, Button, Group, Text, Box, Checkbox, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

export default function FormularioGuardia({ empleados, fechaInicio, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const form = useForm({
        initialValues: {
            empleadoId: '',
            proyectarFuturo: true,
        },
        validate: {
            empleadoId: (value) => (value ? null : 'Debes seleccionar un empleado'),
        },
    });
    
    const handleSubmit = async (values) => {
        setLoading(true);
        setError(null);

        const payload = {
            empleadoId: parseInt(values.empleadoId),
            fechaInicioGuardia: fechaInicio,
            proyectar: values.proyectarFuturo,
        };

        try {
            const response = await fetch('/api/recursoshumanos/guardias/crear-con-proyeccion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error desconocido al crear la guardia');
            }

            onSuccess(); // Llama a la función del padre para cerrar modal y recargar datos

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const opcionesEmpleados = empleados
      .filter(emp => emp.puestos && emp.puestos.some(p => p.esCampo))
      .map(emp => ({
        value: emp.id.toString(),
        label: `${emp.nombre} ${emp.apellido}`,
      }));

    return (
        <Box component="form" onSubmit={form.onSubmit(handleSubmit)}>
            <Select
                label="Empleado"
                placeholder="Selecciona un empleado de campo"
                data={opcionesEmpleados}
                searchable
                required
                {...form.getInputProps('empleadoId')}
            />

            <Checkbox
                label="Crear y proyectar guardias futuras (aprox. 3 meses)"
                mt="lg"
                description="Esto generará automáticamente las guardias y descansos siguientes."
                {...form.getInputProps('proyectarFuturo', { type: 'checkbox' })}
            />

            {error && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" mt="md">
                    {error}
                </Alert>
            )}

            <Group position="right" mt="xl">
                <Button type="submit" loading={loading}>
                    Confirmar Guardia
                </Button>
            </Group>
        </Box>
    );
}