import { useState } from "react";
import {
  Button,
  Modal,
  SimpleGrid,
  Paper,
  Avatar,
  Text,
  Group,
  ActionIcon,
  Transition,
  Stack,
  Title,
  Card,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

export default function ODTSelectableGrid({ label, data, onChange }) {
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState([]);

  const toggleSelection = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onChange(selected); // actualiza el form
    setOpened(false);
  };

  return (
    <>
      <Button onClick={() => setOpened(true)}>Añadir {label}</Button>

      <Modal
        centered
        h="85vh"
        size="xl"
        opened={opened}
        onClose={() => setOpened(false)}
        title={`Seleccionar ${label}`}
      >
        <SimpleGrid cols={3} spacing="md">
          {data.map((item) => {
            const isSelected = selected.includes(item.id);
            return (
              <Transition
                mounted={true}
                transition="scale-y"
                duration={200}
                timingFunction="ease"
                key={item.id}
              >
                {(styles) => (
                  <Paper
                    shadow={isSelected ? "xs" : "sm"}
                    padding="md"
                    radius="md"
                    withBorder
                    onClick={() => toggleSelection(item.id)}
                    style={{
                      ...styles,
                      cursor: "pointer",
                      position: "relative",
                      transform: isSelected ? "scale(0.97)" : "scale(1)",
                      borderColor: isSelected ? "green" : undefined,
                      transition: "transform 0.2s ease, border-color 0.2s ease",
                    }}
                  >
                    {isSelected && (
                      <ActionIcon
                        color="green"
                        variant="filled"
                        radius="xl"
                        size="sm"
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          zIndex: 10,
                        }}
                      >
                        <IconCheck size={16} />
                      </ActionIcon>
                    )}

                    <Stack align="center">
                      <Avatar
                        w={100}
                        h={100}
                        src={`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${item.imagen}?${Date.now()}`}
                        alt={item.nombre}
                        radius="xl"
                      />
                      <Title order={5} weight={500}>
                        {item.nombre}
                      </Title>
                      {item.extra && (
                        <Text size="sm" color="dimmed">
                          {item.extra}
                        </Text>
                      )}
                    </Stack>
                  </Paper>
                )}
              </Transition>
            );
          })}
        </SimpleGrid>

        <Group position="right" mt="md">
          <Button onClick={handleSave}>Guardar</Button>
        </Group>
      </Modal>

      {/* Lista de seleccionados visible en el formulario */}
      <SimpleGrid cols={2} spacing="sm" mt="md">
        {selected.map((id) => {
          const item = data.find((d) => d.id === id);
          return (
            <Card key={id} padding="sm" radius="md" withBorder>
              <Group>
                <Avatar
                  src={`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${item?.imagen}?${Date.now()}`}
                  alt={item?.nombre}
                  radius="xl"
                />
                <Text>{item?.nombre}</Text>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>
    </>
  );
}