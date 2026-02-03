'use client';

import React, { useState, useEffect } from 'react';
import {
    Paper, Title, Text, Group, Button, Badge, ScrollArea,
    ActionIcon, Modal, TextInput, Select, Textarea, Stack,
    ThemeIcon, Checkbox, Menu, Loader, Tooltip
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { 
    IconPlus, IconCheck, IconClock, IconUser, IconDotsVertical, IconListCheck, IconUsers, IconHandStop
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardTareas({ glassStyle }) {
    const { user } = useAuth();
    
    const containerStyle = glassStyle || {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    };

    const [tareas, setTareas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [empleados, setEmpleados] = useState([]);
    
    const [form, setForm] = useState({
        titulo: '',
        descripcion: '',
        prioridad: 'Media',
        asignadoAId: '', // Vacío o 'general' significa null
        fechaVencimiento: new Date()
    });

    const esPresidencia = user?.departamento?.includes('Presidencia') || user?.rol === 'admin'; 

    const fetchTareas = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/tareas?empleadoId=${user.id}&esPresidencia=${esPresidencia}`);
            const data = await res.json();
            if (Array.isArray(data)) setTareas(data);
        } catch (error) { console.error(error); } 
        finally { setLoading(false); }
    };

    const fetchEmpleados = async () => {
        if (esPresidencia && empleados.length === 0) {
            try {
                const res = await fetch('/api/rrhh/empleados?where=estado:Activo');
                const data = await res.json();
                const lista = Array.isArray(data) ? data : data.data || [];
                
                // Construimos la lista con la opción GENERAL al principio
                const opciones = lista.map(e => ({
                    value: String(e.id),
                    label: `${e.nombre} ${e.apellido} - ${e.departamento || 'General'}`
                }));
                
                // Agregamos opción "General" al inicio
                opciones.unshift({ value: 'general', label: '📢 GENERAL (Visible para todos)' });
                
                setEmpleados(opciones);
            } catch (err) { console.error(err); }
        }
    };

    useEffect(() => {
        if (user) fetchTareas();
        else setLoading(false);
    }, [user]);

    const handleCrearTarea = async () => {
        if (!form.titulo || !form.asignadoAId) {
            notifications.show({ message: 'Título y Asignación requeridos', color: 'red' });
            return;
        }
        try {
            const res = await fetch('/api/tareas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, creadoPorId: user.id })
            });
            if (res.ok) {
                notifications.show({ message: 'Tarea creada', color: 'green' });
                setModalOpen(false);
                fetchTareas();
                setForm({ titulo: '', descripcion: '', prioridad: 'Media', asignadoAId: '', fechaVencimiento: new Date() });
            }
        } catch (error) { notifications.show({ message: 'Error al crear', color: 'red' }); }
    };

    const cambiarEstado = async (id, nuevoEstado) => {
        try {
            const res = await fetch(`/api/tareas/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });
            if (res.ok) fetchTareas();
        } catch (error) { console.error(error); }
    };

    // Nueva función: Asignarse una tarea general a uno mismo
    const asumirTarea = async (id) => {
        try {
            const res = await fetch(`/api/tareas/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                // Al asumir, le ponemos el ID del usuario y cambiamos estado a En Progreso
                body: JSON.stringify({ asignadoAId: user.id, estado: 'En Progreso' }) 
            });
            if (res.ok) {
                notifications.show({ message: 'Tarea asignada a ti', color: 'blue' });
                fetchTareas();
            }
        } catch (error) { console.error(error); }
    };

    const getPriorityColor = (p) => {
        switch(p) { case 'Urgente': return 'red'; case 'Alta': return 'orange'; case 'Media': return 'blue'; default: return 'gray'; }
    };

    return (
        <Paper p="lg" radius="lg" style={{ ...containerStyle, transition: 'all 0.3s ease' }}>
            <Group justify="space-between" mb="lg">
                <Group gap="sm">
                    <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} size="lg" radius="md">
                        <IconListCheck size={20}/>
                    </ThemeIcon>
                    <div>
                        <Title order={4} style={{ lineHeight: 1 }}>Mis Tareas</Title>
                        <Text size="xs" c="dimmed">Gestión de actividades</Text>
                    </div>
                    {tareas.filter(t => t.estado !== 'Completada').length > 0 && (
                        <Badge circle size="sm" color="red" ml={-5} style={{ boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                            {tareas.filter(t => t.estado !== 'Completada').length}
                        </Badge>
                    )}
                </Group>
                
                {esPresidencia && (
                    <Button leftSection={<IconPlus size={16}/>} size="xs" radius="xl" variant="filled" color="blue" onClick={() => { setModalOpen(true); fetchEmpleados(); }} style={{ boxShadow: '0 4px 10px rgba(34, 139, 230, 0.3)' }}>
                        Nueva Tarea
                    </Button>
                )}
            </Group>

            <ScrollArea h={300} type="auto" offsetScrollbars>
                {loading ? (
                    <Stack align="center" mt="xl"><Loader size="sm" type="dots" /></Stack>
                ) : tareas.length === 0 ? (
                    <Stack align="center" mt="xl" gap="xs">
                        <ThemeIcon color="gray" variant="light" size="xl" radius="xl"><IconCheck /></ThemeIcon>
                        <Text c="dimmed" size="sm">¡Todo al día! No tienes tareas pendientes.</Text>
                    </Stack>
                ) : (
                    <Stack gap="sm">
                        {tareas.map(tarea => {
                            // Detectar si es tarea general (sin responsable)
                            const esGeneral = !tarea.asignadoAId;
                            
                            return (
                                <Paper 
                                    key={tarea.id} 
                                    p="sm" 
                                    radius="md"
                                    withBorder
                                    style={{ 
                                        backgroundColor: tarea.estado === 'Completada' ? 'rgba(241, 243, 245, 0.5)' : 'rgba(255, 255, 255, 0.6)',
                                        opacity: tarea.estado === 'Completada' ? 0.7 : 1,
                                        borderColor: esGeneral ? 'rgba(34, 139, 230, 0.3)' : 'rgba(0,0,0,0.05)', // Borde azulito si es general
                                        transition: 'transform 0.2s',
                                    }}
                                >
                                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                                        <Group gap="sm" align="flex-start" wrap="nowrap" style={{ flex: 1 }}>
                                            
                                            {/* CHECKBOX: Solo habilitado si la tarea es mía o ya está completada. Si es general y no es mía, muestro botón de asumir */}
                                            {esGeneral && tarea.estado !== 'Completada' ? (
                                                <Tooltip label="Tomar esta tarea">
                                                    <ActionIcon 
                                                        color="blue" 
                                                        variant="light" 
                                                        radius="xl" 
                                                        size="md" 
                                                        mt={2}
                                                        onClick={() => asumirTarea(tarea.id)}
                                                    >
                                                        <IconHandStop size={16} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            ) : (
                                                <Checkbox 
                                                    checked={tarea.estado === 'Completada'}
                                                    onChange={() => cambiarEstado(tarea.id, tarea.estado === 'Completada' ? 'Pendiente' : 'Completada')}
                                                    color="green"
                                                    radius="xl"
                                                    mt={4}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            )}

                                            <div style={{ width: '100%' }}>
                                                <Group gap={5} mb={2}>
                                                    {esGeneral && (
                                                        <Badge size="xs" variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }} leftSection={<IconUsers size={10} />}>
                                                            GENERAL
                                                        </Badge>
                                                    )}
                                                    <Text fw={600} size="sm" td={tarea.estado === 'Completada' ? 'line-through' : 'none'} c="dark.8">
                                                        {tarea.titulo}
                                                    </Text>
                                                </Group>
                                                
                                                {tarea.descripcion && (
                                                    <Text size="xs" c="dimmed" lineClamp={2} mb={4}>{tarea.descripcion}</Text>
                                                )}
                                                
                                                <Group gap={6} mt={6}>
                                                    <Badge size="xs" color={getPriorityColor(tarea.prioridad)} variant="light">{tarea.prioridad}</Badge>
                                                    
                                                    {tarea.fechaVencimiento && (
                                                        <Badge size="xs" color="gray" variant="outline" leftSection={<IconClock size={10}/>} style={{ border: '1px solid #dee2e6' }}>
                                                            {new Date(tarea.fechaVencimiento).toLocaleDateString()}
                                                        </Badge>
                                                    )}
                                                    
                                                    {/* Mostrar quién la tiene asignada (si no es general) */}
                                                    {!esGeneral && esPresidencia && tarea.asignadoAId !== user?.id && (
                                                        <Badge size="xs" color="violet" variant="dot" leftSection={<IconUser size={10}/>} style={{ backgroundColor: 'transparent' }}>
                                                            {tarea.responsable?.nombre}
                                                        </Badge>
                                                    )}

                                                    {/* Mostrar quién la creó */}
                                                    {!esPresidencia && (
                                                        <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>De: {tarea.creador?.nombre}</Text>
                                                    )}
                                                </Group>
                                            </div>
                                        </Group>

                                        <Menu shadow="md" width={150} position="bottom-end">
                                            <Menu.Target>
                                                <ActionIcon variant="subtle" color="gray" size="sm"><IconDotsVertical size={16}/></ActionIcon>
                                            </Menu.Target>
                                            <Menu.Dropdown>
                                                <Menu.Label>Acciones</Menu.Label>
                                                {esGeneral && (
                                                     <Menu.Item leftSection={<IconUser size={14}/>} onClick={() => asumirTarea(tarea.id)}>Asumir Tarea</Menu.Item>
                                                )}
                                                <Menu.Item leftSection={<IconClock size={14}/>} onClick={() => cambiarEstado(tarea.id, 'Pendiente')}>Pendiente</Menu.Item>
                                                <Menu.Item leftSection={<IconListCheck size={14}/>} onClick={() => cambiarEstado(tarea.id, 'En Progreso')}>En Progreso</Menu.Item>
                                                <Menu.Item leftSection={<IconCheck size={14}/>} onClick={() => cambiarEstado(tarea.id, 'Completada')}>Completada</Menu.Item>
                                                {esPresidencia && (
                                                    <>
                                                        <Menu.Divider />
                                                        <Menu.Item color="red" onClick={() => cambiarEstado(tarea.id, 'Cancelada')}>Eliminar</Menu.Item>
                                                    </>
                                                )}
                                            </Menu.Dropdown>
                                        </Menu>
                                    </Group>
                                </Paper>
                            );
                        })}
                    </Stack>
                )}
            </ScrollArea>

            {/* MODAL */}
            <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Tarea" centered radius="lg">
                <Stack>
                    <TextInput 
                        label="Título" 
                        placeholder="Ej. Limpieza de patio" 
                        required 
                        value={form.titulo}
                        onChange={(e) => setForm({...form, titulo: e.target.value})}
                    />
                    <Textarea 
                        label="Descripción" 
                        value={form.descripcion}
                        onChange={(e) => setForm({...form, descripcion: e.target.value})}
                    />
                    <Group grow>
                        <Select
                            label="Prioridad"
                            data={['Baja', 'Media', 'Alta', 'Urgente']}
                            value={form.prioridad}
                            onChange={(val) => setForm({...form, prioridad: val})}
                            allowDeselect={false}
                        />
                         <DateInput
                            label="Vencimiento"
                            value={form.fechaVencimiento}
                            onChange={(val) => setForm({...form, fechaVencimiento: val})}
                        />
                    </Group>
                    <Select
                        label="Asignar a"
                        placeholder="Seleccionar..."
                        searchable
                        data={empleados}
                        value={form.asignadoAId}
                        onChange={(val) => setForm({...form, asignadoAId: val})}
                        required
                        description="Selecciona 'GENERAL' para que todos puedan verla."
                    />
                    <Button fullWidth onClick={handleCrearTarea} mt="md" radius="md">Crear Tarea</Button>
                </Stack>
            </Modal>
        </Paper>
    );
}