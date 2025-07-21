// Ruta: app/superuser/guardias/page.jsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Container, Title, Modal, Group, Select, Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import CalendarioGuardias from './CalendarioGuardias';
import FormularioGuardia from './FormularioGuardia';

// Función para ajustar la fecha final para que FullCalendar la muestre correctamente.
// FullCalendar considera que la fecha 'end' es exclusiva. Si una guardia termina el día 7,
// debemos pasarle el día 8 para que visualmente ocupe hasta el final del día 7.
const ajustarFechaFin = (fecha) => {
    const date = new Date(fecha);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
};


export default function GestionGuardiasPage() {
    const [guardias, setGuardias] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [puestos, setPuestos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroPuestoId, setFiltroPuestoId] = useState('');

    const [opened, { open, close }] = useDisclosure(false);
    const [fechaSeleccionada, setFechaSeleccionada] = useState(null);

    // Función para obtener todos los datos necesarios desde la API
    const fetchData = async () => {
        setLoading(true);
        try {
            const [guardiasRes, empleadosRes, puestosRes] = await Promise.all([
                fetch('/api/recursoshumanos/guardias'),
                fetch('/api/recursoshumanos/empleados'),
                fetch('/api/recursoshumanos/puestos')
            ]);
            const guardiasData = await guardiasRes.json();
            const empleadosData = await empleadosRes.json();
            const puestosData = await puestosRes.json();

            // Asumiendo que la API de guardias no incluye los datos del empleado, los "unimos" aquí
            const guardiasConEmpleado = guardiasData.map(g => {
                const empleado = empleadosData.find(e => e.id === g.empleadoId);
                return { ...g, empleado: empleado || { nombre: 'Empleado', apellido: 'No Encontrado' } };
            });

            setGuardias(guardiasConEmpleado);
            setEmpleados(empleadosData);
            setPuestos(puestosData);

        } catch (error) {
            console.error("Error al obtener los datos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    // Función que se dispara al hacer clic en una fecha del calendario
    const handleDateClick = (arg) => {
        setFechaSeleccionada(arg.dateStr); // 'YYYY-MM-DD'
        open();
    };

    // Memoizamos el filtrado y la transformación para optimizar rendimiento
    const eventosCalendario = useMemo(() => {
        let guardiasFiltradas = guardias;

        if (filtroPuestoId && empleados.length > 0) {
            const empleadosConPuesto = empleados.filter(e => 
                e.puestos?.some(p => p.id === parseInt(filtroPuestoId))
            );
            const idsEmpleadosFiltrados = empleadosConPuesto.map(e => e.id);
            guardiasFiltradas = guardias.filter(g => idsEmpleadosFiltrados.includes(g.empleadoId));
        }

        return guardiasFiltradas.map(guardia => ({
            id: guardia.id,
            title: `${guardia.empleado?.nombre} ${guardia.empleado?.apellido}`,
            start: guardia.fechaInicioGuardia,
            end: ajustarFechaFin(guardia.fechaFinGuardia),
            allDay: true,
            backgroundColor: guardia.estadoGuardia === 'Activa' ? '#228be6' : (guardia.estadoGuardia === 'Planificada' ? '#15aabf' : '#868e96'),
            borderColor: guardia.estadoGuardia === 'Activa' ? '#1c7ed6' : (guardia.estadoGuardia === 'Planificada' ? '#108d9e' : '#495057'),
        }));
    }, [guardias, empleados, filtroPuestoId]);
    
    const opcionesPuestos = puestos.map(puesto => ({
        value: puesto.id.toString(),
        label: puesto.nombre
    }));

    return (
        <Container size="lg" mt={60} style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // Blanco (255,255,255) con 80% de opacidad (0.8)
        padding: '20px', // Opcional: para darle un poco de espacio interno al contenido
        borderRadius: '8px', // Opcional: bordes redondeados
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' // Opcional: una sombra suave
      }}>
            <Title order={2} mb="xl">📅 Gestión de Guardias</Title>

            <Modal 
                opened={opened} 
                onClose={close} 
                title={fechaSeleccionada ? `Registrar Guardia desde el ${new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-ES')}` : 'Registrar Guardia'} 
                centered
            >
                {fechaSeleccionada && (
                    <FormularioGuardia
                        empleados={empleados}
                        fechaInicio={fechaSeleccionada}
                        onSuccess={() => {
                            close();
                            fetchData(); 
                        }}
                    />
                )}
            </Modal>
            
            <Select
                label="Filtrar por Puesto"
                placeholder="Mostrar todos los puestos"
                data={opcionesPuestos}
                value={filtroPuestoId}
                onChange={setFiltroPuestoId}
                clearable
                mb="md"
            />

            {loading ? (
                <Group position="center" mt="xl"><Loader /></Group>
            ) : (
                <CalendarioGuardias eventos={eventosCalendario} onDateClick={handleDateClick} />
            )}
        </Container>
    );
}