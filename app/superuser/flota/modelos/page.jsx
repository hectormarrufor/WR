import Link from 'next/link';
import { Button, Paper } from '@mantine/core';
import {SectionTitle} from '../../../components/SectionTitle';
import ListaModelos from './components/ListaModelos';

export default function GestionModelosPage() {
  return (
    <Paper>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <SectionTitle title="Gestión de Modelos de Activos" />
        <Button component={Link} href="/superuser/flota/modelos/crear">
          Crear Nuevo Modelo
        </Button>
      </div>
      <p style={{marginTop: '-1rem', marginBottom: '2rem', color: '#000000ff'}}>
        Los modelos son las plantillas de fábrica de un activo, con sus especificaciones técnicas predefinidas.
      </p>
      <ListaModelos />
    </Paper>
  );
}