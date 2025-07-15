// components/facturacion/RenglonFacturaForm.jsx
'use client';

import React, { useEffect } from 'react';
import { TextInput, NumberInput, Group, ActionIcon, Select } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';

export function RenglonFacturaForm({ index, form, onRemove, renglon }) {
  // Cuando el renglón se inicializa o cambia, actualiza el subtotal
  useEffect(() => {
    const cantidad = parseFloat(form.values.renglones[index]?.cantidad || 0);
    const precioUnitario = parseFloat(form.values.renglones[index]?.precioUnitario || 0);
    const subtotal = (cantidad * precioUnitario).toFixed(2);
    if (form.values.renglones[index]?.subtotal !== subtotal) {
      form.setFieldValue(`renglones.${index}.subtotal`, subtotal);
    }
  }, [form.values.renglones[index]?.cantidad, form.values.renglones[index]?.precioUnitario]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Group key={index} align="flex-end" wrap="nowrap" mb="sm">
      <TextInput
        label="Descripción"
        placeholder="Descripción del renglón"
        style={{ flex: 3 }}
        {...form.getInputProps(`renglones.${index}.descripcion`)}
      />
      <NumberInput
        label="Cantidad"
        placeholder="0.00"
        precision={2}
        min={0}
        step={0.01}
        style={{ flex: 1 }}
        {...form.getInputProps(`renglones.${index}.cantidad`)}
      />
      <Select
        label="Unidad"
        placeholder="Unidad de medida"
        data={['Unidad', 'Servicio', 'Hora', 'Día', 'Litro', 'Kg']} // Puedes expandir estas unidades
        style={{ flex: 1 }}
        {...form.getInputProps(`renglones.${index}.unidadMedida`)}
      />
      <NumberInput
        label="Precio Unitario ($)"
        placeholder="0.00"
        precision={2}
        min={0}
        step={0.01}
        prefix="$"
        style={{ flex: 1.5 }}
        {...form.getInputProps(`renglones.${index}.precioUnitario`)}
      />
      <NumberInput
        label="Subtotal ($)"
        value={form.values.renglones[index]?.subtotal || '0.00'}
        readOnly
        style={{ flex: 1.5 }}
        prefix="$"
        // No tiene un getInputProps porque es solo de lectura
      />
      <ActionIcon
        variant="light"
        color="red"
        onClick={() => onRemove(index)}
        aria-label="Eliminar renglón"
        size="lg"
      >
        <IconTrash size={20} />
      </ActionIcon>
    </Group>
  );
}