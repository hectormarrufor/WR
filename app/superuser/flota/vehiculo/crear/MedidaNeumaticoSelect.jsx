'use client';
import { useEffect, useState } from 'react';
import {
  Combobox,
  useCombobox,
  InputBase,
  Modal,
  Title,
  Button,
} from '@mantine/core';
import { httpGet, httpPost } from '../../../../ApiFunctions/httpServices';
import { notifications } from '@mantine/notifications';
import { normalizarMedida } from '../../../../handlers/normalizarMedida';

export function MedidaNeumaticoSelect({ form }) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  // 1) Inicializa y sincroniza con form.values.neumatico
  const getInitial = () => form.values.neumatico || '';
  const [search, setSearch] = useState(getInitial());
  useEffect(() => {
    const external = form.values.neumatico || '';
    if (external !== search) {
      setSearch(external);
    }
  }, [form.values.neumatico]);

  // 2) Carga opciones según tipoPeso
  const [data, setData] = useState([]);
  useEffect(() => {
    (async () => {
      const medidas = await httpGet('/api/vehiculos/medidaNeumatico');
      const filtered = medidas
        .filter((m) => m.peso === form.values.tipoPeso)
        .map((m) => m.medida);
      setData(filtered);
    })();
  }, [form.values.tipoPeso]);

  // 3) Filtrado y match exacto (case-insensitive)
  const normSearch = search.trim().toLowerCase();
  const exactMatch = data.some((item) => item.toLowerCase() === normSearch);
  const filteredOptions = exactMatch
    ? data
    : data.filter((item) => item.toLowerCase().includes(normSearch));

  // 4) Crear nueva medida
  const handleCreate = async () => {
    const normalized = normalizarMedida(search);
    await httpPost('/api/vehiculos/medidaNeumatico', {
      medida: normalized,
      peso: form.values.tipoPeso,
    });
    notifications.show({ title: `Medida creada: ${normalized}` });
    setData((cur) => [...cur, normalized]);
    form.setFieldValue('medida', normalized);
    setSearch(normalized);
    setCreateModal(false);
  };

  const [createModal, setCreateModal] = useState(false);

  return (
    <>
      <Modal
        opened={createModal}
        onClose={() => setCreateModal(false)}
        centered
      >
        <Title order={4} mb="md">
          ¿Crear la medida de neumático “{search}”?
        </Title>
        <Button fullWidth onClick={handleCreate}>
          Confirmar
        </Button>
      </Modal>

      <Combobox
        store={combobox}
        label="Medida"
        required
        size="xs"
        withinPortal={false}
        onOptionSubmit={(val) => {
          combobox.closeDropdown();
          if (val === '$create') {
            setCreateModal(true);
          } else {
            setSearch(val);
            form.setFieldValue('medida', val);
          }
        }}
      >
        <Combobox.Target>
          <InputBase
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              combobox.openDropdown();
            }}
            onFocus={() => combobox.openDropdown()}
            onBlur={() => combobox.closeDropdown()}
            placeholder="Elige o crea medida de neumático"
            rightSection={<Combobox.Chevron />}
            rightSectionPointerEvents="none"
            size="xs"
          />
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options>
            {filteredOptions.map((item) => (
              <Combobox.Option key={item} value={item}>
                {item}
              </Combobox.Option>
            ))}
            {!exactMatch && search.trim().length > 0 && (
              <Combobox.Option value="$create">
                + Crear “{search}”
              </Combobox.Option>
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </>
  );
}