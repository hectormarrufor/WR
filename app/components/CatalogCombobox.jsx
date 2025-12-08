import { Combobox, TextInput, useCombobox } from "@mantine/core";
import axios from "axios";

export function AsyncCatalogComboBox({ 
  label, 
  placeholder, 
  fieldKey, 
  form, 
  catalogo 
}) {
  const store = useCombobox({ onDropdownClose: () => store.resetSelectedOption() });
  const { options, loading } = useCatalogOptions(catalogo);

  const handleCreateNew = async (nuevoValor) => {
    try {
      const res = await axios.post(`/api/inventario/${catalogo}`, { valor: nuevoValor });
      const nuevo = res.data;
      // Actualiza el form con el nuevo id
      form.setFieldValue(fieldKey, nuevo.id);
    } catch (err) {
      console.error("Error creando nuevo valor", err);
    }
  };

  const mappedOptions = options.map(opt => {
    const label = opt.nombre || opt.medida || opt.valor || opt.codigo;
    return (
      <Combobox.Option value={opt.id} key={opt.id}>
        {label}
      </Combobox.Option>
    );
  });

  return (
    <Combobox
      store={store} 
      onOptionSubmit={(val) => { 
        if (val.startsWith("+")) {
          handleCreateNew(val.replace('+ Añadir "', '').replace('"', ''));
        } else {
          form.setFieldValue(fieldKey, val); 
        }
        store.closeDropdown(); 
      }}
    >
      <Combobox.Target>
        <TextInput
          label={label}
          placeholder={placeholder}
          value={form.values[fieldKey] || ""}
          rightSection={loading ? '...' : null}
          onChange={(e) => {
            let v = capitalizeUnlessUppercase(e.currentTarget.value);
            form.setFieldValue(fieldKey, v);
            store.openDropdown();
            store.updateSelectedOptionIndex('active');
          }}
          onFocus={() => store.openDropdown()}
          onBlur={() => store.closeDropdown()}
        />
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options>
          {mappedOptions}
          <Combobox.Option value={`+ Añadir "${form.values[fieldKey]}"`}>
            {`+ Añadir "${form.values[fieldKey]}"`}
          </Combobox.Option>
          {mappedOptions.length === 0 && (
            <Combobox.Empty>No hay opciones que coincidan</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}