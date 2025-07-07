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
import { httpGet, httpPost } from '../../../ApiFunctions/httpServices';
import { notifications } from '@mantine/notifications';

export function AceiteMotorSelect({ form }) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  // 1) Leer inicial desde form.values.motor.aceite.viscosidad
  const getInitial = () =>
    form.values.motor?.aceite?.viscosidad || '';
  const [search, setSearch] = useState(getInitial());

  // 2) Sincronizar si cambia externamente
  useEffect(() => {
    const external =
      form.values.motor?.aceite?.viscosidad || '';
    if (external !== search) {
      setSearch(external);
    }
  }, [form.values.motor?.aceite?.viscosidad]);

  // 3) Carga de opciones
  const [data, setData] = useState([]);
  useEffect(() => {
    (async () => {
      const tipos = await httpGet('/api/vehiculos/aceiteMotor');
      setData(tipos.map((t) => t.tipo));
    })();
  }, []);

  // 4) Filtrar
  const norm = search.toUpperCase().trim();
  const exactMatch = data.includes(norm);
  const filtered = exactMatch
    ? data
    : data.filter((item) =>
        item.toLowerCase().includes(search.toLowerCase())
      );

  // 5) Crear nuevo tipo
  const handleCreate = async () => {
    const normalized = norm.replace(/\s+/g, '');
    await httpPost('/api/vehiculos/aceiteMotor', { tipo: normalized });
    notifications.show({
      title: `Aceite creado: ${normalized}`,
    });
    setData((cur) => [...cur, normalized]);

    // actualizar form en motor.aceite.viscosidad
    form.setFieldValue(
      'motor.aceite.viscosidad',
      normalized
    );
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
          ¿Crear el tipo de aceite “{search}”?
        </Title>
        <Button fullWidth onClick={handleCreate}>
          Confirmar
        </Button>
      </Modal>

      <Combobox
        store={combobox}
        label="Viscosidad de aceite"
        required
        size="xs"
        withinPortal={false}
        onOptionSubmit={(val) => {
          combobox.closeDropdown();
          if (val === '$create') {
            setCreateModal(true);
          } else {
            setSearch(val);
            form.setFieldValue(
              'motor.aceite.viscosidad',
              val
            );
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
            placeholder="Elige o crea tipo de aceite"
            rightSection={<Combobox.Chevron />}
            rightSectionPointerEvents="none"
            size="xs"
          />
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options>
            {filtered.map((item) => (
              <Combobox.Option key={item} value={item}>
                {item}
              </Combobox.Option>
            ))}
            {!exactMatch && norm.length > 0 && (
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