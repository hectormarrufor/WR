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
function adaptarDatosParaFormulario(bdData) {
    if (!bdData) return {};

    // 1. Extraemos los datos del Padre (Consumible)
    const base = {
        nombre: bdData.nombre || '',
        categoria: bdData.categoria || '',
        stockMinimo: Number(bdData.stockMinimo) || 0,
        stockAlmacen: Number(bdData.stockAlmacen) || 0,
        precioPromedio: Number(bdData.precioPromedio) || 0,
        unidadMedida: bdData.unidadMedida,
        clasificacion: bdData.tipo === 'serializado' ? 'Serializado' : 'Fungible',
        // Si es serializado, mapeamos los seriales
        itemsSerializados: bdData.serializados?.map(s => ({ 
            serial: s.serial, 
            garantia: s.fechaGarantia // Ajusta según tu modelo
        })) || [],
    };

    // 2. Extraemos y APLANAMOS los datos del Hijo
    let datosHijo = {};

    if (bdData.Filtro) {
        datosHijo = {
            marca: bdData.Filtro.marca || '',
            codigo: bdData.Filtro.codigo || '',
            tipo: bdData.Filtro.tipo === "aire" ? "Aire" : bdData.Filtro.tipo === "aceite" ? "Aceite" : bdData.Filtro.tipo === "combustible" ? "Combustible" : "", // 'aire', 'aceite', etc.
            posicion: bdData.Filtro.posicion === "primario" ? "Primario" : "Secundario",
            imagen: bdData.Filtro.imagen || '',
            // Guardamos la info de equivalencia para el UI
            grupoEquivalenciaId: bdData.Filtro.grupoEquivalenciaId,
        };
    } else if (bdData.Aceite) {
        datosHijo = {
            marca: bdData.Aceite.marca || '',
            viscosidad: bdData.Aceite.viscosidad || '',
            aplicacion: bdData.Aceite.aplicacion || '',
            tipo: bdData.Aceite.tipo || '', // ej: Sintético
            modelo: bdData.Aceite.modelo || '',
        };
    } else if (bdData.Baterium || bdData.Bateria) {
        const bat = bdData.Baterium || bdData.Bateria;
        datosHijo = {
            marca: bat.marca || '',
            codigo: bat.codigo || '', // El grupo
            amperaje: bat.amperaje || 0,
            voltaje: bat.voltaje || 12,
            capacidad: bat.capacidad || 0,
        };
    } else if (bdData.Neumatico) {
        datosHijo = {
            marca: bdData.Neumatico.marca || '',
            medida: bdData.Neumatico.medida || '',
            modelo: bdData.Neumatico.modelo || '',
        };
    } else if (bdData.Correa) {
        datosHijo = {
            marca: bdData.Correa.marca || '',
            codigo: bdData.Correa.codigo || '',
        };
    } else if (bdData.Sensor) {
        datosHijo = {
            marca: bdData.Sensor.marca || '',
            codigo: bdData.Sensor.codigo || '',
            nombreEspecifico: bdData.Sensor.nombre || '',
        };
    }

    // 3. RETORNAMOS TODO EN UN SOLO NIVEL (Spread operator)
    return {
        ...base,
        ...datosHijo
    };
}