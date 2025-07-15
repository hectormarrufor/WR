// app/superuser/compras/facturas-proveedor/nueva/page.js
import { FacturaProveedorForm } from "../../componentes/FacturaProveedorForm";

export const metadata = {
  title: 'Registrar Nueva Factura de Proveedor',
  description: 'Formulario para registrar una nueva factura de proveedor.',
};

export default function NuevaFacturaProveedorPage() {
  return <FacturaProveedorForm />;
}