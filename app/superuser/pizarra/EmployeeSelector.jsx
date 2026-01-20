"use client";
import { useState, useMemo } from "react";
import {
  Button, Modal, SimpleGrid, Paper, Avatar, Text,
  Group, ActionIcon, Transition, Stack, Box, Badge, Card, TextInput
} from "@mantine/core";
import { IconCheck, IconPlus, IconSearch, IconX } from "@tabler/icons-react";

export default function EmployeeSelector({ label = "Empleado", data = [], onChange, value }) {
  const [opened, setOpened] = useState(false);
  const [search, setSearch] = useState("");

  // Filtrado en tiempo real
  const filteredData = useMemo(() => {
    return data.filter((item) =>
      item.nombre.toLowerCase().includes(search.toLowerCase()) || 
      item.apellido?.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const handleSelect = (id) => {
    const newValue = value === id ? null : id;
    onChange(newValue);
    setOpened(false); 
    setSearch(""); 
  };

  const selectedItem = data.find(d => d.id === value);

  return (
    <Box>
      <Group justify="space-between" mb="xs">
        <Text fw={500} size="sm">{label} <span style={{color: 'red'}}>*</span></Text>
        <Button 
          variant="light" 
          size="compact-xs" 
          leftSection={<IconPlus size={14} />} 
          onClick={() => setOpened(true)}
        >
          {value ? "Cambiar" : "Seleccionar"}
        </Button>
      </Group>

      {/* MODAL DE SELECCIÓN (Grid Visual) */}
      <Modal
        centered
        size="xl"
        opened={opened}
        onClose={() => setOpened(false)}
        title={`Seleccionar ${label}`}
        zIndex={2000} // Z-index alto para estar sobre otros modales
      >
        <TextInput
          placeholder="Buscar empleado..."
          mb="md"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          autoFocus
        />

        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
          {filteredData.map((item) => {
            const isSelected = value === item.id;
            // Unimos nombre y apellido para mostrar
            const fullName = `${item.nombre} ${item.apellido || ''}`;

            return (
              <Paper
                key={item.id}
                shadow={isSelected ? "xs" : "sm"}
                p="md"
                radius="md"
                withBorder
                onClick={() => handleSelect(item.id)}
                style={{
                  cursor: "pointer",
                  position: "relative",
                  backgroundColor: isSelected ? "var(--mantine-color-blue-0)" : undefined,
                  borderColor: isSelected ? "var(--mantine-color-blue-filled)" : undefined,
                  transition: "all 0.2s"
                }}
              >
                {isSelected && (
                  <ActionIcon color="blue" variant="filled" radius="xl" size="sm" style={{ position: "absolute", top: -8, right: -8, zIndex: 10 }}>
                    <IconCheck size={14} />
                  </ActionIcon>
                )}

                <Stack align="center" gap="xs">
                  <Avatar
                    size="lg"
                    src={item.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${item.imagen}` : null}
                    radius="xl"
                  />
                  <Box style={{ textAlign: 'center' }}>
                    <Text size="sm" fw={700} lineClamp={1}>{fullName}</Text>
                    <Text size="xs" c="dimmed">{item.cedula}</Text>
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>
      </Modal>

      {/* VISUALIZACIÓN DE LA SELECCIÓN EN EL FORMULARIO */}
      {selectedItem ? (
        <Card p="xs" radius="md" withBorder>
          <Group gap="sm" wrap="nowrap">
            <Avatar size="sm" src={selectedItem.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${selectedItem.imagen}` : null} radius="xl" />
            <Box style={{ flex: 1 }}>
                <Text size="sm" fw={700} lineClamp={1}>{selectedItem.nombre} {selectedItem.apellido}</Text>
            </Box>
            <ActionIcon variant="subtle" color="red" size="xs" onClick={() => onChange(null)}>
              <IconX size={14} />
            </ActionIcon>
          </Group>
        </Card>
      ) : (
        <Button variant="default" fullWidth onClick={() => setOpened(true)} style={{borderStyle: 'dashed'}}>
            Click para seleccionar empleado
        </Button>
      )}
    </Box>
  );
}