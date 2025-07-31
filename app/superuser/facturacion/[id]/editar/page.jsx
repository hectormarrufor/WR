'use client';
import React, { use } from 'react';
import { FacturaForm } from "../../componentes/FacturaForm";



export default function EditarFacturaPage({ params }) {
  const { id } = use(params);
  return <FacturaForm facturaId={id} />;
}