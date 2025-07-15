import { EntradaForm } from "../../componentes/EntradaForm";

export const metadata = {
  title: 'Registrar Nueva Entrada de Inventario',
  description: 'Formulario para registrar la recepción de consumibles en el almacén.',
};

export default function NuevaEntradaPage() {
  return <EntradaForm />;
}