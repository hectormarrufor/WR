// app/superuser/inventario/consumibles/ConsumibleForm.jsx
"use client";

import {
  Grid,
  NumberInput,
  TextInput,
  Select,
  Modal,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { AsyncComboBox } from "./AsyncComboBox";
import { updateSpec } from "./fieldConfig";
import { useEffect , useState} from "react";
import NewTipoConsumibleForm from "./NewTipoConsumibleForm";

export default function ConsumibleForm() {
  const [tipoConsumibles, setTipoConsumibles] = useState([]);
  const [newTipoModalOpen, setNewTipoModalOpen] = useState(false);
  const [pendingTipoNombre, setPendingTipoNombre] = useState("");

  const form = useForm({
    initialValues: {
      tipo: "",
      marca: "",
      stock: 0,
      stockMinimo: 0,
      especificaciones: [],
    },
  });

  useEffect(() => {
    fetch("/api/inventario/tipo")
      .then((res) => res.json())
      .then((data) => setTipoConsumibles(data.data || []))
      .catch(() => setTipoConsumibles([]));
  }, []);

  return (
    <>
      <Grid>
        {/* Tipo */}
        <Grid.Col span={6}>
          <AsyncComboBox
            label="Tipo de consumible"
            placeholder="Busca o crea un tipo"
            fieldKey="Tipo"
            form={form}
            tipoActual={form.values.tipo}
            onCreateNew={(val) => {
              setPendingTipoNombre(val);
              setNewTipoModalOpen(true);
            }}

          />
        </Grid.Col>

        {form.values.tipo && (
          <>
            {/* Marca */}
            <Grid.Col span={6}>
              <AsyncComboBox
                label="Marca"
                placeholder="Busca o crea una marca"
                fieldKey="Marca"
                form={form}
                tipoActual={form.values.tipo}
              />
            </Grid.Col>

            {/* Stock */}
            <Grid.Col span={6}>
              <NumberInput
                label={`Cantidad en stock (${tipoConsumibles.find(
                  (t) => t.nombre === form.values.tipo
                )?.unidadMedida || ""})`}
                {...form.getInputProps("stock")}
              />
            </Grid.Col>

            {/* Stock mínimo */}
            <Grid.Col span={6}>
              <NumberInput
                label={`Stock mínimo (${tipoConsumibles.find(
                  (t) => t.nombre === form.values.tipo
                )?.unidadMedida || ""})`}
                {...form.getInputProps("stockMinimo")}
              />
            </Grid.Col>
          </>
        )}

        {/* Especificaciones dinámicas */}
        {Array.isArray(form.values.especificaciones) &&
          form.values.especificaciones.map((spec, idx) => (
            <Grid.Col span={6} key={idx}>
              {spec.tipoEntrada === "number" ? (
                <NumberInput
                  label={spec.campo}
                  value={spec.value ?? ""}
                  onChange={(val) =>
                    updateSpec(form, spec.campo, { value: val })
                  }
                />
              ) : spec.tipoEntrada === "text" ? (
                <TextInput
                  label={spec.campo}
                  value={spec.value ?? ""}
                  onChange={(e) =>
                    updateSpec(form, spec.campo, {
                      value: e.currentTarget.value,
                    })
                  }
                />
              ) : spec.tipoEntrada === "select" &&
                spec.campo === "Medida" ? (
                <AsyncComboBox
                  label={spec.campo}
                  placeholder={`Selecciona ${spec.campo.toLowerCase()}`}
                  fieldKey="Medida"
                  form={form}
                  tipoActual={form.values.tipo}
                />
              ) : spec.tipoEntrada === "select" &&
                spec.campo === "Viscosidad" ? (
                <AsyncComboBox
                  label={spec.campo}
                  placeholder={`Selecciona ${spec.campo.toLowerCase()}`}
                  fieldKey="Viscosidad"
                  form={form}
                  tipoActual={form.values.tipo}
                />
              ) : spec.tipoEntrada === "select" &&
                spec.campo === "Codigo" ? (
                <AsyncComboBox
                  label={spec.campo}
                  placeholder={`Selecciona ${spec.campo.toLowerCase()}`}
                  fieldKey="Codigo"
                  form={form}
                  tipoActual={form.values.tipo}
                />
              ) : (
                <Select
                  label={spec.campo}
                  data={spec.opciones ?? []}
                  value={spec.value ?? ""}
                  onChange={(val) =>
                    updateSpec(form, spec.campo, { value: val })
                  }
                />
              )}
            </Grid.Col>
          ))}

      </Grid>
      <Modal
        opened={newTipoModalOpen}
        centered
        onClose={() => setNewTipoModalOpen(false)}
        title="Crear Nuevo Tipo de Consumible"
        size="lg"
      >
        <NewTipoConsumibleForm
          tipoNombre={pendingTipoNombre}
          setNewTipoModalOpen={setNewTipoModalOpen}
          form={form}
        />
      </Modal>
    </>

  );
}