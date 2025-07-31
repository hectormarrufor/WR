'use client'
import { use } from "react";
import { ProveedorForm } from "../../../componentes/ProveedorForm";


export default function EditarProveedorPage({ params }) {
  const { id } = use(params);
  return <ProveedorForm proveedorId={id} />;
}