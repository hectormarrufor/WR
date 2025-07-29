'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader, Paper, Title, Alert } from '@mantine/core';
// Importamos el formulario de creación que ya es inteligente
import CrearActivoPage from '../../crear/page';

export default function EditarActivoPage() {
    const { id } = useParams();
    const [initialData, setInitialData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (id) {
            const fetchActivo = async () => {
                setLoading(true);
                try {
                    const response = await fetch(`/api/gestionMantenimiento/activos/${id}`);
                    if (!response.ok) throw new Error('No se pudo cargar el activo para editar');
                    const data = await response.json();
                    setInitialData(data);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchActivo();
        }
    }, [id]);

    if (loading) {
        return <Loader size="xl" style={{ display: 'block', margin: 'auto', marginTop: '50px' }} />;
    }

    if (error) {
        return <Alert color="red" title="Error">{error}</Alert>;
    }

    if (!initialData) {
        return <Alert color="yellow" title="Aviso">No se encontraron datos para el activo.</Alert>;
    }
    
    // Aquí reutilizamos el formulario de creación, pasándole los datos iniciales.
    // Necesitarás modificar ligeramente tu `CrearActivoPage` para aceptar `initialData` como prop.
    return (
         <Paper withBorder shadow="md" p="xl" radius="md" mt={30}>
            <Title order={2} ta="center" mb="xl">Editar Activo: {initialData.codigoActivo}</Title>
            {/* Aquí deberías tener un componente formulario separado para máxima reutilización */}
            {/* Por ahora, asumimos que puedes adaptar CrearActivoPage o crear un nuevo componente */}
            <p>Formulario de edición iría aquí, precargado con los datos.</p>
             {/* <ActivoForm initialData={initialData} isEditing={true} /> */}
         </Paper>
    );
}