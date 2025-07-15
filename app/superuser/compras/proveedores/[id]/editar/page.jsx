import { ProveedorForm } from "../../../componentes/ProveedorForm";


export const metadata = {
  title: 'Editar Proveedor',
  description: 'Formulario para editar la información de un proveedor existente.',
};

export default function EditarProveedorPage({ params }) {
  const { id } = params;
  return <ProveedorForm proveedorId={id} />;
}