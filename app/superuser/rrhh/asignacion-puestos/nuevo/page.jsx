// app/superuser/rrhh/asignacion-puestos/nuevo/page.js
'use client';

import { Paper } from '@mantine/core';
import { AsignacionPuestoForm } from '../AsignacionPuestoForm';


export default function NuevaAsignacionPuestoPage() {
  return (
    <Paper size="xl" py="xl">
      <AsignacionPuestoForm />
    </Paper>
  );
}