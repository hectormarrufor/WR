'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Paper, Group, Alert, Loader, Title } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import AtributoConstructor from '../../components/AtributoConstructor';

export default function EditarGrupoPage() {
  const router = useRouter();
  const { id } = useParams(); // Obtenemos el ID de la URL

  const [grupo, setGrupo] = useState(null);
  const [gruposDisponibles, setGruposDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return; // Si no hay ID, no hacemos nada

    const fetchData = async () => {
      setLoading(true);
      try {
        // Cargar los datos del grupo específico que se está editando
        const grupoRes = await fetch(`/api/gestionMantenimiento/grupos/${id}`);
        if (!grupoRes.ok) throw new Error('No se encontró el grupo o hubo un error');
        const grupoData = await grupoRes.json();
        
        // Cargar la lista de todos los grupos para el selector de 'relación'
        const allGruposRes = await fetch('/api/gestionMantenimiento/grupos');
        const allGruposData = await allGruposRes.json();
        
        setGrupo(grupoData);
        setGruposDisponibles(Array.isArray(allGruposData) ? allGruposData.map(g => g.nombre) : []);
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // El payload ya no necesita normalizar el nombre, ya que se edita el existente
    const payload = { ...grupo };

    try {
      const response = await fetch(`/api/gestionMantenimiento/grupos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar los cambios');
      }
      alert('Grupo actualizado con éxito.');
      router.push('/superuser/flota/grupos');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader size="xl" style={{ display: 'block', margin: 'auto' }} />;
  if (error) return <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" mb="lg">{error}</Alert>;
  if (!grupo) return <p>Cargando datos del grupo...</p>; // Mensaje mientras el estado es null

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}> {/* Centrar el Paper */}
      <Paper p="xl" style={{ width: 'fit-content', minWidth: '500px', marginTop: '20px' }}>
        <form onSubmit={handleSaveChanges}>
          <Title order={1} style={{textAlign: 'center', marginBottom: '2rem'}}>Editando Plantilla de Grupo</Title>
          
          <AtributoConstructor 
              grupo={grupo}
              onUpdate={setGrupo}
              gruposDisponibles={gruposDisponibles}
          />

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => router.push('/superuser/flota/grupos')}>Cancelar</Button>
            <Button type="submit" loading={loading}>Guardar Cambios</Button>
          </Group>
        </form>
      </Paper>
    </div>
  );
}