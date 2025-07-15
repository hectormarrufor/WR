// app/superuser/inventario/consumibles/page.js
import { Title, Box } from '@mantine/core';
import { ConsumiblesTable } from '../componentes/ConsumiblesTable';

export const metadata = {
  title: 'Gestión de Consumibles',
  description: 'Lista y administra los consumibles en inventario.',
};

export default function ConsumiblesPage() {
  return (
    <Box>
      <Title order={2} mb="lg">Gestión de Consumibles</Title>
      <ConsumiblesTable />
    </Box>
  );
}