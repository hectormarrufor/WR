// app/superuser/rrhh/asignacion-puestos/nuevo/page.js
'use client';

import { Container } from '@mantine/core';
import { AsignacionPuestoForm } from '../AsignacionPuestoForm';


export default function NuevaAsignacionPuestoPage() {
  return (
    <Container size="xl" py="xl">
      <AsignacionPuestoForm />
    </Container>
  );
}