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

export function AceiteCajaSelect({ form }) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  // 1) Inicializar `search` desde form.values.transmision.tipoAceite
  const getInitial = () => form.values.transmision?.tipoAceite || '';
  const [search, setSearch] = useState(getInitial());

  // 2) Sincronizar si cambia externamente
  useEffect(() => {
    const external = form.values.transmision?.tipoAceite || '';
    if (external !== search) {
      setSearch(external);
    }
  }, [form.values.transmision?.tipoAceite]);

  // 3) Cargar opciones de API
  const [data, setData] = useState([]);
  useEffect(() => {
    (async () => {
      const tipos = await httpGet('/api/vehiculos/aceiteCaja');
      setData(tipos.map((t) => t.tipo));
    })();
  }, []);

  // 4) Filtrar en base a search
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
    await httpPost('/api/vehiculos/aceiteCaja', { tipo: normalized });
    notifications.show({ title: `Aceite de caja creado: ${normalized}` });
    setData((cur) => [...cur, normalized]);

    // actualizar form.values.transmision.tipoAceite
    form.setFieldValue('transmision.tipoAceite', normalized);
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
        label="Tipo de aceite de caja"
        required
        size="xs"
        withinPortal={false}
        onOptionSubmit={(val) => {
          combobox.closeDropdown();
          if (val === '$create') {
            setCreateModal(true);
          } else {
            setSearch(val);
            form.setFieldValue('transmision.tipoAceite', val);
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
            placeholder="Elige o crea tipo de aceite de caja"
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