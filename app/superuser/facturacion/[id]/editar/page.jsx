import { FacturaForm } from "../../componentes/FacturaForm";

export const metadata = {
  title: 'Editar Factura',
  description: 'Formulario para editar los detalles de una factura existente.',
};

export default function EditarFacturaPage({ params }) {
  const { id } = params;
  return <FacturaForm facturaId={id} />;
}