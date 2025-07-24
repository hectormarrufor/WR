import ActivosTable from '../components/ActivosTable';
import {SectionTitle} from '../../../components/SectionTitle';
import { Paper } from '@mantine/core';

export default function GabarrasPage() {
  return (
    <Paper>
      <SectionTitle title="Gestión de Gabarras" />
      <p>
        Listado de todas las unidades y equipos offshore.
      </p>
      <ActivosTable grupoFiltro="GABARRA" />
    </Paper>
  );
}