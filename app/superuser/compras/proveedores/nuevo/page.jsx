import { Paper } from "@mantine/core";
import { ProveedorForm } from "../../componentes/ProveedorForm";


export const metadata = {
    title: 'Registrar Nuevo Proveedor',
    description: 'Formulario para registrar un nuevo proveedor.',
};

export default function NuevoProveedorPage() {
    return (
        <Paper size='md' mx={200} mt={70}>
            <ProveedorForm />
        </Paper>
    );
}