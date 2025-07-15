// app/superuser/inventario/consumibles-usados/page.js
import { Title, Box } from '@mantine/core';
import { ConsumiblesUsadosTable } from '../../componentes/ConsumiblesUsadosTable';

export const metadata = {
  title: 'Consumibles Usados',
  description: 'Lista y administra los registros de uso de consumibles.',
};

export default function ConsumiblesUsadosPage() {
  return (
    <Box>
      <Title order={2} mb="lg">Consumibles Usados</Title>
      <ConsumiblesUsadosTable />
    </Box>
  );
}