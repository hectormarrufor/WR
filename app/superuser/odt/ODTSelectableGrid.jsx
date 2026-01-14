import { useState, useEffect } from "react";
import {
  Button, Modal, SimpleGrid, Paper, Avatar, Text,
  Group, ActionIcon, Transition, Stack, Title, Card, Badge, Box
} from "@mantine/core";
import { IconCheck, IconPlus } from "@tabler/icons-react";

export default function ODTSelectableGrid({ label, data = [], onChange, value = [] }) {
  const [opened, setOpened] = useState(false);
  // Sincronizamos el estado interno con el valor del formulario (útil para modo edición)
  const [selected, setSelected] = useState(value);

  // Actualizar el estado interno si el valor externo cambia (ej. al cargar datos de edición)
  useEffect(() => {
    setSelected(value);
  }, [value]);

  const toggleSelection = (id) => {
    setSelected((prev) => {
      const isSelected = prev.includes(id);
      const next = isSelected ? prev.filter((x) => x !== id) : [...prev, id];
      // Notificamos al formulario inmediatamente para mantener sincronía
      onChange(next);
      return next;
    });
  };

  const handleSave = () => {
    setOpened(false);
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
        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
          {data.map((item) => {
            const isSelected = selected.includes(item.id);
            
            // Lógica para extraer la placa o cargo del string nombre si viene en formato "Nombre (PLACA)"
            const tieneDetalle = item.nombre.includes("(") && item.nombre.includes(")");
            const nombrePrincipal = tieneDetalle ? item.nombre.split("(")[0].trim() : item.nombre;
            const detalleExtra = tieneDetalle ? item.nombre.match(/\(([^)]+)\)/)[1] : null;

            return (
              <Transition
                mounted={true}
                transition="fade"
                key={item.id}
              >
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
                        alt={item.nombre}
                        radius="md"
                      />
                      <Box style={{ textAlign: 'center' }}>
                        <Text size="sm" fw={700} lineClamp={1}>
                          {nombrePrincipal}
                        </Text>
                        
                        {/* Resaltado de Placa o Cargo */}
                        {detalleExtra ? (
                          <Badge variant="filled" color="dark" size="sm" mt={4}>
                            {detalleExtra}
                          </Badge>
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
          <Button onClick={handleSave}>Finalizar Selección</Button>
        </Group>
      </Modal>

      {/* Resumen visual en el formulario principal */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
        {selected.length === 0 ? (
          <Text size="xs" c="dimmed" fs="italic">No hay {label.toLowerCase()} seleccionados</Text>
        ) : (
          selected.map((id) => {
            const item = data.find((d) => d.id === id);
            if (!item) return null;
            return (
              <Card key={id} p="xs" radius="md" withBorder>
                <Group gap="sm" wrap="nowrap">
                  <Avatar
                    size="sm"
                    src={item.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${item.imagen}` : null}
                    radius="xl"
                  />
                  <Box style={{ flex: 1 }}>
                    <Text size="xs" fw={700} lineClamp={1}>{item.nombre}</Text>
                  </Box>
                  <ActionIcon 
                    variant="subtle" 
                    color="red" 
                    size="xs" 
                    onClick={() => toggleSelection(id)}
                  >
                    <IconCheck size={14} /> {/* Icono de check para desmarcar rápido */}
                  </ActionIcon>
                </Group>
              </Card>
            );
          })
        )}
      </SimpleGrid>
    </Box>
  );
}