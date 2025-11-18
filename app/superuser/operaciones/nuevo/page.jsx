'use client'
import React from 'react'
import { DatePicker } from '@mantine/dates'
import { useForm } from '@mantine/form'


import {
    Box,
    Paper,
    Title,
    TextInput,
    Textarea,
    Select,
    NumberInput,
    Checkbox,
    Group,
    Button,
} from '@mantine/core'
import { se } from 'date-fns/locale'

export default function NuevoOperacionPage() {

    const [modalOpened, setModalOpened] = React.useState(false)
    const [selectedEmpleados, setSelectedEmpleados] = React.useState(null)
    const [empleados, setEmpleados] = React.useState(null)

    React.useEffect(() => {
        // Simula una llamada a la API para obtener la lista de empleados
        fetch('/api/rrhh/empleados')
            .then((res) => res.json())
            .then((data) => {
                console.log(data)
                setEmpleados(data)
            })
            .catch(() => setEmpleados([]))
    }, []);

    const handleSelect = (emp) => {
        setSelectedEmpleados([...selectedEmpleados, emp])
        setModalOpened(false)
    }


    const form = useForm({
        initialValues: {
            title: '',
            description: '',
            type: 'ingreso',
            amount: 0,
            date: null,
            active: true,
        },
        validate: {
            title: (v) => (v.trim().length > 0 ? null : 'El título es requerido'),
            amount: (v) => (v > 0 ? null : 'El monto debe ser mayor a 0'),
        },
    })

    const handleSubmit = (values) => {
        // Aquí puedes enviar los datos a tu API
        console.log('Operación enviada:', values)
        form.reset()
    }

    return (
        <Box sx={{ maxWidth: 720, margin: '40px auto', padding: '0 16px' }}>
            <Paper radius="md" shadow="sm" p="lg">
                <Title order={3} mb="md">
                    Nueva operación
                </Title>

                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <TextInput
                        label="Título"
                        placeholder="Ej: Venta de producto"
                        required
                        {...form.getInputProps('title')}
                    />

                    <Textarea
                        label="Descripción"
                        placeholder="Descripción opcional"
                        mt="sm"
                        minRows={3}
                        {...form.getInputProps('description')}
                    />
                    {/* Área de selección de empleados */}

                    <>
                        <Title order={5} mt="sm" mb={6}>
                            Empleados seleccionados
                        </Title>

                        <Group position="apart" spacing="sm" mb="sm">
                            {empleados?.map(selectedEmpleados =>

                                <Group spacing="sm">
                                    <img
                                        src={selectedEmpleado?.imagen ?? 'https://via.placeholder.com/48?text=+'
                                        }
                                        alt="avatar"
                                        style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 600 }}>
                                            {selectedEmpleado ? `${selectedEmpleado.nombre} ${selectedEmpleado.apellido}` : 'Ninguno seleccionado'}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#666' }}>
                                            {selectedEmpleado ? `${selectedEmpleado.puesto} • ${selectedEmpleado.cedula}` : 'Haz clic en seleccionar para elegir'}
                                        </div>
                                    </div>
                                </Group>

                            )
                            }

                            <Button onClick={() => setModalOpened(true)}>
                                {selectedEmpleados ? 'Cambiar' : 'Seleccionar empleado'}
                            </Button>
                        </Group>

                        {modalOpened && (
                            <div
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    zIndex: 2000,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <div
                                    onClick={() => setModalOpened(false)}
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(0,0,0,0.4)',
                                    }}
                                />

                                <Paper shadow="lg" radius="md" p="md" style={{ width: 720, maxHeight: '80vh', overflow: 'auto', zIndex: 2100 }}>
                                    <Group position="apart" mb="sm">
                                        <Title order={4}>Seleccionar empleado</Title>
                                        <Button variant="light" onClick={() => setModalOpened(false)}>
                                            Cerrar
                                        </Button>
                                    </Group>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {empleados?.map((emp) => (
                                            // Cada empleado será un componente externo; aquí le pasamos las props requeridas y un onClick
                                            <div
                                                key={emp.id}
                                                onClick={() => handleSelect(emp)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    padding: 10,
                                                    borderRadius: 8,
                                                    cursor: 'pointer',
                                                    border: selectedEmployee?.id === emp.id ? '1px solid #228be6' : '1px solid transparent',
                                                    background: selectedEmployee?.id === emp.id ? '#f1f8ff' : 'transparent',
                                                }}
                                            >
                                                {/* Si usas un componente EmployeeItem, reemplaza este bloque por: 
                                                            <EmployeeItem imagen={emp.imagen} nombre={emp.nombre} apellido={emp.apellido} cedula={emp.cedula} puesto={emp.puesto} onClick={() => handleSelect(emp)} />
                                                        */}
                                                <img src={emp.imagen} alt={`${emp.nombre} ${emp.apellido}`} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600 }}>{emp.nombre} {emp.apellido}</div>
                                                    <div style={{ fontSize: 13, color: '#666' }}>{emp.puesto} • {emp.cedula}</div>
                                                </div>
                                                <Button size="xs">Seleccionar</Button>
                                            </div>
                                        ))}
                                    </div>
                                </Paper>
                            </div>
                        )}
                    </>


                    <Group grow mt="sm">
                        <Select
                            label="Tipo"
                            data={[
                                { value: 'ingreso', label: 'Ingreso' },
                                { value: 'gasto', label: 'Gasto' },
                            ]}
                            {...form.getInputProps('type')}
                        />

                        <NumberInput
                            label="Monto"
                            placeholder="0.00"
                            precision={2}
                            min={0}
                            step={0.01}
                            {...form.getInputProps('amount')}
                        />
                    </Group>

                    <DatePicker
                        label="Fecha"
                        placeholder="Selecciona una fecha"
                        mt="sm"
                        {...form.getInputProps('date')}
                    />

                    <Checkbox
                        label="Activo"
                        mt="sm"
                        {...form.getInputProps('active', { type: 'checkbox' })}
                    />

                    <Group position="right" mt="xl">
                        <Button variant="default" onClick={() => form.reset()}>
                            Limpiar
                        </Button>
                        <Button type="submit">Guardar</Button>
                    </Group>
                </form>
            </Paper>
        </Box>
    )
}