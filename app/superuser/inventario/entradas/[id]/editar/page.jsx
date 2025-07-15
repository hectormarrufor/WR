import { EntradaForm } from "../../../componentes/EntradaForm";

export const metadata = {
  title: 'Editar Entrada de Inventario',
  description: 'Formulario para ver y editar campos auxiliares de una entrada de inventario existente.',
};

export default function EditarEntradaPage({ params }) {
  const { id } = params;
  return <EntradaForm entradaId={id} />;
}