// app/superuser/compras/facturas-proveedor/[id]/editar/page.js
import { Title, Box } from '@mantine/core';
import { FacturaProveedorForm } from '../../../componentes/FacturaProveedorForm';


export default function EditarFacturaProveedorPage({ params }) {
  return (
    <Box>
      <FacturaProveedorForm facturaId={params.id} />
    </Box>
  );
}