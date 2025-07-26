import Link from 'next/link';
import { Button } from '@mantine/core';
import {SectionTitle} from '../../../components/SectionTitle';
import ListaModelos from '../components/ListaModelos';

export default function GestionModelosPage() {
  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <SectionTitle title="Gestión de Modelos de Activos" />
        <Button component={Link} href="/superuser/flota/modelos/crear">
          Crear Nuevo Modelo
        </Button>
      </div>
      <p style={{marginTop: '-1rem', marginBottom: '2rem', color: '#6c757d'}}>
        Los modelos son las plantillas de fábrica de un activo, con sus especificaciones técnicas predefinidas.
      </p>
      <ListaModelos />
    </div>
  );
}