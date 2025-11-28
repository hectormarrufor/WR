// fieldConfig.js
export const fieldConfig = {
  Marca: {
    get: { url: '/api/inventario/marcas', toArray: (data) => data.data?.map(m => m.nombre) ?? [] },
    post: { url: '/api/inventario/marcas', body: (value) => ({ nombre: value }) },
    write: (form, value) => form.setFieldValue('marca', value),
    dependsOnTipo: false,
  },
  Medida: {
    get: { url: '/api/inventario/medida-neumaticos', toArray: (data) => data.data?.[0]?.medida ?? [] },
    post: { url: '/api/inventario/medida-neumaticos', body: (value) => ({ medidas: [value] }) },
    write: (form, value) => updateSpec(form, 'Medida', { value }),
    dependsOnTipo: true, // solo cargar si tipo === 'Neumatico'
    shouldLoad: (tipo) => tipo === 'Neumatico',
  },
  Viscosidad: {
    get: { url: '/api/inventario/viscosidades-aceite', toArray: (data) => data.data?.[0]?.viscosidades ?? [] },
    post: { url: '/api/inventario/viscosidades-aceite', body: (value) => ({ viscosidades: [value] }) },
    write: (form, value) => updateSpec(form, 'Viscosidad', { value }),
    dependsOnTipo: true, // solo cargar si tipo === 'Aceite'
    shouldLoad: (tipo) => tipo === 'Aceite',
  },
  Codigo: {
    // Si códigos no tienen endpoint propio y son locales (como tu estado), puedes optar por local-only
    get: null,
    post: null, // o definir si luego habrá endpoint
    write: (form, value) => updateSpec(form, 'Codigo', { codigoParte: value }),
    dependsOnTipo: false,
  },
  Tipo: {
    get: { url: '/api/inventario/tipo', toArray: (data) => data.data?.map(t => t.nombre) ?? [] },
    post: { url: '/api/inventario/tipo', body: (value) => ({ nombre: value }) }, // si vas a permitir crear
    write: (form, value) => form.setFieldValue('tipo', value),
    dependsOnTipo: false,
  },

};

// Helper para mantener especificaciones como array [{campo, value, ...}]
export function updateSpec(form, campo, patch) {
  const specs = Array.isArray(form.values.especificaciones) ? form.values.especificaciones : [];
  const next = specs.some(s => s.campo === campo)
    ? specs.map(s => (s.campo === campo ? { ...s, ...patch } : s))
    : [...specs, { campo, ...patch }];
  form.setFieldValue('especificaciones', next);
}