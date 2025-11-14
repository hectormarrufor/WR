import { capitalizeUnlessUppercase } from '@/app/handlers/capitalizeUnlessUppercase';
import { TextInput, Combobox, useCombobox } from '@mantine/core';
import { useAsyncOptions } from './useAsyncOptions';


export function AsyncComboBox({ label, placeholder, fieldKey, form, tipoActual, onCreateNew }) {
  const store = useCombobox({ onDropdownClose: () => store.resetSelectedOption() });
  const { loading, search, setSearch, filtered, canCreate, submit } =
    useAsyncOptions(fieldKey, form, tipoActual, onCreateNew);

  const options = filtered.map(item => (
    <Combobox.Option value={item} key={item}>{item}</Combobox.Option>
  ));

  return (
    <Combobox store={store} onOptionSubmit={(val) => { submit(val); store.closeDropdown(); }}>
      <Combobox.Target>
        <TextInput
          label={label}
          placeholder={placeholder}
          value={form.values[fieldKey] || search}

          rightSection={loading ? '...' : null}
          onChange={(e) => {
            let v = e.currentTarget.value;
            v = capitalizeUnlessUppercase(v);
            setSearch(v);
            store.openDropdown();
            store.updateSelectedOptionIndex('active');
          }}
          onFocus={() => store.openDropdown()}
          onBlur={() => store.closeDropdown()}
        />
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options>
          {options}
          {canCreate && (
            <Combobox.Option value={search}>
              {`+ Añadir "${search}"`}
            </Combobox.Option>
          )}
          {options.length === 0 && !canCreate && (
            <Combobox.Empty>No hay opciones que coincidan</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}