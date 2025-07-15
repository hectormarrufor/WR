import { ConsumibleUsadoForm } from "../../../../componentes/ConsumibleUsadoForm";


export const metadata = {
  title: 'Editar Uso de Consumible',
  description: 'Formulario para ver y editar campos auxiliares de un registro de uso de consumible existente.',
};

export default function EditarConsumibleUsadoPage({ params }) {
  const { id } = params;
  return <ConsumibleUsadoForm consumibleUsadoId={id} />;
}