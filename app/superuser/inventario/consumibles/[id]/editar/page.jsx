'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Paper, Title, LoadingOverlay, Text, Center } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import ConsumibleForm from '../../../components/ConsumibleForm';
// Ajusta la ruta a donde tengas tu formulario

export default function EditarConsumiblePage() {
    const { id } = useParams(); // Hook para obtener ID en cliente
    const router = useRouter();
    
    const [loading, setLoading] = useState(true);
    const [initialData, setInitialData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/inventario/consumibles/${id}`);
                if (!res.ok) throw new Error('Error al cargar datos');
                const data = await res.json();
                
                // Adaptamos la data de la BD para que el Form la entienda
                const dataFormulario = adaptarDatosParaFormulario(data);
                setInitialData(dataFormulario);

            } catch (error) {
                console.error(error);
                notifications.show({ title: 'Error', message: error.message, color: 'red' });
                router.push('/superuser/inventario/consumibles'); // Regresar si falla
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id, router]);

    const handleSubmit = async (values) => {
        // values viene del ConsumibleForm con la estructura lista
        setLoading(true);
        try {
            const res = await fetch(`/api/inventario/consumibles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error al actualizar');

            notifications.show({ title: 'Éxito', message: 'Consumible actualizado', color: 'green' });
            router.push('/superuser/inventario/consumibles');
            
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingOverlay visible />;
    if (!initialData && !loading) return <Text>No se encontraron datos.</Text>;

    return (
        <Paper p="md">
            <Title order={2} mb="lg">Editar Consumible: {initialData.nombre}</Title>
            
            {/* Reutilizamos el ConsumibleForm.
                - initialValues: carga los datos.
                - onSubmit: maneja el PUT.
                - isEdit: prop opcional si necesitas cambiar textos de "Crear" a "Guardar" dentro del form.
            */}
            <ConsumibleForm
                initialValues={initialData} 
                onSubmit={handleSubmit}
                isEdit={true} 
            />
        </Paper>
    );
}

// --- FUNCIÓN DE ADAPTACIÓN ---
// Esta función toma el objeto complejo de Sequelize (con Includes)
// y lo aplana al formato que usa tu ConsumibleForm.
function adaptarDatosParaFormulario(bdData) {
    let tipoEspecifico = '';
    let datosTecnicos = {};

    // Detectar qué hijo existe y extraer sus datos
    if (bdData.Filtro) {
        tipoEspecifico = 'Filtro';
        datosTecnicos = {
            marcaId: bdData.Filtro.marcaId?.toString(), // Mantine suele preferir strings en Selects
            codigo: bdData.Filtro.codigo,
            grupoEquivalenciaId: bdData.Filtro.grupoEquivalenciaId
        };
    } else if (bdData.Aceite) {
        tipoEspecifico = 'Aceite';
        datosTecnicos = {
            marcaId: bdData.Aceite.marcaId?.toString(),
            viscosidad: bdData.Aceite.viscosidad,
            tipoBase: bdData.Aceite.tipoBase
        };
    } else if (bdData.Bateria) {
        tipoEspecifico = 'Bateria';
        datosTecnicos = {
            marcaId: bdData.Bateria.marcaId?.toString(),
            modelo: bdData.Bateria.modelo,
            amperaje: bdData.Bateria.amperaje,
            voltaje: bdData.Bateria.voltaje,
            borne: bdData.Bateria.borne
        };
    } 
    // ... agregar lógica para Neumatico, Correa, etc.

    return {
        // Datos Generales
        nombre: bdData.nombre,
        tipo: bdData.tipo, // 'fungible' o 'serializado'
        categoria: bdData.categoria, // 'filtro de aceite', etc.
        stockMinimo: bdData.stockMinimo,
        unidadMedida: bdData.unidadMedida,
        imagen: bdData.imagen, // Si manejas preview de imagen
        
        // Datos Calculados para el Form
        tipoSpecifico: tipoEspecifico, // Para que el form sepa qué campos mostrar
        datosTecnicos: datosTecnicos   // Los valores de los inputs específicos
    };
}