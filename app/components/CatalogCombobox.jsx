import { useCatalogOptions } from "@/hooks/useCatalogOptions";
import { Combobox, TextInput, useCombobox, Loader } from "@mantine/core";
import axios from "axios";
import { capitalizeUnlessUppercase } from "../handlers/capitalizeUnlessUppercase";
import { useEffect } from "react";

export function AsyncCatalogComboBox({
  label,
  placeholder,
  fieldKey,
  form,
  tipo = "",
  catalogo
}) {
  const store = useCombobox({ onDropdownClose: () => store.resetSelectedOption() });
  const { options, loading, setOptions } = useCatalogOptions(catalogo, tipo);

  const handleCreateNew = async (nuevoValor) => {
    try {
      const res = await axios.post(`/api/inventario/catalogo/${catalogo}`, { valor: nuevoValor, tipo });
      const nuevo = res.data; // {id, nombre}

      // Evitar duplicados
      setOptions(prevOptions => {
        const exists = prevOptions.some(opt => opt.nombre === nuevo.nombre);
        return exists ? prevOptions : [...prevOptions, nuevo];
      });

      // Selecciona directamente el nombre en el form
      form.setFieldValue(fieldKey, nuevo.nombre);

      store.closeDropdown();
    } catch (err) {
      console.error("Error creando nuevo valor", err);
    }
  };

  useEffect(() => {
    console.log("Opciones del catálogo actualizadas:", options);
  }, [options]);

  const query = (form.values[fieldKey] || "").toLowerCase();

  // Filtrar y eliminar duplicados
  const filteredOptions = options
    .filter(opt => (opt?.nombre ?? "").toLowerCase().includes(query))
    .reduce((acc, curr) => {
      if (!acc.some(o => o.nombre === curr.nombre)) acc.push(curr);
      return acc;
    }, []);

  const mappedOptions = filteredOptions.map(opt => (
    <Combobox.Option value={opt.nombre} key={opt.id || opt.nombre}>
      {opt.nombre}
    </Combobox.Option>
  ));

  return (
    <Combobox
      store={store}
      onOptionSubmit={(val) => {
        if (val.startsWith("+")) {
          handleCreateNew(val.replace('+ Añadir "', '').replace('"', ''), tipo);
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
          rightSection={loading ? <Loader size="xs" /> : null}
          onChange={(e) => {
            let v = capitalizeUnlessUppercase(e.currentTarget.value);
            form.setFieldValue(fieldKey, v);
            store.openDropdown();
            store.updateSelectedOptionIndex("active");
          }}
          onFocus={() => store.openDropdown()}
          onBlur={() => store.closeDropdown()}
        />
      </Combobox.Target>
      <Combobox.Dropdown>
        <Combobox.Options>
          {loading ? (
            <Combobox.Option value="loading" disabled>
              <Loader size="sm" /> Cargando opciones...
            </Combobox.Option>
          ) : (
            <>
              {mappedOptions}
              {(form.values[fieldKey] || "").length > 0 && (
                <Combobox.Option value={`+ Añadir "${form.values[fieldKey]}"`}>
                  {`+ Añadir "${form.values[fieldKey]}"`}
                </Combobox.Option>
              )}
              {(!mappedOptions.length && (form.values[fieldKey] || "").length > 0) && (
                <Combobox.Empty>No hay opciones que coincidan</Combobox.Empty>
              )}
            </>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}