// app/superuser/compras/ordenes-compra/page.js
import { Title, Box } from '@mantine/core';
import { OrdenesCompraTable } from '../componentes/OrdenesCompraTable';

export const metadata = {
  title: 'Órdenes de Compra',
  description: 'Lista y administra las órdenes de compra de la empresa.',
};

export default function OrdenesCompraPage() {
  return (
    <Box>
      <Title order={2} mb="lg">Órdenes de Compra</Title>
      <OrdenesCompraTable />
    </Box>
  );
}