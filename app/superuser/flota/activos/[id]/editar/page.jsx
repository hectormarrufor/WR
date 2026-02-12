// app/superuser/flota/activos/[id]/editar/page.jsx (o donde lo tengas)
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Paper, Title, Loader, Alert, Group, Text, Button } from '@mantine/core';
import ActivoForm from '../../components/ActivoForm'; // Asegúrate de la ruta

export default function EditarActivoPage() {
    const { id } = useParams();
    const router = useRouter();
    
    const [initialData, setInitialData] = useState(null);
    const [plantilla, setPlantilla] = useState(null);
    const [matrices, setMatrices] = useState([]); // Lista para el select
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (id) {
            const loadAllData = async () => {
                try {
                    // 1. Fetch del Activo
                    const resActivo = await fetch(`/api/gestionMantenimiento/activos/${id}`);
                    const dataActivo = await resActivo.json();
                    
                    if (!dataActivo.success) throw new Error('No se encontró el activo');

                    // Extraemos la plantilla del activo para pasarla al form (por si la necesita para validaciones)
                    const instance = dataActivo.data.vehiculoInstancia || dataActivo.data.remolqueInstancia || dataActivo.data.maquinaInstancia;
                    if(instance?.plantilla) setPlantilla(instance.plantilla);

                    setInitialData(dataActivo.data);

                    // 2. Fetch de Matrices de Costo (Para el Select)
                    const resMatrices = await fetch('/api/configuracion/matriz');
                    const dataMatrices = await resMatrices.json();
                    
                    // Formateamos para el Select de Mantine
                    const matricesList = Array.isArray(dataMatrices) 
                        ? dataMatrices.map(m => ({ value: String(m.id), label: `${m.nombre} (${m.tipoActivo})` }))
                        : [];
                    setMatrices(matricesList);

                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            loadAllData();
        }
    }, [id]);

    if (loading) return <div style={{display:'flex', justifyContent:'center', marginTop: 50}}><Loader size="xl" /></div>;
    if (error) return <Alert color="red" title="Error">{error}</Alert>;

    return (
        <Paper p="xl" mt={30}>
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2}>Editar Activo: {initialData?.codigoInterno}</Title>
                    <Text c="dimmed">Actualizar datos físicos y financieros</Text>
                </div>
                <Button variant="subtle" onClick={() => router.back()}>Cancelar</Button>
            </Group>
   
            {/* Renderizamos el formulario en modo EDICIÓN pasando initialData */}
            <ActivoForm 
                initialData={initialData}
                plantilla={plantilla} // Pasamos la plantilla que venía en el activo
                matricesCostos={matrices} // Pasamos la lista de opciones
                tipoActivo={initialData.tipoActivo}
                onCancel={() => router.back()}
            />
        </Paper>
    );
}