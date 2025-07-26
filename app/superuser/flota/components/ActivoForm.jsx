// ... (dentro de ActivoForm.jsx)

export default function ActivoForm() {
  // ... (otros estados)
  const [allGrupos, setAllGrupos] = useState([]); // Nuevo estado para almacenar todos los grupos

  useEffect(() => {
    const fetchData = async () => {
      // Cargar categorías Y todos los grupos
      const [catRes, grpRes] = await Promise.all([
          fetch('/api/gestionMantenimiento/categorias'),
          fetch('/api/gestionMantenimiento/grupos')
      ]);
      const catData = await catRes.json();
      const grpData = await grpRes.json();

      setCategorias(catData.map(c => ({ value: c.id.toString(), label: c.nombre })));
      setAllGrupos(grpData);
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);

      // Separar los datos de componentes para la nueva API
      const componentes_a_crear = {};
      const atributos_instancia = {};
      
      for(const key in formData.atributos_dinamicos) {
          if (formData.atributos_dinamicos[key]?.relatedGrupo) {
              componentes_a_crear[key] = formData.atributos_dinamicos[key];
          } else {
              atributos_instancia[key] = formData.atributos_dinamicos[key];
          }
      }

      const payload = {
          nombre: formData.nombre,
          codigo: formData.codigo,
          modeloActivoId: formData.modeloActivoId, // Esto viene del ModeloActivo que seleccionemos
          imagen_url: formData.imagen_url,
          atributos_instancia,
          componentes_a_crear
      };

      // ... fetch a /api/gestionMantenimiento/activos-compuestos con el nuevo payload
  }

  return (
    <Paper /* ... */>
      {/* ... */}
      {selectedCategoria && (
        <form onSubmit={handleSubmit}>
          {/* ... */}
          {mergedFormSchema && (
            <RenderDynamicForm 
                schema={mergedFormSchema.atributos_especificos}
                onUpdate={handleDynamicChange}
                allGrupos={allGrupos} // Pasamos la lista de grupos al renderizador
            />
          )}
          {/* ... */}
        </form>
      )}
    </Paper>
  );
}