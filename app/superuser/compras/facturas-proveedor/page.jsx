// app/superuser/compras/facturas-proveedor/page.js
import { Title, Box } from '@mantine/core';
import { FacturasProveedorTable } from '../componentes/FacturasProveedorTable';


export default function FacturasProveedorPage() {
  return (
    <Box>
      <Title order={2} mb="lg">Facturas de Proveedor</Title>
      <FacturasProveedorTable />
    </Box>
  );
}