'use client';

import { NumberInput, Badge, Group, Stack, Text } from '@mantine/core';
import { useState } from 'react';



export default function TireDepthInput({ label, onChange }) {
  const [value, setValue] = useState<number | string>(0);

  const getColor = (val) => {
    if (val <= 2) return 'red';
    if (val <= 5) return 'yellow';
    return 'green';
  };

  const getStatus = (val) => {
    if (val <= 2) return 'REEMPLAZO INMEDIATO';
    if (val <= 5) return 'PRECAUCIÓN / ROTACIÓN';
    return 'ESTADO ÓPTIMO';
  };

  const numericValue = typeof value === 'number' ? value : 0;

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text size="sm" fw={500}>{label}</Text>
        <Badge color={getColor(numericValue)} variant="light">
          {getStatus(numericValue)}
        </Badge>
      </Group>
      
      <NumberInput
        placeholder="Ej: 8"
        suffix="/32nds"
        value={value}
        onChange={(val) => {
          setValue(val);
          onChange(val);
        }}
        min={0}
        max={32}
        clampBehavior="blur"
        styles={(theme) => ({
          input: {
            borderLeft: `4px solid ${
              numericValue <= 2 ? theme.colors.red[6] : 
              numericValue <= 5 ? theme.colors.yellow[5] : 
              theme.colors.green[6]
            }`,
          },
        })}
      />
    </Stack>
  );
}