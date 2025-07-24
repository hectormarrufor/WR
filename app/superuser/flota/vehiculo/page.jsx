import ActivosTable from '../components/ActivosTable'; // Componente reutilizable
import {SectionTitle} from '../../../components/SectionTitle';
import { Paper } from '@mantine/core';

export default function VehiculosPage() {
  return (
    <Paper>
      <SectionTitle title="Gestión de Vehículos" />
      {/* Pasamos el grupo como prop para que la tabla sepa qué filtrar */}
      <ActivosTable grupoFiltro="VEHICULO" />
    </Paper>
  );
}