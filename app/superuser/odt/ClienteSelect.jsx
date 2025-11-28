import { useState, useEffect } from "react";
import {
  Select,
  Button,
  Modal,
  TextInput,
  Textarea,
  Group,
} from "@mantine/core";
import { useForm } from "@mantine/form";

export default function ClienteSelect({ clientes, onClienteChange, onClienteCreate }) {
  const [opened, setOpened] = useState(false);

  // formulario para crear cliente
  const form = useForm({
    initialValues: {
      nombre: "",
      direccion: "",
      telefono: "",
      email: "",
    },
    validate: {
      nombre: (value) => (value.trim().length > 0 ? null : "Debe ingresar un nombre"),
    },
  });

  const handleCreate = async () => {
    // aquí puedes hacer fetch a tu API para crear cliente
    await onClienteCreate(form.values);
    setOpened(false);
    form.reset();
  };

  return (
    <>
      <Group>
        <Select
          label="Cliente"
          placeholder="Selecciona un cliente"
          data={clientes.map((c) => ({
            value: c.id,
            label: c.nombre,
          }))}
          onChange={onClienteChange}
          searchable
        />
        <Button onClick={() => setOpened(true)}>Añadir Cliente</Button>
      </Group>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Crear nuevo cliente"
        centered
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <TextInput label="Nombre" {...form.getInputProps("nombre")} />
          <TextInput label="Teléfono" {...form.getInputProps("telefono")} />
          <TextInput label="Email" {...form.getInputProps("email")} />
          <Textarea label="Dirección" {...form.getInputProps("direccion")} />

          <Group position="right" mt="md">
            <Button type="submit">Guardar</Button>
          </Group>
        </form>
      </Modal>
    </>
  );
}