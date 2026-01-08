'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Paper, LoadingOverlay, Center, Loader, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { adaptarModeloParaFormulario } from './modelAdapter';
import ModeloActivoForm from '../../../components/ModeloActivoForm';

export default function EditModelPage() {
    const router = useRouter();
    const { id , type} = useParams();
    // Asumimos que pasas el tipo por query param ?type=Vehículo o lo deduces

    const [isLoading, setIsLoading] = useState(true);
    const [initialValues, setInitialValues] = useState(null);

    // 1. Determinar Endpoint según el tipo (igual que tenías)
    const getEndpoint = () => {
        // Normalización simple para evitar errores de mayúsculas/acentos
        const t = type.toLowerCase();
        if (t.includes('vehiculo')) return `/api/gestionMantenimiento/vehiculo/${id}`;
        if (t.includes('remolque')) return `/api/gestionMantenimiento/remolque/${id}`;
        if (t.includes('maquina')) return `/api/gestionMantenimiento/maquina/${id}`;
        return `/api/gestionMantenimiento/vehiculo/${id}`; // Fallback
    };

    // 2. Fetch de Datos
    useEffect(() => {
        const fetchData = async () => {
            const endpoint = getEndpoint();
            try {
                const response = await fetch(endpoint);
                const res = await response.json();

                if (res.success) {
                    // ADAPTAMOS LA DATA DE LA BD AL FORMATO DEL FORM
                    const formValues = adaptarModeloParaFormulario(res.data);
                    setInitialValues(formValues);
                } else {
                    notifications.show({ 
                        title: 'Error', 
                        message: 'No se pudo cargar el modelo', 
                        color: 'red' 
                    });
                    router.push('/superuser/flota/modelos');
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                notifications.show({ title: 'Error de Red', message: error.message, color: 'red' });
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchData();
    }, [id, type]);

    // 3. Manejo del PUT (Actualización)
    // const handleUpdate = async (values) => {
    //     const endpoint = getEndpoint();
        
    //     try {
    //         const response = await fetch(endpoint, {
    //             method: 'PUT',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify(values), // Tu backend debe manejar la actualización anidada
    //         });

    //         const res = await response.json();

    //         if (res.success) {
    //             notifications.show({ title: 'Éxito', message: 'Modelo actualizado correctamente', color: 'green' });
    //             router.push('/superuser/flota/modelos'); // Volver a la lista
    //         } else {
    //             throw new Error(res.error || 'Error al actualizar');
    //         }
    //     } catch (error) {
    //         console.error(error);
    //         notifications.show({ title: 'Error', message: error.message, color: 'red' });
    //     }
    // };

    if (isLoading) {
        return (
            <Center h={400}>
                <Loader size="lg" />
                <Text ml="md">Cargando datos del modelo...</Text>
            </Center>
        );
    }

    return (
        <Paper p="md" pos="relative">
            <div style={{ marginBottom: '2rem' }}>
                <Title order={2}>{`Editar Modelo: ${type}`}</Title>
            </div>

            {/* REUTILIZAMOS TU FORMULARIO DE CREACIÓN */}
            {initialValues && (
                <ModeloActivoForm 
                    tipoPreseleccionado={type}
                    initialValues={initialValues} 
                    // onSubmit={handleUpdate}
                    onSuccess={() => router.push('/superuser/flota/modelos')}
                    isEdit={true} // Flag importante para cambiar textos de botones o lógica interna
                    onCancel={() => router.back()}
                    id={id}
                />
            )}
        </Paper>
    );
}