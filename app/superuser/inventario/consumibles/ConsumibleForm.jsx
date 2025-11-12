'use client';

import { useState, useEffect } from 'react';
import {
  TextInput, Select, Button, Group, Box, Text, TagsInput, NumberInput, Textarea,
  Stack, Modal, MultiSelect, Grid, ActionIcon, Title,
  Combobox,
  useCombobox,
  Paper,
  Loader
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { toCamelCase } from '../../flota/components/AtributoConstructor';
import { capitalizeUnlessUppercase } from '@/app/handlers/capitalizeUnlessUppercase';
import NewTipoConsumibleForm from './NewTipoConsumibleForm';

const getMatchingAttributes = (definicion, consumibleType, path = []) => {
  let attributes = [];

  // Convertimos el objeto a un array si no lo es para poder iterar
  const definicionArray = Array.isArray(definicion) ? definicion : Object.values(definicion || {});

  definicionArray.forEach(attr => {
    // Si el atributo es un grupo o un objeto, procesamos su definición
    if (attr.dataType === 'grupo' && attr.componente?.especificaciones) {
      attributes = attributes.concat(getMatchingAttributes(attr.componente.especificaciones, consumibleType, [...path, attr.id]));
    } else if (attr.dataType === 'object' && attr.definicion) {
      attributes = attributes.concat(getMatchingAttributes(attr.definicion, consumibleType, [...path, attr.id]));
    } else if (attr.consumibleType === consumibleType) {
      attributes.push({
        id: attr.id,
        label: `${path.length > 0 ? path.join(' > ') + ' > ' : ''}${attr.label}`,
        fullPath: [...path, attr.id].join('.')
      });
    }
  });

  return attributes;
};



export default function ConsumibleForm({ initialData, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [marcas, setMarcas] = useState([]); // Nuevo estado para las marcas
  const [modelos, setModelos] = useState([]); // Estado para los modelos
  const [tipoConsumibles, setTipoConsumibles] = useState([]); // Estado para los tipos de consumibles
  const [selectedModelosData, setSelectedModelosData] = useState({});
  const [medidasNeumaticos, setMedidasNeumaticos] = useState([]);
  const [searchValueMedida, setSearchValueMedida] = useState('');
  const [searchValueMarca, setSearchValueMarca] = useState('');
  const [searchValueTipo, setSearchValueTipo] = useState('');
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const comboboxTipo = useCombobox({ onDropdownClose: () => comboboxTipo.resetSelectedOption(), });
  const comboboxNeumaticos = useCombobox({ onDropdownClose: () => comboboxNeumaticos.resetSelectedOption(), });
  const comboboxMarcas = useCombobox({ onDropdownClose: () => comboboxMarcas.resetSelectedOption(), });
  const [newTipoModalOpen, setNewTipoModalOpen] = useState(false);


  const form = useForm({
    initialValues: {
      nombre: initialData?.nombre || '',
      marca: initialData?.marca || '',
      stock: initialData?.stock || 0,
      stockMinimo: initialData?.stockMinimo || 0,
      tipo: initialData?.tipo || '',
      especificaciones: initialData?.tipo.especificaciones || {},
    },
    validate: {
      nombre: (value) => (value ? null : 'El nombre es obligatorio'),
      tipo: (value) => (value ? null : 'El tipo es obligatorio'),
    },
  });

  // Observamos el valor del campo 'tipo' para el renderizado condicional
  const tipoConsumible = form.values.tipo;
  const isEditing = initialData?.id ? true : false;


  //FUNCION PARA GENERAR NOMBRE SUGERIDO
  const generateSuggestedName = (tipo, marca, codigoParte, especificaciones) => {
    if (!tipo) return '';
    let nameParts = [];

    // Priorizamos la marca si está disponible

    // Agregamos la especificación clave
    if (tipo === 'Aceite' && especificaciones?.find(atributo => atributo.campo === "Viscosidad")) {
      nameParts.push(`Aceite ${especificaciones.find(atributo => atributo.campo === "Viscosidad").valor}`);
    } else if (tipo === 'Neumatico' && especificaciones?.medida) {
      nameParts.push(`Neumático ${especificaciones.medida}`);
    } else if (tipo === 'Bateria' && especificaciones?.nomenclatura) {
      nameParts.push(`Batería ${especificaciones.nomenclatura}`);
    } else {
      // Para otros tipos, usamos el tipo de consumible como base
      nameParts.push(tipo);
    }
    if (marca) {
      nameParts.push(marca);
    }

    // Añadimos el código de parte al final, si existe
    if (codigoParte) {
      nameParts.push(`${codigoParte}`);
    }

    return nameParts.join(' ');
  };

  //FETCHERS

  const fetchMedidasNeumaticos = async () => {
    try {
      const res = await fetch('/api/inventario/medida-neumaticos');
      if (!res.ok) throw new Error('Error al consultar la API');
      const data = await res.json();
      if (Array.isArray(data.data[0].medida) && data.data[0].medida.length > 0) {
        setMedidasNeumaticos(data.data[0].medida);
      } else {
        const medidasArray = [
          // Autos y camionetas (R13-R22)
          '175/70R13', '185/70R13', '165/65R14', '175/65R14', '185/60R14', '185/65R14', '195/60R14', '195/65R14',
          '185/55R15', '185/60R15', '195/50R15', '195/55R15', '195/60R15', '195/65R15', '205/55R15', '205/60R15', '205/65R15',
          '195/45R16', '205/45R16', '205/50R16', '205/55R16', '205/60R16', '215/55R16', '215/60R16', '215/65R16', '225/60R16',
          '205/40R17', '215/45R17', '215/50R17', '215/55R17', '225/45R17', '225/50R17', '225/55R17', '235/45R17', '235/55R17',
          '215/40R18', '225/40R18', '225/45R18', '235/40R18', '235/45R18', '235/50R18', '245/40R18', '245/45R18', '255/35R18',
          '225/35R19', '235/35R19', '245/35R19', '245/40R19', '255/35R19', '255/40R19', '265/35R19', '275/35R19',
          '245/35R20', '255/35R20', '265/35R20', '275/30R20', '275/35R20', '285/30R20', '295/25R20', '305/30R20',
          '255/30R21', '265/30R21', '275/30R21', '285/30R21', '295/30R21', '305/25R21',
          '265/30R22', '275/30R22', '285/30R22', '295/25R22', '305/30R22',

          // SUV, camionetas y 4x4 (tacos/perfil alto)
          '215/75R15', '225/75R15', '235/75R15', '255/70R15', '265/70R15',
          '225/75R16', '235/70R16', '245/70R16', '255/70R16', '265/70R16', '265/75R16', '275/70R16', '285/75R16',
          '245/75R17', '255/75R17', '265/65R17', '265/70R17', '265/75R17', '275/65R17', '285/70R17', '285/75R17',
          '265/60R18', '265/65R18', '275/65R18', '285/60R18', '285/65R18', '305/60R18',
          '275/55R20', '285/50R20', '295/55R20', '305/55R20',

          // Camiones livianos y medianos
          '7.00R16', '7.50R16', '8.25R16', '8.25R20', '9.00R20', '10.00R20', '11.00R20', '12.00R20',
          '215/75R17.5', '225/75R17.5', '235/75R17.5', '245/70R19.5', '265/70R19.5', '285/70R19.5',
          '295/80R22.5', '315/80R22.5', '385/65R22.5', '425/65R22.5',

          // Chutos y maquinaria pesada
          '12.00R24', '14.00R24', '16.00R24', '18.00R25', '20.5R25', '23.5R25', '26.5R25', '29.5R25',

          // Montacargas y maquinaria industrial
          '6.50-10', '7.00-12', '8.25-15', '10.00-20', '12.00-20', '15x5', '18x7-8', '21x8-9', '23x9-10',

          // Taladros y maquinaria minera
          '33.00R51', '36.00R51', '40.00R57', '46/90R57', '50/80R57', '59/80R63',

          // Otros formatos comunes
          '31x10.50R15', '33x12.50R15', '35x12.50R15', '37x13.50R17', '40x13.50R17'
        ]; // <-- agrega aquí tus medidas
        if (medidasArray.length > 0) {
          const postRes = await fetch('/api/inventario/medida-neumaticos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ medidas: medidasArray }),
          });
          if (!postRes.ok) throw new Error('Error al crear medidas');
          setMedidasNeumaticos(medidasArray);
        }
      }
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err.message || 'No se pudieron obtener las medidas de neumáticos',
        color: 'red',
      });
    }
  }

  const fetchMarcas = async () => {
    try {
      const response = await fetch('/api/inventario/marcas');
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setMarcas(data.data.map(m => m.nombre));
      } else {
        setMarcas([]);
      }
    } catch (error) {
      console.error('Error fetching marcas:', error);
      notifications.show({ title: 'Error', message: 'No se pudieron cargar las marcas.', color: 'red' });
    }
  };

  const fetchModelos = async () => {
    try {
      const response = await fetch('/api/gestionMantenimiento/modelos-activos');
      const data = await response.json();
      setModelos(data.map(m => ({ value: m.id.toString(), label: m.nombre })));
    } catch (error) {
      console.error('Error fetching modelos:', error);
      notifications.show({ title: 'Error', message: 'No se pudieron cargar los modelos.', color: 'red' });
    }
  };




  //Efecto de carga para cargar datos iniciales (tipos)
  useEffect(() => {
    const fetchTipoConsumibles = async () => {
      try {
        const response = await fetch('/api/inventario/tipo');
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setTipoConsumibles(data.data);
        } else {
          setTipoConsumibles([]);
        }
      } catch (error) {
        console.error('Error fetching tipos de consumibles:', error);
        notifications.show({ title: 'Error', message: 'No se pudieron cargar los tipos de consumibles.', color: 'red' });
      }
    };
    fetchTipoConsumibles();
    fetchMarcas();
    fetchModelos();
  }, []);


  //USEEFFECT PARA CARGAR DATOS ESPECIFICOS SEGUN TIPO DE CONSUMIBLE
  useEffect(() => {
    // if (form.values.tipo === 'Neumatico') {
    //   fetchMedidasNeumaticos();
    // }
    form.setFieldValue('especificaciones', tipoConsumibles.find(tipo => tipo.nombre === form.values.tipo)?.especificaciones || {});
  }, [form.values.tipo]);

  useEffect(() => {
    console.log(form.values);
  }, [form.values]);

  // //USEEFFECT PARA SUGERIR SKU Y NOMBRE DE CONSUMIBLE 
  // useEffect(() => {
  //   if (!initialData?.id) {
  //     const { tipo, marca, codigoParte, especificaciones } = form.values;
  //     form.setFieldValue('nombre', generateSuggestedName(tipo, marca, codigoParte, especificaciones));
  //   }
  // }, [form.values.tipo, form.values.marca, form.values.especificaciones, initialData?.id]);



  //HANDLERS

  const handleCreateMedida = async (query) => {
    try {
      const response = await fetch('/api/inventario/medida-neumaticos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medidas: [query] }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No se pudo crear la medida.');
      }
      setMedidasNeumaticos(data.data.medida);
      notifications.show({ title: 'Éxito', message: `Medida "${query}" creada.`, color: 'green' });
      return query;
    } catch (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
      return null;
    }
  };

  const handleCreateMarca = async (query) => {
    try {
      const response = await fetch('/api/inventario/marcas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: query }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No se pudo crear la marca.');
      }
      setMarcas((current) => [...current, query]);
      notifications.show({ title: 'Éxito', message: `Marca "${query}" creada.`, color: 'green' });
      return query;
    } catch (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
      return null;
    }
  };

  const handleModelosChange = async (selectedIds) => {
    setIsFetchingModels(true);
    const newSelectedModelosData = { ...selectedModelosData };
    const newlySelectedIds = selectedIds.filter(id => !newSelectedModelosData[id]);
    const removedIds = Object.keys(newSelectedModelosData).filter(id => !selectedIds.includes(id));

    // Eliminar modelos que ya no están seleccionados
    removedIds.forEach(id => delete newSelectedModelosData[id]);

    // Obtener los datos para los modelos recién seleccionados
    await Promise.all(newlySelectedIds.map(async id => {
      try {
        const response = await fetch(`/api/gestionMantenimiento/modelos-activos/${id}`);
        const data = await response.json();
        const matchingAttributes = getMatchingAttributes(data.especificaciones, tipoConsumible);

        newSelectedModelosData[id] = {
          attributes: matchingAttributes.map(attr => ({ value: attr.fullPath, label: attr.label })),
          selectedAttributes: [],
        };
      } catch (error) {
        console.error(`Error al obtener el modelo ${id}:`, error);
      }
    }));

    setSelectedModelosData(newSelectedModelosData);
    form.setFieldValue('compatibilidades', Object.entries(newSelectedModelosData).map(([modeloId, data]) => ({ modeloId, atributos: data.selectedAttributes })));
    setIsFetchingModels(false);
  };
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const endpoint = isEditing
        ? `/api/inventario/consumibles/${initialData.id}`
        : '/api/inventario/consumibles';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al guardar el consumible.');
      }

      notifications.show({
        title: 'Éxito',
        message: data.message,
        color: 'green',
      });
      if (onSuccess) {
        onSuccess(data.consumible);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };



  // Filtramos y preparamos las opciones para los Combobox de medidas y marcas
  const filteredMedidas = medidasNeumaticos.filter((item) => item.toLowerCase().includes(searchValueMedida.toLowerCase().trim()));
  const optionsMedidas = filteredMedidas.map((item) => (<Combobox.Option value={item} key={item}>{item}</Combobox.Option>));
  const showCreateOptionMedida = searchValueMedida.trim() !== '' && !medidasNeumaticos.some(m => m.toLowerCase() === searchValueMedida.toLowerCase().trim());
  const filteredMarcas = marcas.filter((item) => item.toLowerCase().includes(searchValueMarca.toLowerCase().trim()));
  const optionsMarcas = filteredMarcas.map((item) => (<Combobox.Option value={item} key={item}>{item}</Combobox.Option>));
  const showCreateOptionMarca = searchValueMarca.trim() !== '' && !marcas.some(m => m.toLowerCase() === searchValueMarca.toLowerCase().trim());
  const filteredTipos = tipoConsumibles.map(tipo => tipo.nombre).filter((item) => item.toLowerCase().includes(searchValueTipo.toLowerCase().trim()));
  const optionsTipos = filteredTipos.map((item) => (<Combobox.Option value={item} key={item}>{item}</Combobox.Option>));
  const showCreateOptionTipo = searchValueTipo.trim() !== '' && !tipoConsumibles.some(t => t.nombre.toLowerCase() === searchValueTipo.toLowerCase().trim());

  const handleAttributeChange = (modeloId, selectedAttrs) => {
    const updatedData = { ...selectedModelosData, [modeloId]: { ...selectedModelosData[modeloId], selectedAttributes: selectedAttrs } };
    setSelectedModelosData(updatedData);
    form.setFieldValue('compatibilidades', Object.entries(updatedData).map(([id, d]) => ({ modeloId: id, atributos: d.selectedAttributes })));
  };
  return (
    <Box maw={900} mx="auto">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Title order={3} mb="lg">{isEditing ? `Editar ${initialData.nombre}` : 'Crear Nuevo Consumible'}</Title>
        <Grid>

          <Grid.Col span={6}>
            <Combobox
              store={comboboxTipo}
              onOptionSubmit={(val) => {
                const isNew = !tipoConsumibles.map(tipo => tipo.nombre).includes(val);
                if (isNew) {
                  setNewTipoModalOpen(true);
                  // handleCreateTipo(val);
                }
                form.setFieldValue('tipo', val);
                comboboxTipo.closeDropdown();
              }}
            >
              <Combobox.Target>
                <TextInput
                  label="Tipo de Consumible"
                  placeholder="Busca o crea un tipo de consumible"
                  value={form.values.tipo || searchValueTipo}
                  onChange={(event) => {
                    let newValue = event.currentTarget.value;
                    newValue = capitalizeUnlessUppercase(newValue);
                    setSearchValueTipo(newValue);
                    form.setFieldValue('tipo', newValue);
                    comboboxTipo.openDropdown();
                    comboboxTipo.updateSelectedOptionIndex('active');
                  }}

                  onFocus={() => comboboxTipo.openDropdown()}
                  onBlur={() => comboboxTipo.closeDropdown()}
                />
              </Combobox.Target>
              <Combobox.Dropdown>
                <Combobox.Options>
                  {optionsTipos}
                  {showCreateOptionTipo && (
                    <Combobox.Option value={searchValueTipo}>
                      {`+ Añadir "${searchValueTipo}"`}
                    </Combobox.Option>
                  )}
                  {optionsTipos.length === 0 && !showCreateOptionTipo && (
                    <Combobox.Empty>No hay tipos que coincidan</Combobox.Empty>
                  )}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          </Grid.Col>

          {form.values.tipo &&
            <>
              <Grid.Col span={6}>
                <Combobox
                  store={comboboxMarcas}
                  onOptionSubmit={(val) => {
                    const isNew = !marcas.includes(val);
                    if (isNew) {
                      handleCreateMarca(val);
                    }
                    form.setFieldValue('marca', val);
                    comboboxMarcas.closeDropdown();
                  }}
                >
                  <Combobox.Target>
                    <TextInput
                      label="Marca"
                      placeholder="Busca o crea una marca"
                      value={form.values.marca || searchValueMarca}
                      onChange={(event) => {
                        let newValue = event.currentTarget.value;
                        newValue = capitalizeUnlessUppercase(newValue);
                        setSearchValueMarca(newValue);
                        form.setFieldValue('marca', newValue);
                        comboboxMarcas.openDropdown();
                        comboboxMarcas.updateSelectedOptionIndex('active');
                      }}

                      onFocus={() => comboboxMarcas.openDropdown()}
                      onBlur={() => comboboxMarcas.closeDropdown()}
                    />
                  </Combobox.Target>
                  <Combobox.Dropdown>
                    <Combobox.Options>
                      {optionsMarcas}
                      {showCreateOptionMarca && (
                        <Combobox.Option value={searchValueMarca}>
                          {`+ Añadir "${searchValueMarca}"`}
                        </Combobox.Option>
                      )}
                      {optionsMarcas.length === 0 && !showCreateOptionMarca && (
                        <Combobox.Empty>No hay marcas que coincidan</Combobox.Empty>
                      )}
                    </Combobox.Options>
                  </Combobox.Dropdown>
                </Combobox>
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="cantidad en stock"
                  placeholder="Ingresa la cantidad en stock"
                  {...form.getInputProps('stock')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="stock minimo"
                  placeholder="Ingresa la cantidad de stock minimo"
                  {...form.getInputProps('stockMinimo')}
                />
              </Grid.Col>
            </>
          }

          {/* --- Renderizado Condicional por Tipo de Consumible --- */}
          {form.values.especificaciones.length > 0 && form.values.especificaciones?.map((spec, index) => (
            <Grid.Col span={6} key={index}>
              {
                spec.tipoEntrada === 'number' ?
                  <NumberInput
                    key={index}
                    label={spec.campo}
                    placeholder={`Ingresa ${spec.campo.toLowerCase()}`}
                    value={form.values.especificaciones[spec.value] || ''}
                    onChange={(value) => {
                      const newEspecificaciones = { ...form.values.especificaciones, [spec.value]: value };
                      form.setFieldValue('especificaciones', newEspecificaciones);
                    }}
                  />
                  : spec.tipoEntrada === 'text' ?
                    <TextInput
                      key={index}
                      label={spec.campo}
                      placeholder={`Ingresa ${spec.campo.toLowerCase()}`}
                      value={form.values.especificaciones[spec.value] || ''}
                      onChange={(event) => {
                        console.log(form.values)
                        const newEspecificaciones = { ...form.values.especificaciones, [spec.value]: event.currentTarget.value };
                        form.setFieldValue('especificaciones', newEspecificaciones);

                      }}
                    /> :
                    spec.tipoEntrada === 'select' &&
                    <Select
                      key={index}
                      label={spec.campo}
                      placeholder={`Selecciona ${spec.campo.toLowerCase()}`}
                      data={spec.opciones || []}
                      value={form.values.especificaciones.find(espec => espec.campo === spec.campo).value || ''}
                      onChange={(value) => {
                        console.log(value)
                        const newEspecificaciones = [ ...form.values.especificaciones.map(espec => { return (espec.campo === spec.campo ?  {...espec, value: value} : {...espec})}) ];
                        form.setFieldValue('especificaciones', newEspecificaciones);
                      }}
                    />
              }



            </Grid.Col>
          ))}


        </Grid>




        <Group justify="flex-end" mt="lg">
          <Button type="submit" loading={loading} disabled={!form.isValid()}>
            {isEditing ? 'Guardar Cambios' : 'Crear Consumible'}
          </Button>
        </Group>
      </form>
      <Modal opened={newTipoModalOpen} centered onClose={() => setNewTipoModalOpen(false)} title="Crear Nuevo Tipo de Consumible" size="lg">
        <NewTipoConsumibleForm
          tipoNombre={searchValueTipo}
          setNewTipoModalOpen={setNewTipoModalOpen}
          form={form}
        />
      </Modal>
    </Box>
  );
}