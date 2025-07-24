import ActivosTable from '../components/ActivosTable';
import {SectionTitle} from '../../../components/SectionTitle';
import { Paper } from '@mantine/core';

export default function UnidadesOperativasPage() {
  return (
    <Paper>
      <SectionTitle title="Gestión de Unidades Operativas" />
      <p>
        Listado de equipos de operaciones especiales (Coiled Tubing, Wireline, Taladros, etc.).
      </p>
      <ActivosTable grupoFiltro="UNIDAD_OPERATIVA" />
    </Paper>
  );
}