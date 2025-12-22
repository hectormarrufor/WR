import { useState, useEffect } from "react";

export function useCatalogOptions(catalogo, tipo) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!catalogo) return;
    setLoading(true);

    fetch(`/api/inventario/catalogo/${catalogo}${tipo ? `?tipo=${tipo}` : ''}`)
      .then(res => {
        if (!res.ok) throw new Error("Error fetching catalog options");
        return res.json();
      })
      .then(data => {
        // Tu API devuelve [{id, nombre}, ...]
        // Guardamos tal cual, pero el combobox usará solo `nombre`
        setOptions(Array.isArray(data.data) ? data.data : []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [catalogo]);

  return { options, loading, setOptions };
}