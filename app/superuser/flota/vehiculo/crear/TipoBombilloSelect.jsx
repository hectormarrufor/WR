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

export function TipoBombilloSelect({ form, posicion, label }) {
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });

  // 1) Estados locales
  const [data, setData] = useState([]);
  const [search, setSearch] = useState(form.values.posicion || '');
  const [createModal, setCreateModal] = useState(false);

  // 2) Carga inicial de opciones
  useEffect(() => {
    (async () => {
      const tipos = await httpGet('/api/vehiculos/tipoBombillo');
      setData(tipos.map((t) => t.tipo));
    })();
  }, []);

  // 3) Sincronizar cuando cambie form.values.carroceria.posicion
  useEffect(() => {
    const external = form.values.posicion || '';
    if (external !== search) {
      setSearch(external);
    }
  }, [form.values.carroceria, posicion]);

  // 4) Filtrado (case-insensitive)
  const upperSearch = search.toUpperCase().trim();
  const exactMatch = data.includes(upperSearch);
  const filteredOptions = exactMatch
    ? data
    : data.filter((item) => item.toLowerCase().includes(search.toLowerCase()));

  // 5) Crear nuevo bombillo
  const crearTipo = async () => {
    const normalized = upperSearch.replace(/\s+/g, '');
    await httpPost('/api/vehiculos/tipoBombillo', { tipo: normalized });
    notifications.show({ title: `Bombillo creado: ${normalized}` });
    setData((cur) => [...cur, normalized]);

    // escribimos en form.values.carroceria.posicion
    form.setFieldValue(posicion, normalized);
    setSearch(normalized);
    setCreateModal(false);
  };

  return (
    <>
      <Modal
        opened={createModal}
        onClose={() => setCreateModal(false)}
        centered
      >
        <Title order={4} mb="md">
          ¿Crear el bombillo “{search}”?
        </Title>
        <Button fullWidth onClick={crearTipo}>
          Confirmar
        </Button>
      </Modal>

      <Combobox
        store={combobox}
        label={label}
        required
        size="xs"
        withinPortal={false}
        onOptionSubmit={(val) => {
          combobox.closeDropdown();
          if (val === '$create') {
            setCreateModal(true);
          } else {
            setSearch(val);
            form.setFieldValue(posicion, val);
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
            placeholder="Elige o crea el bombillo"
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
            {!exactMatch && upperSearch.length > 0 && (
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