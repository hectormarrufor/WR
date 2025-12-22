import { useCatalogOptions } from "@/hooks/useCatalogOptions";
import { Combobox, TextInput, useCombobox, Loader } from "@mantine/core";
import axios from "axios";
import { capitalizeUnlessUppercase } from "../handlers/capitalizeUnlessUppercase";
import { useEffect } from "react";

export function AsyncCatalogComboBox({
  disabled=false,
  label,
  placeholder,
  fieldKey,
  form,
  tipo = "",
  catalogo
}) {
  // CORRECCIÓN 1: Eliminado el bucle infinito. 
  // Solo reseteamos la selección visual, no forzamos el cierre (ya se está cerrando).
  const store = useCombobox({ 
    onDropdownClose: () => store.resetSelectedOption() 
  });
  
  const { options, loading, setOptions } = useCatalogOptions(catalogo, tipo);

  const handleCreateNew = async (nuevoValor) => {
    try {
      const res = await axios.post(`/api/inventario/catalogo/${catalogo}`, { valor: nuevoValor, tipo });
      const nuevo = res.data; 

      setOptions(prevOptions => {
        // Aseguramos no duplicar al insertar la respuesta del servidor
        const exists = prevOptions.some(opt => opt.nombre === nuevo.nombre);
        return exists ? prevOptions : [...prevOptions, nuevo];
      });
      
    } catch (err) {
      console.error("Error creando nuevo valor", err);
    }
  };

  const query = (form.values[fieldKey] || "").toLowerCase();

  // Filtrado robusto de duplicados
  const filteredOptions = options
    .filter(opt => (opt?.nombre ?? "").toLowerCase().includes(query))
    .reduce((acc, curr) => {
      if (!acc.some(o => o.nombre === curr.nombre)) acc.push(curr);
      return acc;
    }, []);

  // CORRECCIÓN 2: Key única garantizada
  // Usamos el nombre directamente combinada con el índice como respaldo
  const mappedOptions = filteredOptions.map((opt, index) => (
    <Combobox.Option value={opt.nombre} key={`${opt.nombre}-${index}`}>
      {opt.nombre}
    </Combobox.Option>
  ));

  return (
    <Combobox
      store={store}
      onOptionSubmit={(val) => {
        if (val.startsWith("+")) {
          const rawValue = val.replace('+ Añadir "', '').replace('"', '');
          // Actualización Optimista
          form.setFieldValue(fieldKey, rawValue);
          handleCreateNew(rawValue);
        } else {
          form.setFieldValue(fieldKey, val);
        }
        store.closeDropdown();
      }}
    >
      <Combobox.Target>
        <TextInput
          disabled={disabled}
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
          onClick={() => store.openDropdown()}
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
              
              {(form.values[fieldKey] || "").length > 0 && 
               !filteredOptions.some(o => o.nombre.toLowerCase() === (form.values[fieldKey] || "").toLowerCase()) && (
                <Combobox.Option value={`+ Añadir "${form.values[fieldKey]}"`}>
                  {`+ Añadir "${form.values[fieldKey]}"`}
                </Combobox.Option>
              )}

              {(!mappedOptions.length && (form.values[fieldKey] || "").length > 0) && 
               !filteredOptions.some(o => o.nombre.toLowerCase() === (form.values[fieldKey] || "").toLowerCase()) && (
                 <Combobox.Empty>No hay opciones que coincidan</Combobox.Empty>
              )}
            </>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}