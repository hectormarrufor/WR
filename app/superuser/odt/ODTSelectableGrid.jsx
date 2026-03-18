"use client";
import { useState, useMemo } from "react";
import {
  Button, Modal, SimpleGrid, Paper, Avatar, Text,
  Group, ActionIcon, Transition, Stack, Box, Badge, Card, Divider, Tooltip
} from "@mantine/core";
import { IconCheck, IconPlus, IconSearch, IconX, IconWeight, IconCoin, IconRoad, IconAlertCircle } from "@tabler/icons-react";
import { TextInput } from "@mantine/core";

export default function ODTSelectableGrid({ label, data = [], onChange, value, showMetrics = false }) {
  const [opened, setOpened] = useState(false);
  const [search, setSearch] = useState("");

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Filtro del buscador de texto
      const coincideTexto = item.nombre.toLowerCase().includes(search.toLowerCase());
      if (!coincideTexto) return false;

      const rawData = item.raw || item;
      const esActivoFisico = rawData.hasOwnProperty('tipoActivo') || rawData.hasOwnProperty('horasAnuales');

      // 2. CANDADO EMPLEADOS: Los RRHH inactivos SÍ desaparecen de la lista por completo
      if (!esActivoFisico && rawData.estado && String(rawData.estado).toLowerCase() !== "activo") {
        return false;
      }

      // 3. ACTIVOS FÍSICOS: Pasan todos. El bloqueo será visual en el renderizado.
      return true;
    });
  }, [data, search]);

  const handleSelect = (id, isDisabled) => {
    if (isDisabled) return; // Bloqueo anti-clicks piratas
    const newValue = value === id ? null : id;
    onChange(newValue);
    setOpened(false);
    setSearch(""); 
  };

  const selectedItem = data.find(d => d.id === value);

  // Helpers de formateo seguros
  const formatMoney = (val) => (val != null && val !== '') ? `$${Number(val).toFixed(2)}` : 'N/D';
  const formatWeight = (val) => (val != null && val !== '') ? `${val}T` : 'N/D';

  const extractMetrics = (item) => {
    if (!item) return {};
    const rawData = item.raw || item;
    const instancia = rawData.vehiculoInstancia || rawData.remolqueInstancia || rawData.maquinaInstancia || {};
    const plantilla = instancia.plantilla || {};

    return {
      tara: rawData.tara || plantilla.pesoVacioKg || plantilla.peso,
      capacidad: rawData.capacidadTonelajeMax || rawData.capacidadCarga || plantilla.capacidadCargaTons || plantilla.capacidadCarga,
      costoHora: rawData.costoPosesionHora,
      costoKm: rawData.costoMantenimientoTeorico
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

      <Modal centered size="xl" opened={opened} onClose={() => setOpened(false)} title={<Text fw={900} size="lg">Seleccionar {label}</Text>}>
        <TextInput
          placeholder={`Buscar ${label.toLowerCase()}...`}
          mb="xl"
          size="md"
          leftSection={<IconSearch size={18} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {filteredData.map((item) => {
            const isSelected = value === item.id;
            const tieneDetalle = item.nombre.includes("(") && item.nombre.includes(")");
            const nombrePrincipal = tieneDetalle ? item.nombre.split("(")[0].trim() : item.nombre;
            const detalleExtra = tieneDetalle ? item.nombre.match(/\(([^)]+)\)/)[1] : null;

            const metrics = extractMetrics(item);
            const rawData = item.raw || item;
            const esActivoFisico = rawData.hasOwnProperty('tipoActivo') || rawData.hasOwnProperty('horasAnuales');

            // 🔥 LÓGICA DE BLOQUEO VISUAL 🔥
            let isDisabled = false;
            let disabledReason = null;

            if (esActivoFisico) {
              if (rawData.estado !== 'Operativo') {
                isDisabled = true;
                disabledReason = `Status: ${rawData.estado}`; // Ej: "Status: En Mantenimiento"
              } else if (!rawData.horasAnuales || Number(rawData.horasAnuales) <= 0) {
                isDisabled = true;
                disabledReason = "Faltan Horas Anuales (Configuración)";
              }
            }

            return (
              <Transition mounted={true} transition="fade" key={item.id}>
                {(transitionStyles) => (
                  <Paper
                    shadow={isSelected ? "xs" : "sm"}
                    p="md"
                    radius="md"
                    withBorder
                    onClick={() => handleSelect(item.id, isDisabled)}
                    bg={isDisabled ? "gray.1" : (isSelected ? "blue.0" : undefined)}
                    style={{
                      ...transitionStyles,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      position: "relative",
                      borderColor: isSelected ? "var(--mantine-color-blue-filled)" : undefined,
                      opacity: isDisabled ? 0.7 : 1, // Lo hace ver semi-transparente
                      filter: isDisabled ? "grayscale(100%)" : "none" // Lo pone en blanco y negro
                    }}
                  >
                    {isSelected && (
                      <ActionIcon color="blue" variant="filled" radius="xl" size="sm" style={{ position: "absolute", top: -8, right: -8, zIndex: 10 }}>
                        <IconCheck size={14} />
                      </ActionIcon>
                    )}

                    <Stack align="center" gap="xs">
                      <Avatar size="xl" src={item.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${item.imagen}` : null} radius="md" />
                      
                      <Box style={{ textAlign: 'center', width: '100%' }}>
                        <Text size="sm" fw={700} lineClamp={1} c={isDisabled ? "gray.6" : "dark"}>{nombrePrincipal}</Text>
                        
                        {/* 🔥 ETIQUETA DE BLOQUEO O DETALLE NORMAL 🔥 */}
                        {isDisabled ? (
                          <Tooltip label="Vaya al módulo de Gestión de Activos para resolver esto" withArrow>
                            <Badge variant="light" color="red" size="xs" mt={4} style={{ whiteSpace: 'normal', height: 'auto', padding: '4px' }} leftSection={<IconAlertCircle size={10} />}>
                              {disabledReason}
                            </Badge>
                          </Tooltip>
                        ) : (
                          detalleExtra ? (
                            <Badge variant="filled" color="dark" size="xs" mt={4}>{detalleExtra}</Badge>
                          ) : (
                            item.puestos && (
                              <Text size="xs" c="dimmed" lineClamp={1} mt={4}>
                                {item.puestos.map(p => p.nombre).join(", ")}
                              </Text>
                            )
                          )
                        )}

                        {/* LAS MÉTRICAS SIGUEN APARECIENDO PERO OPACAS */}
                        {showMetrics && (
                          <>
                            <Divider my="xs" variant="dotted" />
                            <Group justify="center" gap="xs">
                              <Badge size="xs" variant="light" color={isDisabled ? "gray" : "gray"} leftSection={<IconWeight size={10}/>}>Tara: {formatWeight(metrics.tara)}</Badge>
                              <Badge size="xs" variant="light" color={isDisabled ? "gray" : "blue"}>Cap: {formatWeight(metrics.capacidad)}</Badge>
                            </Group>
                            <Group justify="center" gap="xs" mt={6}>
                              <Badge size="xs" variant="dot" color={isDisabled ? "gray" : "teal"} leftSection={<IconCoin size={10}/>}>{formatMoney(metrics.costoHora)}/hr</Badge>
                              <Badge size="xs" variant="dot" color={isDisabled ? "gray" : "orange"} leftSection={<IconRoad size={10}/>}>{formatMoney(metrics.costoKm)}/km</Badge>
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

      {/* VISTA DEL ITEM SELECCIONADO EN EL FORMULARIO (Sin cambios) */}
      {selectedItem ? (
        <Card p="xs" radius="md" withBorder>
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <Avatar size="md" src={selectedItem.imagen ? `${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${selectedItem.imagen}` : null} radius="sm" />
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={700} lineClamp={1}>{selectedItem.nombre}</Text>
              {showMetrics && (
                <>
                  <Group gap="xs" mt={4}>
                    <Text size="xs" c="dimmed" fw={500}>Cap: <Text span c="dark">{formatWeight(selectedMetrics.capacidad)}</Text></Text>
                    <Text size="xs" c="dimmed">|</Text>
                    <Text size="xs" c="dimmed" fw={500}>Tara: <Text span c="dark">{formatWeight(selectedMetrics.tara)}</Text></Text>
                  </Group>
                  <Group gap="xs" mt={2}>
                    <Text size="xs" c="teal.7" fw={700}>{formatMoney(selectedMetrics.costoHora)}/hr</Text>
                    <Text size="xs" c="dimmed">|</Text>
                    <Text size="xs" c="orange.7" fw={700}>{formatMoney(selectedMetrics.costoKm)}/km</Text>
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