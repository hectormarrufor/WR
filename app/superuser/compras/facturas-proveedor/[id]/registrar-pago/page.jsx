// app/superuser/compras/facturas-proveedor/[id]/registrar-pago/page.js
import { Title, Box } from '@mantine/core';
import { PagoProveedorForm } from '../../../componentes/PagoProveedorForm';



export default function RegistrarPagoProveedorPage({ params }) {
  return (
    <Box>
      <PagoProveedorForm facturaProveedorId={params.id} />
    </Box>
  );
}