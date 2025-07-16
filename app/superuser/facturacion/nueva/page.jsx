"use client"
import { Paper } from "@mantine/core";
import { FacturaForm } from "../componentes/FacturaForm";
import { useMediaQuery } from "@mantine/hooks";


export default function NuevaFacturaPage() {
    const isMobile = useMediaQuery(`(max-width: 48em`);
  
  return <Paper mx={isMobile ? 0 :50} my={isMobile? 40 : 70}>
    <FacturaForm />
  </Paper>;
}