// app/superuser/gestion/proveedores/page.js
import { Title, Box } from '@mantine/core';
import { ProveedoresTable } from '../componentes/ProveedoresTable';

export const metadata = {
  title: 'Proveedores',
  description: 'Lista y administra los proveedores de la empresa.',
};

export default function ProveedoresPage() {
  return (
    <Box>
      <Title order={2} mb="lg">Gestión de Proveedores</Title>
      <ProveedoresTable />
    </Box>
  );
}