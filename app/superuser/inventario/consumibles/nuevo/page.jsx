import { ConsumibleForm } from "../../componentes/ConsumibleForm";


export const metadata = {
  title: 'Nuevo Consumible',
  description: 'Formulario para registrar un nuevo consumible en inventario.',
};

export default function NuevoConsumiblePage() {
  return <ConsumibleForm />;
}