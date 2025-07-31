import SalidaForm from "../../SalidasForm";


export const metadata = {
  title: 'Editar Salida de Inventario',
  description: 'Formulario para ver y editar campos auxiliares de una salida de inventario existente.',
};

export default function EditarSalidaPage({ params }) {
  const { id } = params;
  return <SalidaForm salidaId={id} />;
}