import { OrdenCompraForm } from "../../../componentes/OrdenCompraForm";


export const metadata = {
  title: 'Editar Orden de Compra',
  description: 'Formulario para editar una orden de compra existente.',
};

export default function EditarOrdenCompraPage({ params }) {
  const { id } = params;
  return <OrdenCompraForm ordenCompraId={id} />;
}