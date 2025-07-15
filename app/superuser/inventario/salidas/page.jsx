// app/superuser/inventario/salidas/page.js
import { Title, Box } from '@mantine/core';
import { SalidasTable } from '../componentes/SalidasTable';

export const metadata = {
  title: 'Salidas de Inventario',
  description: 'Lista y administra las salidas de consumibles del almacén.',
};

export default function SalidasInventarioPage() {
  return (
    <Box>
      <Title order={2} mb="lg">Salidas de Inventario</Title>
      <SalidasTable />
    </Box>
  );
}