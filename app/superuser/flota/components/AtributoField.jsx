import { TextInput, NumberInput, Select, Button, SegmentedControl, Box, Group, Text, Divider, Stack } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import AtributoConstructor from "./AtributoConstructor";

export default function AtributoField({
  index,
  attr,
  updateAttribute,
  removeAttribute,
  handleModeChange,
  tipoRelacion,
  availableRefs,
  pathPrefix,
  form,
  level,
}) {
  return (
    <Box p="md" mt="md" style={{ border: "1px solid #ddd", borderRadius: 8, backgroundColor: "#f9f9f9" }}>
      <Group justify="space-between" align="flex-start">
        <Stack w="100%">
          <Group grow>
            <TextInput
              label="Etiqueta"
              value={attr.label || ""}
              onChange={(e) => updateAttribute(index, { ...attr, label: e.currentTarget.value })}
            />
            <TextInput
              label="Clave"
              value={attr.key || ""}
              onChange={(e) => updateAttribute(index, { ...attr, key: e.currentTarget.value })}
            />
          </Group>

          <Group grow>
            <Select
              label="Tipo de dato"
              value={attr.dataType}
              onChange={(value) => updateAttribute(index, { ...attr, dataType: value })}
              data={["string", "number", "boolean", "object"]}
            />

            <Select
              label="Tipo de entrada"
              value={attr.inputType}
              onChange={(value) => updateAttribute(index, { ...attr, inputType: value })}
              data={["text", "select", "multiselect", "checkbox", "custom"]}
            />
          </Group>

          {(attr.inputType === "select" || attr.inputType === "multiselect") && (
            <TextInput
              label="Opciones (separadas por coma)"
              value={attr.selectOptions?.join(", ") || ""}
              onChange={(e) =>
                updateAttribute(index, {
                  ...attr,
                  selectOptions: e.currentTarget.value.split(",").map((o) => o.trim()),
                })
              }
            />
          )}

          <Group grow>
            <TextInput
              label="Valor por defecto"
              value={attr.defaultValue ?? ""}
              onChange={(e) => updateAttribute(index, { ...attr, defaultValue: e.currentTarget.value })}
            />
            <NumberInput
              label="Min"
              value={attr.min}
              onChange={(val) => updateAttribute(index, { ...attr, min: val })}
            />
            <NumberInput
              label="Max"
              value={attr.max}
              onChange={(val) => updateAttribute(index, { ...attr, max: val })}
            />
          </Group>

          {attr.dataType === "object" && (
            <>
              <Divider my="sm" label={`Subgrupo (${tipoRelacion})`} />
              <SegmentedControl
                fullWidth
                value={attr.mode || "none"}
                onChange={(v) => handleModeChange(index, v)}
                data={[
                  { label: `Seleccionar ${tipoRelacion}`, value: "select" },
                  { label: `Definir ${tipoRelacion}`, value: "define" },
                ]}
              />

              {attr.mode === "select" && (
                <Select
                  label={`Seleccionar ${tipoRelacion}`}
                  value={attr.refId}
                  data={availableRefs.map((r) => ({
                    value: r.id?.toString() ?? r._id ?? r.key,
                    label: r.nombre || r.label || r.key,
                  }))}
                  onChange={(v) => updateAttribute(index, { ...attr, refId: v })}
                />
              )}

              {attr.mode === "define" && (
                <Box mt="sm" pl="md" style={{ borderLeft: "3px solid #ccc" }}>
                  <TextInput
                    label={`Nombre del ${tipoRelacion}`}
                    value={attr.subGrupo?.nombre || ""}
                    onChange={(e) =>
                      updateAttribute(index, {
                        ...attr,
                        subGrupo: {
                          ...attr.subGrupo,
                          nombre: e.currentTarget.value,
                        },
                      })
                    }
                  />

                  <AtributoConstructor
                    form={form}
                    pathPrefix={`${pathPrefix}definicion.${index}.subGrupo.`}
                    tipoRelacion={tipoRelacion}
                    availableRefs={availableRefs}
                    level={level + 1}
                  />
                </Box>
              )}
            </>
          )}
        </Stack>

        <Button
          variant="light"
          color="red"
          onClick={() => removeAttribute(index)}
          mt="sm"
          size="xs"
          leftSection={<IconTrash size={16} />}
        >
          Quitar
        </Button>
      </Group>
    </Box>
  );
}
