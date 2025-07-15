// app/superuser/compras/recepciones-compra/page.js
import { Title, Box } from '@mantine/core';
import { RecepcionesCompraTable } from '../componentes/RecepcionesCompraTable';

export const metadata = {
  title: 'Recepciones de Compra',
  description: 'Lista y administra las recepciones de mercancía de las órdenes de compra.',
};

export default function RecepcionesCompraPage() {
  return (
    <Box>
      <Title order={2} mb="lg">Recepciones de Compra</Title>
      <RecepcionesCompraTable />
    </Box>
  );
}