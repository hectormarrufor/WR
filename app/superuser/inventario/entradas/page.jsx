// app/superuser/inventario/entradas/page.js
import { Title, Box } from '@mantine/core';
import { EntradasTable } from '../componentes/EntradasTable';

export const metadata = {
  title: 'Entradas de Inventario',
  description: 'Lista y administra las entradas de consumibles al almacén.',
};

export default function EntradasInventarioPage() {
  return (
    <Box>
      <Title order={2} mb="lg">Entradas de Inventario</Title>
      <EntradasTable />
    </Box>
  );
}