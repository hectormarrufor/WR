"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Button, Modal, SimpleGrid, Paper, Avatar, Text,
  Group, ActionIcon, Transition, Stack, Box, Badge, Card
} from "@mantine/core";
import { IconCheck, IconPlus, IconSearch, IconX } from "@tabler/icons-react";
import { TextInput } from "@mantine/core";

export default function ODTSelectableGrid({ label, data = [], onChange, value }) {
  const [opened, setOpened] = useState(false);
  const [search, setSearch] = useState("");

  // Filtrado en tiempo real
  const filteredData = useMemo(() => {
    return data.filter((item) =>
      item.nombre.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const handleSelect = (id) => {
    // Si hace click en el que ya está seleccionado, lo deselecciona (null)
    // Si no, selecciona el nuevo ID y cierra el modal inmediatamente
    const newValue = value === id ? null : id;
    onChange(newValue);
    setOpened(false);
    setSearch(""); // Limpiar búsqueda para la próxima vez
  };

  const selectedItem = data.find(d => d.id === value);

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
          {value ? "Cambiar" : "Seleccionar"}
        </Button>
      </Group>

      <Modal
        centered
        size="xl"
        opened={opened}
        onClose={() => setOpened(false)}
        title={`Seleccionar ${label}`}
      >
        <TextInput
          placeholder={`Buscar ${label.toLowerCase()}...`}
          mb="md"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />

        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
          {filteredData.map((item) => {
            const isSelected = value === item.id;
            const tieneDetalle = item.nombre.includes("(") && item.nombre.includes(")");
            const nombrePrincipal = tieneDetalle ? item.nombre.split("(")[0].trim() : item.nombre;
            const detalleExtra = tieneDetalle ? item.nombre.match(/\(([^)]+)\)/)[1] : null;

            return (
              <Transition mounted={true} transition="fade" key={item.id}>
                {(transitionStyles) => (
                  <Paper
                    shadow={isSelected ? "xs" : "sm"}
                    p="md"
                    radius="md"
                    withBorder
                    onClick={() => handleSelect(item.id)}
                    // 1. Usamos props de Mantine para colores (Evita el error de consola)
                    bg={isSelected ? "blue.0" : undefined}
                    style={{
                      ...transitionStyles, // Solo estilos de la transición (opacity, transform)
                      cursor: "pointer",
                      position: "relative",
                      // 2. Controlamos el borde explícitamente si es necesario, o dejamos que withBorder maneje el default
                      borderColor: isSelected ? "var(--mantine-color-blue-filled)" : undefined,
                    }}
                  >
                    {isSelected && (
                      <ActionIcon
                        color="blue"
                        variant="filled"
                        radius="xl"
                        size="sm"
                        style={{ position: "absolute", top: -8, right: -8, zIndex: 10 }}
                      >
                        <IconCheck size={14} />
                      </ActionIcon>
                    )}

                    <Stack align="center" gap="xs">
                      <Avatar
                        size="xl"
                        src={item.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${item.imagen}` : null}
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
      </Modal>

      {/* Mostrar solo el seleccionado (Entero) */}
      {selectedItem ? (
        <Card p="xs" radius="md" withBorder>
          <Group gap="sm" wrap="nowrap">
            <Avatar size="sm" src={selectedItem.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${selectedItem.imagen}` : null} radius="xl" />
            <Box style={{ flex: 1 }}><Text size="xs" fw={700} lineClamp={1}>{selectedItem.nombre}</Text></Box>
            <ActionIcon variant="subtle" color="red" size="xs" onClick={() => onChange(null)}>
              <IconX size={14} />
            </ActionIcon>
          </Group>
        </Card>
      ) : (
        <Text size="xs" c="dimmed" fs="italic">No seleccionado</Text>
      )}
    </Box>
  );
}