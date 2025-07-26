'use client';
import { useParams } from 'next/navigation';
import ModeloActivoForm from '../../../components/ModeloActivoForm';

export default function EditarModeloPage() {
  const { id } = useParams();
  return <ModeloActivoForm modeloId={id} />;
}