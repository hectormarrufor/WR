import { useState } from "react";
import { Button, Modal, MultiSelect, Group, Text } from "@mantine/core";

export default function ODTMultiSelect({ label, data, onChange }) {
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState([]);

  const handleSave = () => {
    onChange(selected); // actualiza el form con los seleccionados
    setOpened(false);
  };

  return (
    <>
      {/* Botón para abrir modal */}
      <Button onClick={() => setOpened(true)}>Añadir {label}</Button>

      {/* Modal con MultiSelect */}
      <Modal opened={opened} onClose={() => setOpened(false)} title={`Seleccionar ${label}`}>
        <MultiSelect
          data={data} // [{ value: '1', label: 'Empleado 1' }, ...]
          value={selected}
          onChange={setSelected}
          placeholder={`Selecciona ${label}`}
          searchable
          nothingFound="No se encontraron resultados"
        />

        <Group position="right" mt="md">
          <Button onClick={handleSave}>Guardar</Button>
        </Group>
      </Modal>

      {/* Lista de seleccionados visible en el form */}
      <Group mt="md" direction="column">
        {selected.map((item) => (
          <Text key={item}>• {data.find((d) => d.value === item)?.label}</Text>
        ))}
      </Group>
    </>
  );
}