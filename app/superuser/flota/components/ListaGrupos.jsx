'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Loader, Alert } from '@mantine/core';
import styles from './ListaGrupos.module.css'; // Usaremos un CSS module para el estilo del cursor

export default function ListaGrupos() {
  const router = useRouter();
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGrupos = async () => {
      try {
        const res = await fetch('/api/gestionMantenimiento/grupos');
        if (!res.ok) throw new Error('No se pudieron cargar los grupos');
        const data = await res.json();
        setGrupos(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGrupos();
  }, []);

  if (loading) return <Loader />;
  if (error) return <Alert color="red" title="Error">{error}</Alert>;

  const rows = grupos.map((grupo) => (
    <Table.Tr 
      key={grupo.id} 
      className={styles.clickableRow} 
      onClick={() => router.push(`/superuser/flota/grupos/${grupo.id}`)}
    >
      <Table.Td>{grupo.nombre}</Table.Td>
      <Table.Td>
        {grupo.definicion_formulario?.atributos_especificos?.length || 0}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table striped highlightOnHover withTableBorder withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Nombre del Grupo</Table.Th>
          <Table.Th>Nº de Propiedades Definidas</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
}