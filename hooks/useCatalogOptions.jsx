import { useState, useEffect } from "react";

export function useCatalogOptions(catalogo) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!catalogo) return;
    setLoading(true);
    fetch(`/api/inventario/${catalogo}`)
      .then(res => {
        setOptions(res.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [catalogo]);

  return { options, loading };
}