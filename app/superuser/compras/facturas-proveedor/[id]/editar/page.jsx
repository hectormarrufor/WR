// app/superuser/compras/facturas-proveedor/[id]/editar/page.js
import { Title, Box } from '@mantine/core';
import { FacturaProveedorForm } from '../../../componentes/FacturaProveedorForm';
import { use } from 'react';


export default function EditarFacturaProveedorPage({ params }) {
  const {id} = use(params)
  return (
    <Box>
      <FacturaProveedorForm facturaId={id} />
    </Box>
  );
}