'use client';

import { useParams } from 'next/navigation';
import CategoriaForm from '../../../components/CategoriaForm';

export default function EditarCategoriaPage() {
  const { id } = useParams();
  return <CategoriaForm categoriaId={id} />;
}