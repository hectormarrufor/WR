"use client";
import { useState, useMemo } from "react";
import {
  Button, Modal, SimpleGrid, Paper, Avatar, Text,
  Group, ActionIcon, Transition, Stack, Box, Badge, Card, Divider
} from "@mantine/core";
import { IconCheck, IconPlus, IconSearch, IconX, IconWeight, IconCoin, IconRoad } from "@tabler/icons-react";
import { TextInput } from "@mantine/core";

// Agregamos el prop "showMetrics" (por defecto false)
export default function ODTSelectableGrid({ label, data = [], onChange, value, showMetrics = false }) {
  console.log("Renderizando ODTSelectableGrid con data:", data);
  const [opened, setOpened] = useState(false);
  const [search, setSearch] = useState("");

  const filteredData = useMemo(() => {
    return data.filter((item) =>
      item.nombre.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const handleSelect = (id) => {
    const newValue = value === id ? null : id;
    onChange(newValue);
    setOpened(false);
    setSearch(""); 
  };

  const selectedItem = data.find(d => d.id === value);

  // Helpers de formateo seguros
  const formatMoney = (val) => (val != null && val !== '') ? `$${Number(val).toFixed(2)}` : 'N/D';
  const formatWeight = (val) => (val != null && val !== '') ? `${val}T` : 'N/D';

  // Helper para extraer métricas del item seleccionado para la vista compacta
  const extractMetrics = (item) => {
    if (!item) return {};
    const rawData = item.raw || item;
    const instancia = rawData.vehiculoInstancia || rawData.remolqueInstancia || rawData.maquinaInstancia || {};
    const plantilla = instancia.plantilla || {};

    return {
      tara: rawData.tara || plantilla.peso,
      capacidad: rawData.capacidad,
      costoHora: rawData.tarifaPorHora,
      costoKm: rawData.tarifaPorKm
    };
  };

  const selectedMetrics = extractMetrics(selectedItem);

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

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {filteredData.map((item) => {
            const isSelected = value === item.id;
            const tieneDetalle = item.nombre.includes("(") && item.nombre.includes(")");
            const nombrePrincipal = tieneDetalle ? item.nombre.split("(")[0].trim() : item.nombre;
            const detalleExtra = tieneDetalle ? item.nombre.match(/\(([^)]+)\)/)[1] : null;

            // Extraemos las métricas de forma profunda
            const metrics = extractMetrics(item);

            return (
              <Transition mounted={true} transition="fade" key={item.id}>
                {(transitionStyles) => (
                  <Paper
                    shadow={isSelected ? "xs" : "sm"}
                    p="md"
                    radius="md"
                    withBorder
                    onClick={() => handleSelect(item.id)}
                    bg={isSelected ? "blue.0" : undefined}
                    style={{
                      ...transitionStyles,
                      cursor: "pointer",
                      position: "relative",
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
                      <Box style={{ textAlign: 'center', width: '100%' }}>
                        <Text size="sm" fw={700} lineClamp={1}>{nombrePrincipal}</Text>
                        
                        {detalleExtra ? (
                          <Badge variant="filled" color="dark" size="xs" mt={4}>{detalleExtra}</Badge>
                        ) : (
                          item.puestos && (
                            <Text size="xs" c="dimmed" lineClamp={1} mt={4}>
                              {item.puestos.map(p => p.nombre).join(", ")}
                            </Text>
                          )
                        )}

                        {/* RENDERIZADO CONDICIONAL DE MÉTRICAS */}
                        {showMetrics && (
                          <>
                            <Divider my="xs" variant="dotted" />

                            <Group justify="center" gap="xs">
                              <Badge size="xs" variant="light" color="gray" leftSection={<IconWeight size={10}/>}>
                                Tara: {formatWeight(metrics.tara)}
                              </Badge>
                              <Badge size="xs" variant="light" color="blue">
                                Cap: {formatWeight(metrics.capacidad)}
                              </Badge>
                            </Group>

                            <Group justify="center" gap="xs" mt={6}>
                              <Badge size="xs" variant="dot" color="teal" leftSection={<IconCoin size={10}/>}>
                                {formatMoney(metrics.costoHora)}/hr
                              </Badge>
                              <Badge size="xs" variant="dot" color="orange" leftSection={<IconRoad size={10}/>}>
                                {formatMoney(metrics.costoKm)}/km
                              </Badge>
                            </Group>
                          </>
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

      {/* Vista Compacta (Cuando ya está seleccionado) */}
      {selectedItem ? (
        <Card p="xs" radius="md" withBorder>
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <Avatar size="md" src={selectedItem.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${selectedItem.imagen}` : null} radius="sm" />
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={700} lineClamp={1}>{selectedItem.nombre}</Text>
              
              {showMetrics && (
                <>
                  <Group gap="xs" mt={4}>
                    <Text size="xs" c="dimmed" fw={500}>
                      Cap: <Text span c="dark">{formatWeight(selectedMetrics.capacidad)}</Text>
                    </Text>
                    <Text size="xs" c="dimmed">|</Text>
                    <Text size="xs" c="dimmed" fw={500}>
                      Tara: <Text span c="dark">{formatWeight(selectedMetrics.tara)}</Text>
                    </Text>
                  </Group>

                  <Group gap="xs" mt={2}>
                    <Text size="xs" c="teal.7" fw={700}>
                      {formatMoney(selectedMetrics.costoHora)}/hr
                    </Text>
                    <Text size="xs" c="dimmed">|</Text>
                    <Text size="xs" c="orange.7" fw={700}>
                      {formatMoney(selectedMetrics.costoKm)}/km
                    </Text>
                  </Group>
                </>
              )}
            </Box>
            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onChange(null)}>
              <IconX size={16} />
            </ActionIcon>
          </Group>
        </Card>
      ) : (
        <Text size="xs" c="dimmed" fs="italic">No seleccionado</Text>
      )}
    </Box>
  );
}