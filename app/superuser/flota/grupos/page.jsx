'use client'
import { Button, Paper, Title } from '@mantine/core';
import Link from 'next/link';
import {SectionTitle} from '../../../components/SectionTitle';
import ListaGrupos from '../components/ListaGrupos'; // Crearemos este componente
import BackButton from '../../../components/BackButton';
import { useRouter } from 'next/navigation';

export default function GestionGruposPage() {
  const router = useRouter();
  return (
    <Paper p={30}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <BackButton onClick={() => router.push('/superuser/flota')}/>
        <Title order={3} >Gestión de Plantillas de Grupos</Title>
        <Button component={Link} href="/superuser/flota/grupos/crear">
          Crear Nuevo Grupo
        </Button>
      </div>
      <p style={{marginTop: '-1rem', marginBottom: '2rem', color: '#6c757d'}}>
        Los grupos son las plantillas base que definen las propiedades de un tipo de funcionalidad (ej. qué campos tiene un vehículo, un motor, etc.).
      </p>
      <ListaGrupos />
    </Paper>
  );
}