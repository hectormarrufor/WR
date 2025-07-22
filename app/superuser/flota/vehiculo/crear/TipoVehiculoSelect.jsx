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

export function TipoVehiculoSelect({ form }) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [data, setData] = useState([]);
  const [search, setSearch] = useState(form.values.tipo || '');
  const [createConfirmModal, setCreateConfirmModal] = useState(false);

  // 1) Carga opciones al montar o cambiar peso
  useEffect(() => {
    (async () => {
      const tipos = await httpGet('/api/vehiculos/tipo');
      const labels = tipos
        .filter((t) => t.peso === form.values.tipoPeso)
        .map((t) => t.label);
      setData(labels);
    })();
  }, [form.values.tipoPeso]);

  // 2) Cuando form.values.tipo cambie desde afuera, sincronizamos
  useEffect(() => {
    if (form.values.tipo !== search) {
      setSearch(form.values.tipo || '');
    }
  }, [form.values.tipo]);

  // 3) Filtrado de opciones
  const exactMatch = data.includes(search);
  const filtered = exactMatch
    ? data
    : data.filter((item) =>
        item.toLowerCase().includes(search.toLowerCase().trim())
      );

  // 4) Función para crear un nuevo tipo
  const crearTipo = async () => {
    await httpPost('/api/vehiculos/tipo', {
      label: search,
      peso: form.values.tipoPeso,
    });
    notifications.show({ title: 'Tipo de vehículo creado' });
    setData((current) => [...current, search]);
    form.setFieldValue('tipo', search);
    setCreateConfirmModal(false);
  };

  return (
    <>
      <Modal
        opened={createConfirmModal}
        onClose={() => setCreateConfirmModal(false)}
        centered
      >
        <Title order={4} mb="md">
          ¿Crear el tipo de vehículo “{search}”?
        </Title>
        <Button onClick={crearTipo}>Confirmar</Button>
      </Modal>

      <Combobox
        store={combobox}
        label="Tipo"
        required
        size="xs"
        withinPortal={false}
        onOptionSubmit={(val) => {
          combobox.closeDropdown();

          if (val === '$create') {
            // Abrimos modal y usamos el valor actual de `search`
            setCreateConfirmModal(true);
          } else {
            // Seleccion normal: actualizamos input y form
            setSearch(val);
            form.setFieldValue('tipo', val);
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
            onBlur={() => combobox.closeDropdown()}  // <-- Ya NO reseteamos search aquí
            placeholder="Elige o crea el tipo de vehículo"
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