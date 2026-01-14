import { useState, useEffect, useMemo } from "react";
import {
  Button, Modal, SimpleGrid, Paper, Avatar, Text,
  Group, ActionIcon, Transition, Stack, Title, Card, Badge, Box, TextInput
} from "@mantine/core";
import { IconCheck, IconPlus, IconSearch, IconX } from "@tabler/icons-react";

export default function ODTSelectableGrid({ label, data = [], onChange, value = [] }) {
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState(value);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSelected(value);
  }, [value]);

  // Filtrado en tiempo real dentro del modal
  const filteredData = useMemo(() => {
    return data.filter((item) =>
      item.nombre.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const toggleSelection = (id) => {
    setSelected((prev) => {
      const isSelected = prev.includes(id);
      const next = isSelected ? prev.filter((x) => x !== id) : [...prev, id];
      onChange(next);
      return next;
    });
  };

  return (
    <Box>
      <Group justify="space-between" mb="xs">
        <Text fw={600} size="sm">{label}</Text>
        <Button 
          variant="light" 
          size="compact-xs" 
          leftSection={<IconPlus size={14} />} 
          onClick={() => setOpened(true)}
        >
          Gestionar
        </Button>
      </Group>

      <Modal
        centered
        size="xl"
        opened={opened}
        onClose={() => setOpened(false)}
        title={`Seleccionar ${label}`}
        scrollAreaComponent={Modal.NativeScrollArea}
      >
        {/* BUSCADOR INTERNO */}
        <TextInput
          placeholder={`Buscar ${label.toLowerCase()}...`}
          mb="md"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          rightSection={
            search && (
              <ActionIcon variant="subtle" onClick={() => setSearch("")}>
                <IconX size={14} />
              </ActionIcon>
            )
          }
        />

        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
          {filteredData.map((item) => {
            const isSelected = selected.includes(item.id);
            const tieneDetalle = item.nombre.includes("(") && item.nombre.includes(")");
            const nombrePrincipal = tieneDetalle ? item.nombre.split("(")[0].trim() : item.nombre;
            const detalleExtra = tieneDetalle ? item.nombre.match(/\(([^)]+)\)/)[1] : null;

            return (
              <Transition mounted={true} transition="fade" key={item.id}>
                {(styles) => (
                  <Paper
                    shadow={isSelected ? "xs" : "sm"}
                    p="md"
                    radius="md"
                    withBorder
                    onClick={() => toggleSelection(item.id)}
                    style={{
                      ...styles,
                      cursor: "pointer",
                      position: "relative",
                      backgroundColor: isSelected ? "var(--mantine-color-blue-0)" : undefined,
                      borderColor: isSelected ? "var(--mantine-color-blue-filled)" : undefined,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {isSelected && (
                      <ActionIcon color="blue" variant="filled" radius="xl" size="sm" style={{ position: "absolute", top: -8, right: -8, zIndex: 10 }}>
                        <IconCheck size={14} />
                      </ActionIcon>
                    )}

                    <Stack align="center" gap="xs">
                      <Avatar
                        size="xl"
                        src={item.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${item.imagen}` : null}
                        alt={item.nombre}
                        radius="md"
                      />
                      <Box style={{ textAlign: 'center' }}>
                        <Text size="sm" fw={700} lineClamp={1}>{nombrePrincipal}</Text>
                        {detalleExtra ? (
                          <Badge variant="filled" color="dark" size="sm" mt={4}>{detalleExtra}</Badge>
                        ) : (
                           item.puestos && (
                            <Text size="xs" c="dimmed" lineClamp={1}>
                                {item.puestos.map(p => p.nombre).join(", ")}
                            </Text>
                           )
                        )}
                      </Box>
                    </Stack>
                  </Paper>
                )}
              </Transition>
            );
          })}
        </SimpleGrid>
        <Group justify="right" mt="xl">
          <Button onClick={() => setOpened(false)}>Finalizar</Button>
        </Group>
      </Modal>

      {/* Lista de seleccionados resumida */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
        {selected.length > 0 ? selected.map((id) => {
          const item = data.find((d) => d.id === id);
          if (!item) return null;
          return (
            <Card key={id} p="xs" radius="md" withBorder>
              <Group gap="sm" wrap="nowrap">
                <Avatar size="sm" src={item.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${item.imagen}` : null} radius="xl" />
                <Box style={{ flex: 1 }}><Text size="xs" fw={700} lineClamp={1}>{item.nombre}</Text></Box>
                <ActionIcon variant="subtle" color="red" size="xs" onClick={() => toggleSelection(id)}>
                  <IconX size={14} />
                </ActionIcon>
              </Group>
            </Card>
          );
        }) : (
          <Text size="xs" c="dimmed" fs="italic">Ninguno seleccionado</Text>
        )}
      </SimpleGrid>
    </Box>
  );
}