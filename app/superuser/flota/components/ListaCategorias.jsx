'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Loader, Alert } from '@mantine/core';
import styles from './ListaGrupos.module.css'; // Reutilizamos el estilo de la tabla de grupos

export default function ListaCategorias() {
  const router = useRouter();
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const res = await fetch('/api/gestionMantenimiento/categorias');
        if (!res.ok) throw new Error('No se pudieron cargar las categorías');
        const data = await res.json();
        setCategorias(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCategorias();
  }, []);

  if (loading) return <Loader />;
  if (error) return <Alert color="red" title="Error">{error}</Alert>;

  const rows = categorias.map((cat) => (
    <Table.Tr 
      key={cat.id} 
      className={styles.clickableRow} 
      onClick={() => router.push(`/superuser/flota/categorias/${cat.id}/editar`)}
    >
      <Table.Td>{cat.nombre}</Table.Td>
      <Table.Td>{cat.descripcion || 'Sin descripción'}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Table striped highlightOnHover withTableBorder withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Nombre de la Categoría</Table.Th>
          <Table.Th>Descripción</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
}