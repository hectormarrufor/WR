import { RecepcionCompraForm } from "../../componentes/RecepcionCompraForm";


export const metadata = {
  title: 'Registrar Nueva Recepción de Compra',
  description: 'Formulario para registrar la recepción de mercancía de una orden de compra.',
};

export default function NuevaRecepcionCompraPage() {
  return <RecepcionCompraForm />;
}