import { FacturaForm } from "../componentes/FacturaForm";

export const metadata = {
  title: 'Crear Nueva Factura',
  description: 'Formulario para registrar una nueva factura en el sistema.',
};

export default function NuevaFacturaPage() {
  return <FacturaForm />;
}