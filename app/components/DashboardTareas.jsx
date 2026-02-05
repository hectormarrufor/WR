'use client';

import React, { useState, useEffect } from 'react';
import {
    Paper, Title, Text, Group, Button, Badge, ScrollArea,
    ActionIcon, Modal, TextInput, Select, Textarea, Stack,
    ThemeIcon, Checkbox, Menu, Loader, Tooltip
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { 
    IconPlus, IconCheck, IconClock, IconUser, IconDotsVertical, IconListCheck, IconUsers, IconHandStop,
    IconRefresh
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/hooks/useAuth';
import { formatDateLong, formatDateShort } from '../helpers/dateUtils';

export default function DashboardTareas({ glassStyle }) {
    const { user, nombre } = useAuth();
    
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
        console.log(user);
        try {
            const res = await fetch(`/api/tareas?userId=${user.id}&esPresidencia=${esPresidencia}`);
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

                console.log('Empleados obtenidos para asignación de tareas:', lista);

                const listaConUsuario = lista.filter(e => e.usuario); // Solo con usuario asociado
                
                // Construimos la lista con la opción GENERAL al principio
                const opciones = listaConUsuario.map(e => ({
                    value: String(e.usuario?.id),
                    label: `${e.nombre} ${e.apellido} - ${e.puestos.map(p => p.nombre).join(', ') || 'General'}`
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
                body: JSON.stringify({ nombre: nombre, estado: nuevoEstado })
            });
            if (res.ok) fetchTareas();
        } catch (error) { console.error(error); }
    };

    const eliminarTarea = async (id) => {
        if (!window.confirm("¿Estás seguro de borrarla definitivamente de la base de datos?")) return;
        try {
            const res = await fetch(`/api/tareas/${id}?nombre=${encodeURIComponent(nombre)}`, { method: 'DELETE' });
            if (res.ok) {
                notifications.show({ message: 'Tarea eliminada', color: 'red' });
                fetchTareas();
            }
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
            <Group justify="space-between" mb={0}>
                <Group gap="sm">
                    <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} size="lg" radius="md">
                        <IconListCheck size={20}/>
                    </ThemeIcon>
                    <div>
                        <Title order={4} style={{ lineHeight: 1 }}>{esPresidencia? 'Asignar Tareas' : 'Mis Tareas'}</Title>
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
                        {esPresidencia ? 'Asignar Tarea' : 'Nueva Tarea'}
                    </Button>
                )}
            </Group>

           <ScrollArea.Autosize mah={350}>
                {loading ? (
                    <Stack align="center" mt={0}><Loader size="sm" type="dots" /></Stack>
                ) : tareas.length === 0 ? (
                    <Stack align="center" mt={0} gap="xs">
                        <ThemeIcon color="gray" variant="light" size="xl" radius="xl"><IconCheck /></ThemeIcon>
                        <Text c="dimmed" size="sm">¡Todo al día! No hay tareas pendientes.</Text>
                    </Stack>
                ) : (
                    <Stack gap="sm">
                        {/* 1. ORDENAMOS LAS TAREAS AQUÍ MISMO */}
                        {[...tareas].sort((a, b) => {
                            // Definimos pesos: Activa (0) < Completada (1) < Cancelada (2)
                            const getScore = (estado) => {
                                if (estado === 'Cancelada') return 2;
                                if (estado === 'Completada') return 1;
                                return 0;
                            };
                            return getScore(a.estado) - getScore(b.estado);
                        }).map(tarea => {
                            const esGeneral = !tarea.asignadoAId;
                            const esCancelada = tarea.estado === 'Cancelada'; // Flag para facilitar estilos
                            const esCompletada = tarea.estado === 'Completada';

                            return (
                                <Paper 
                                    key={tarea.id} 
                                    p="sm" 
                                    radius="md"
                                    withBorder
                                    style={{ 
                                        // 2. ESTILOS VISUALES PARA DIFERENCIAR ESTADOS
                                        backgroundColor: esCancelada 
                                            ? 'rgba(255, 200, 200, 0.3)' // Rojo suave si está cancelada
                                            : esCompletada ? 'rgba(241, 243, 245, 0.5)' : 'rgba(255, 255, 255, 0.6)',
                                        opacity: (esCancelada || esCompletada) ? 0.6 : 1,
                                        // Borde rojo si cancelada, azul si general, gris normal
                                        borderColor: esCancelada 
                                            ? 'rgba(255, 0, 0, 0.2)' 
                                            : esGeneral ? 'rgba(34, 139, 230, 0.3)' : 'rgba(0,0,0,0.05)',
                                        transition: 'transform 0.2s',
                                    }}
                                >
                                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                                        <Group gap="sm" align="flex-start" wrap="nowrap" style={{ flex: 1 }}>
                                            
                                            {/* Checkbox (Deshabilitado si está cancelada) */}
                                            {esGeneral && !esCompletada && !esCancelada ? (
                                                <Tooltip label="Tomar esta tarea">
                                                    <ActionIcon color="blue" variant="light" radius="xl" size="md" mt={2} onClick={() => asumirTarea(tarea.id)}>
                                                        <IconHandStop size={16} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            ) : (
                                                <Checkbox 
                                                    checked={esCompletada}
                                                    // Si está cancelada, deshabilitamos el check
                                                    disabled={esCancelada} 
                                                    onChange={() => cambiarEstado(tarea.id, esCompletada ? 'Pendiente' : 'Completada')}
                                                    color="green"
                                                    radius="xl"
                                                    mt={4}
                                                    style={{ cursor: esCancelada ? 'not-allowed' : 'pointer' }}
                                                />
                                            )}

                                            <div style={{ width: '100%' }}>
                                                <Group gap={5} mb={2}>
                                                    {esGeneral && <Badge size="xs" variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }} leftSection={<IconUsers size={10} />}>GENERAL</Badge>}
                                                    {esCancelada && <Badge size="xs" color="red" variant="filled">CANCELADA</Badge>}
                                                    
                                                    {/* Título tachado si completada o cancelada */}
                                                    <Text fw={600} size="sm" td={(esCompletada || esCancelada) ? 'line-through' : 'none'} c={esCancelada ? 'red.8' : 'dark.8'}>
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
                                                            {formatDateLong(tarea.fechaVencimiento)}
                                                        </Badge>
                                                    )}
                                                    {!esGeneral && esPresidencia && tarea.asignadoAId !== user?.id && (
                                                        <Badge size="xs" color="violet" variant="dot" leftSection={<IconUser size={10}/>} style={{ backgroundColor: 'transparent' }}>
                                                            {tarea.responsable?.empleado?.nombre}
                                                        </Badge>
                                                    )}
                                                    {!esPresidencia && (
                                                        <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>De: {tarea.creador?.empleado?.nombre}</Text>
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
                                                
                                                {esGeneral && <Menu.Item leftSection={<IconUser size={14}/>} onClick={() => asumirTarea(tarea.id)}>Asumir Tarea</Menu.Item>}
                                                
                                                {/* Si NO está cancelada, mostramos estados normales */}
                                                {!esCancelada && (
                                                    <>
                                                        <Menu.Item leftSection={<IconClock size={14}/>} onClick={() => cambiarEstado(tarea.id, 'Pendiente')}>Pendiente</Menu.Item>
                                                        <Menu.Item leftSection={<IconListCheck size={14}/>} onClick={() => cambiarEstado(tarea.id, 'En Progreso')}>En Progreso</Menu.Item>
                                                        <Menu.Item leftSection={<IconCheck size={14}/>} onClick={() => cambiarEstado(tarea.id, 'Completada')}>Completada</Menu.Item>
                                                    </>
                                                )}

                                                {esPresidencia && (
                                                    <>
                                                        <Menu.Divider />
                                                        
                                                        {esCancelada ? (
                                                            // --- AQUÍ ESTÁ EL CAMBIO ---
                                                            <>
                                                                {/* 1. Opción para Revivir (Vuelve a Pendiente) */}
                                                                <Menu.Item 
                                                                    color="blue" 
                                                                    leftSection={<IconRefresh size={14}/>} 
                                                                    onClick={() => cambiarEstado(tarea.id, 'Pendiente')}
                                                                >
                                                                    Revivir Tarea
                                                                </Menu.Item>

                                                                {/* 2. Opción para Eliminar Definitivamente */}
                                                                <Menu.Item 
                                                                    color="red" 
                                                                    leftSection={<IconHandStop size={14}/>} 
                                                                    onClick={() => eliminarTarea(tarea.id)}
                                                                >
                                                                    Eliminar Definitivamente
                                                                </Menu.Item>
                                                            </>
                                                        ) : (
                                                            // Si está activa, opción para Cancelar
                                                            <Menu.Item color="orange" onClick={() => cambiarEstado(tarea.id, 'Cancelada')}>
                                                                Cancelar Tarea
                                                            </Menu.Item>
                                                        )}
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
            </ScrollArea.Autosize>

            {/* MODAL */}
            <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Generar Nueva Tarea" centered radius="lg">
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