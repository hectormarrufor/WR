'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Paper, Group, Alert } from '@mantine/core';
import AtributoConstructor from '../../components/AtributoConstructor';

export default function CrearGrupoPage() {
  const router = useRouter();

  const [grupo, setGrupo] = useState({
    nombre: '',
    es_autopropulsado: false,
    definicion_formulario: { atributos_especificos: [] },
    valores_predeterminados: {}
  });
  const [gruposDisponibles, setGruposDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExistingGrupos = async () => {
      const res = await fetch('/api/gestionMantenimiento/grupos');
      const data = await res.json();
      setGruposDisponibles(Array.isArray(data) ? data.map(g => g.nombre) : []);
    };
    fetchExistingGrupos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...grupo, nombre: grupo.nombre.toUpperCase().replace(/\s+/g, '_') };
    try {
        const res = await fetch('/api/gestionMantenimiento/grupos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Error al crear el grupo');
        alert('Grupo creado con éxito');
        router.push('/superuser/flota/grupos');
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <Paper p="xl">
      <form onSubmit={handleSubmit}>
        {error && <Alert color="red" title="Error" mb="lg">{error}</Alert>}
        
        <AtributoConstructor 
            value={grupo}
            onUpdate={setGrupo}
            gruposDisponibles={gruposDisponibles}
        />

        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" loading={loading}>Guardar Plantilla</Button>
        </Group>
      </form>
    </Paper>
  );
}