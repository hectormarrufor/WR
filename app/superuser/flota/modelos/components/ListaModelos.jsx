'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Loader, Alert, Badge } from '@mantine/core';
import styles from '../../components/ListaGrupos.module.css';

export default function ListaModelos() {
  const router = useRouter();
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('/api/gestionMantenimiento/modelos-activos');
      const data = await res.json();
      setModelos(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <Loader />;

  const rows = modelos.map((modelo) => (
    <Table.Tr 
      key={modelo.id} 
      className={styles.clickableRow} 
      onClick={() => router.push(`/superuser/flota/modelos/${modelo.id}/editar`)}
    >
      <Table.Td>{modelo.nombre}</Table.Td>
      <Table.Td>
        <Badge color="blue">{modelo.CategoriaActivo?.nombre || 'N/A'}</Badge>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table striped highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Nombre del Modelo</Table.Th>
          <Table.Th>Categoría</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
}