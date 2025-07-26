import Link from 'next/link';
import { Button, Paper } from '@mantine/core';
import {SectionTitle} from '../../../components/SectionTitle';
import ListaCategorias from '../components/ListaCategorias';

export default function GestionCategoriasPage() {
  return (
    <Paper p={30}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <SectionTitle title="Gestión de Categorías de Activos" />
        <Button component={Link} href="/superuser/flota/categorias/crear">
          Crear Nueva Categoría
        </Button>
      </div>
      <p style={{marginTop: '-1rem', marginBottom: '2rem', color: '#6c757d'}}>
        Las categorías agrupan plantillas (Grupos) para definir un tipo específico de activo.
      </p>
      <ListaCategorias />
    </Paper>
  );
}