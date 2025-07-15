import { ConsumibleForm } from "../../../componentes/ConsumibleForm";

export const metadata = {
  title: 'Editar Consumible',
  description: 'Formulario para editar los detalles de un consumible existente.',
};

export default function EditarConsumiblePage({ params }) {
  const { id } = params;
  return <ConsumibleForm consumibleId={id} />;
}