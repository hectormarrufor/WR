import { Paper, Stack, SimpleGrid } from '@mantine/core';
import { SectionTitle } from './SectionTitle';

export function SectionBox({ section, title, children, cols = 1 }) {
  return (
    <Paper shadow="sm" radius="md" p="md" withBorder bg="gray.0">
      <SectionTitle section={section}>{title}</SectionTitle>

      <SimpleGrid cols={cols} spacing="xs" verticalSpacing="xs" mt="sm">
        {children}
      </SimpleGrid>
    </Paper>
  );
}
