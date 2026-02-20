// app/superuser/flota/activos/[id]/editar/page.jsx
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
    
    // Estados para las matrices
    const [matrices, setMatrices] = useState([]); // Lista formateada para el select
    const [matricesRaw, setMatricesRaw] = useState([]); // <--- NUEVO: Data cruda para la matemática
    
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

                    // Extraemos la plantilla del activo para pasarla al form
                    const instance = dataActivo.data.vehiculoInstancia || dataActivo.data.remolqueInstancia || dataActivo.data.maquinaInstancia;
                    if(instance?.plantilla) setPlantilla(instance.plantilla);

                    setInitialData(dataActivo.data);

                    // 2. Fetch de Matrices de Costo
                    const resMatrices = await fetch('/api/configuracion/matriz');
                    const dataMatrices = await resMatrices.json();
                    
                    if (Array.isArray(dataMatrices)) {
                        setMatricesRaw(dataMatrices); // <--- GUARDAMOS LA DATA CRUDA
                        
                        // Formateamos para el Select de Mantine (incluyendo el tip visual del costo)
                        const matricesList = dataMatrices.map(m => ({ 
                            value: String(m.id), 
                            label: `${m.nombre} (${m.tipoActivo || 'General'}) - $${m.totalCostoKm || 0}/km` 
                        }));
                        setMatrices(matricesList);
                    }

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
   
            {/* Renderizamos el formulario en modo EDICIÓN pasando initialData y la DATA CRUDA */}
            <ActivoForm 
                initialData={initialData}
                plantilla={plantilla} 
                matricesCostos={matrices} 
                matricesData={matricesRaw} // <--- ¡AQUÍ ESTÁ LA MAGIA QUE FALTABA!
                tipoActivo={initialData.tipoActivo}
                onCancel={() => router.back()}
            />
        </Paper>
    );
}