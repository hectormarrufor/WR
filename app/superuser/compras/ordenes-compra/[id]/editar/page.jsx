'use client';
import React from 'react';
import { use } from "react";
import { OrdenCompraForm } from "../../../componentes/OrdenCompraForm";



export default function EditarOrdenCompraPage({ params }) {
  const { id } = use(params);
  return <OrdenCompraForm ordenCompraId={id} />;
}