// app/superuser/facturacion/page.js
import { Box, Title } from '@mantine/core';
import { FacturasTable } from './componentes/FacturasTable';

export const metadata = {
  title: 'Gestión de Facturas',
  description: 'Lista y administra todas las facturas del sistema.',
};

export default function FacturacionPage() {
  return (
    <Box>
      <Title order={2} mb="lg">Gestión de Facturas</Title>
      <FacturasTable />
    </Box>
  );
}