import { SectionTitle } from '../../../components/SectionTitle';
import ActivosTable from '../components/ActivosTable';
import { Paper } from '@mantine/core';


export default function TodosActivosPage() {
  return (
    <Paper>
      <SectionTitle title="Gestión de Todos los Activos" />
      <p>
        Inventario completo de todos los activos registrados en el sistema, incluyendo componentes.
      </p>
      {/* Al no pasar la prop 'grupoFiltro', el componente 
        sabrá que debe solicitar todos los activos a la API.
      */}
      <ActivosTable />
    </Paper>
  );
}