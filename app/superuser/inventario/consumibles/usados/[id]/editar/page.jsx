'use client'
import { use, useEffect, useState } from "react";
import ConsumibleForm from "../../../ConsumibleForm";



export default function EditarConsumibleUsadoPage({ params }) {
  const { id } = use(params);
  const [initialData, setInitialData] = useState({});
  useEffect(() => {
    // Aquí podrías cargar datos iniciales si es necesario
    const fetchConsumibleUsado = async () => {
      try {
        const response = await fetch(`/api/inventario/consumibles/usados/${id}`);
        if (!response.ok) throw new Error('Error al cargar el consumible usado');
        const data = await response.json();
        setInitialData(data);
      } catch (error) {
        console.error(error);
      }
    };
    const data = fetchConsumibleUsado();
    setInitialData(data);
  }, [id]);
  return <ConsumibleForm initialValues={initialData} isEditing={true}/>;
}