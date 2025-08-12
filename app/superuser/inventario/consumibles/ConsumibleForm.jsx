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
  const [selectedModelosData, setSelectedModelosData] = useState({});
  const [medidasNeumaticos, setMedidasNeumaticos] = useState([]);
  const [searchValueMedida, setSearchValueMedida] = useState('');
  const [searchValueMarca, setSearchValueMarca] = useState('');
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const comboboxNeumaticos = useCombobox({ onDropdownClose: () => comboboxNeumaticos.resetSelectedOption(), });
  const comboboxMarcas = useCombobox({ onDropdownClose: () => comboboxMarcas.resetSelectedOption(), });


  const form = useForm({
    initialValues: {
      nombre: initialData?.nombre || '',
      marca: initialData?.marca || '',
      codigoParte: initialData?.codigoParte || '',
      tipo: initialData?.tipo || '',
      sku: initialData?.sku || '',
      especificaciones: initialData?.especificaciones || {},
      unidadMedida: initialData?.unidadMedida || '',
      compatibilidades: initialData?.compatibilidades || [],
    },
    validate: {
      nombre: (value) => (value ? null : 'El nombre es obligatorio'),
      tipo: (value) => (value ? null : 'El tipo es obligatorio'),
    },
  });

  // Observamos el valor del campo 'tipo' para el renderizado condicional
  const tipoConsumible = form.values.tipo;
  const isEditing = initialData?.id ? true : false;

                  // FUNCIÓN PARA GENERAR EL SKU BASE 
  const generateSku = (tipo, marca, codigoParte, especificaciones) => {
    const tipoPart = tipo ? tipo.substring(0, 3).toUpperCase() : '';
    const marcaPart = marca ? marca.substring(0, 3).toUpperCase() : '';
    const codigoPart = codigoParte ? codigoParte.replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase() : '';

    let specsPart = '';
    if (especificaciones) {
      if (tipo === 'Neumatico' && especificaciones.medida) {
        specsPart = especificaciones.medida.replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase();
      } else if (tipo === 'Aceite' && especificaciones.viscosidad) {
        specsPart = especificaciones.viscosidad.replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase();
      } else if (especificaciones.nomenclatura) {
        specsPart = especificaciones.nomenclatura.replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase();
      }
    }

    const parts = [tipoPart, marcaPart, codigoPart, specsPart].filter(Boolean);
    return parts.join('-');
  };
                  //FUNCION PARA GENERAR NOMBRE SUGERIDO
  const generateSuggestedName = (tipo, marca, codigoParte, especificaciones) => {
    if (!tipo) return '';
    let nameParts = [];

    // Priorizamos la marca si está disponible

    // Agregamos la especificación clave
    if (tipo === 'Aceite' && especificaciones?.viscosidad) {
      nameParts.push(`Aceite ${especificaciones.viscosidad}`);
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




  //USEEFFECT PARA CARGAR MEDIDAS DE NEUMATICOS, MARCAS Y MODELOS
  useEffect(() => {
    if (form.values.tipo === 'Neumatico') {
      fetchMedidasNeumaticos();
    }
    fetchMarcas();
    fetchModelos();
  }, [form.values.tipo]);

  //USEEFFECT PARA SUGERIR SKU Y NOMBRE DE CONSUMIBLE 
  useEffect(() => {
    if (!initialData?.id) {
      const { tipo, marca, codigoParte, especificaciones } = form.values;
      if (tipo || marca || codigoParte || Object.keys(especificaciones).length > 0) {
        const newSku = generateSku(tipo, marca, codigoParte, especificaciones);
        form.setFieldValue('sku', newSku);
      }
      form.setFieldValue('nombre', generateSuggestedName(tipo, marca, codigoParte, especificaciones));
    }
  }, [form.values.tipo, form.values.marca, form.values.codigoParte, form.values.especificaciones, initialData?.id]);



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
            <Select
              label="Tipo de Consumible"
              placeholder="Selecciona el tipo"
              required
              data={['Aceite', 'Neumatico', 'Bujia', 'Sensor', 'Manguera', 'Bateria', 'Correa', 'Filtro', 'Otro']}
              {...form.getInputProps('tipo')}
            />
          </Grid.Col>

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
            <TextInput
              label="Código de Parte"
              placeholder="Ej: 6PK1035"
              value={form.values.codigoParte}
              onChange={(e) => form.setFieldValue('codigoParte', e.currentTarget.value.toUpperCase())}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <Select
              label="Unidad de Medida"
              placeholder="Selecciona una unidad"
              data={['Litros', 'Unidades', 'Metros', 'Kilogramos', 'Pulgadas']}
              {...form.getInputProps('unidadMedida')}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <TextInput
              label="Nombre"
              placeholder="Ej: Aceite de Motor 15W40"
              required
              {...form.getInputProps('nombre')}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <TextInput
              label="SKU"
              placeholder="Codigo interno para identificar producto"
              required
              {...form.getInputProps('sku')}
            />
          </Grid.Col>
        </Grid>

        {/* --- Renderizado Condicional por Tipo de Consumible --- */}
        <Stack mt="xl" spacing="lg">

          {/* Caso: Aceite */}
          {tipoConsumible === 'Aceite' && (
            <Grid>
              <Grid.Col span={6}>
                <Select
                  label="Aplicacion"
                  data={['Motor', 'Transmisión', 'Hidráulico', 'Diferencial']}
                  placeholder="Selecciona el tipo de aceite"
                  value={form.values.especificaciones.aplicacion}
                  onChange={(e) => {
                    form.setValues({
                      especificaciones: {
                        ...form.values.especificaciones,
                        aplicacion: e,
                        tipoAceite: null,
                        viscosidad: null,
                      }
                    })
                  }}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Tipo de Aceite"
                  value={form.values.especificaciones.tipoAceite}
                  onChange={(e) => {
                    form.setValues({
                      especificaciones: {
                        ...form.values.especificaciones,
                        tipoAceite: e,
                        viscosidad: null,
                      }
                    });
                  }}
                  data={
                    form.values.especificaciones.aplicacion === "Motor" ? ['Mineral', 'Semi-sintético', 'Sintético'] :
                      form.values.especificaciones.aplicacion === "Transmisión" ? ['Valvulina', 'ATF'] :
                        form.values.especificaciones.aplicacion === "Hidráulico" ? ['Hidráulico', 'PTO'] :
                          form.values.especificaciones.aplicacion === "Diferencial" ? ['Hipoide', 'No Hipoide'] : []
                  }
                  placeholder="Selecciona el tipo de aceite"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Viscosidad"

                  value={form.values.especificaciones.viscosidad}
                  placeholder="Ej: 15W40"
                  searchable
                  onChange={(e) => {
                    form.setValues({
                      especificaciones: {
                        ...form.values.especificaciones,
                        viscosidad: e,
                      }
                    });
                  }}
                  data={
                    form.values.especificaciones.aplicacion === "Motor"
                      ? [
                        '0W20', '0W30', '0W40', '0W50', '5W20', '5W30', '5W40', '5W50', '5W60',
                        '10W20', '10W30', '10W40', '10W50', '10W60', '15W20', '15W40', '15W50',
                        '15W60', '20W20', '20W40', '20W50', '20W60'
                      ]
                      : form.values.especificaciones.aplicacion === "Transmisión" &&
                        form.values.especificaciones.tipoAceite === "Valvulina"
                        ? [
                          // Valvulina monogrado
                          'SAE 80', 'SAE 85', 'SAE 90', 'SAE 140', 'SAE 250',
                          // Valvulina multigrado
                          '75W80', '75W85', '75W90', '80W90', '85W90', '85W140'
                        ]
                        : form.values.especificaciones.aplicacion === "Transmisión" &&
                          form.values.especificaciones.tipoAceite === "ATF"
                          ? [
                            'ATF Dexron III', 'ATF Dexron VI', 'ATF Mercon V', 'ATF Type F',
                            'ATF CVT', 'ATF DCT', 'ATF Dual Clutch'
                          ]
                          : form.values.especificaciones.aplicacion === "Hidráulico"
                            ? ['ISO 32', 'ISO 46', 'ISO 68', 'ISO 100', 'ISO 150', 'ISO 220', 'ISO 320', 'ISO 460', 'ISO 680', 'ISO 1000', 'PTO 134', 'PTO 136', 'PTO 137']
                            : form.values.especificaciones.aplicacion === "Diferencial"
                              ? ['75W90', '85W140', '80W90', 'SAE 90', 'SAE 140', 'SAE 250']
                              : []
                  }
                />
              </Grid.Col>
            </Grid>
          )}
          {tipoConsumible === 'Neumatico' && (
            <Grid>
              <Grid.Col span={6}>
                <Combobox
                  store={comboboxNeumaticos}
                  onOptionSubmit={(val) => {
                    const isNewMeasure = !medidasNeumaticos.includes(val);
                    if (isNewMeasure) {
                      handleCreateMedida(val);
                    }
                    form.setFieldValue('especificaciones.medida', val);
                    setSearchValueMedida(val);
                    comboboxNeumaticos.closeDropdown();
                  }}
                >
                  <Combobox.Target>
                    <TextInput
                      label="Medida del Neumático"
                      placeholder="Busca o crea una medida"
                      value={searchValueMedida}
                      onChange={(event) => {
                        let raw = event.currentTarget.value;
                        // Si el usuario presiona espacio
                        if (event.nativeEvent.inputType === 'insertText' && event.nativeEvent.data === ' ') {
                          // Si no hay /, lo pone después del primer grupo de números
                          if (!raw.includes('/')) {
                            raw = raw.replace(/^(\d{3,4})\s?/, '$1/');
                          }
                          // Si ya hay / pero no hay R, lo pone después del segundo grupo de números
                          else if (!raw.includes('R')) {
                            raw = raw.replace(/^(\d{3,4})\/(\d{2,3})\s?/, '$1/$2R');
                          }
                        }
                        // Elimina caracteres no permitidos excepto números, / y R
                        let value = raw.replace(/[^0-9/R]/g, '');
                        // Solo permite R después de un patrón válido
                        value = value.replace(/(\/\d{2,3})R?/, (m) => m.replace(/r/g, 'R'));
                        // Si el usuario escribe solo números, intenta formatear
                        if (/^\d{3,4}\d{2}\d{2,3}$/.test(value)) {
                          value = value.replace(/^(\d{3,4})(\d{2})(\d{2,3})$/, '$1/$2R$3');
                        }
                        setSearchValueMedida(value);
                        comboboxNeumaticos.openDropdown();
                        comboboxNeumaticos.updateSelectedOptionIndex('active');
                      }}
                      onFocus={() => comboboxNeumaticos.openDropdown()}
                      onBlur={() => {
                        const existingOption = medidasNeumaticos.find(m => m === searchValueMedida);
                        if (!existingOption) {
                          form.setFieldValue('especificaciones.medida', searchValueMedida);
                        }
                        comboboxNeumaticos.closeDropdown();
                      }}
                    />
                  </Combobox.Target>
                  <Combobox.Dropdown>
                    <Combobox.Options>
                      {optionsMedidas}
                      {showCreateOptionMedida && (
                        <Combobox.Option value={searchValueMedida}>
                          {`+ Añadir "${searchValueMedida}"`}
                        </Combobox.Option>
                      )}
                      {optionsMedidas.length === 0 && !showCreateOptionMedida && (
                        <Combobox.Empty>No hay medidas que coincidan</Combobox.Empty>
                      )}
                    </Combobox.Options>
                  </Combobox.Dropdown>
                </Combobox>
              </Grid.Col>
            </Grid>
          )}
          {tipoConsumible === 'Bateria' && (
            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="Nomenclatura"
                  placeholder="Ej: 75D23L"
                  {...form.getInputProps('especificaciones.nomenclatura')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Amperaje (A)"
                  placeholder="Ej: 750"
                  min={0}
                  {...form.getInputProps('especificaciones.amperaje')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Tipo de bornes"
                  placeholder="Ej: Normales, Invertidos"
                  {...form.getInputProps('especificaciones.bornes')}
                />
              </Grid.Col>
            </Grid>
          )}
          {['Bujia', 'Sensor', 'Correa', 'Filtro', 'Otro'].includes(tipoConsumible) && (
            <Box>
                <Title order={5} mb="md">Compatibilidad con Modelos y Atributos</Title>
                <MultiSelect
                    label="Selecciona Modelos"
                    placeholder="Elige los modelos compatibles"
                    data={modelos}
                    searchable
                    value={Object.keys(selectedModelosData)}
                    onChange={handleModelosChange}
                    disabled={isFetchingModels}
                />
                
                {isFetchingModels && <Loader size="sm" mt="md" />}
                
                {Object.entries(selectedModelosData).map(([modeloId, data]) => (
                    <Paper withBorder p="sm" mt="md" key={modeloId}>
                        <Text fw={500} mb="xs">
                            Atributos de {modelos.find(m => m.value === modeloId)?.label}
                        </Text>
                        <MultiSelect
                            label={`Atributos de tipo '${tipoConsumible}'`}
                            placeholder="Selecciona los atributos compatibles"
                            data={data.attributes}
                            value={data.selectedAttributes}
                            onChange={(selectedAttrs) => handleAttributeChange(modeloId, selectedAttrs)}
                            disabled={data.attributes.length === 0}
                        />
                         {data.attributes.length === 0 && <Text size="sm" c="dimmed" mt="xs">No se encontraron atributos compatibles.</Text>}
                    </Paper>
                ))}
            </Box>
          )}
          {tipoConsumible === 'Bateria' && (
            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="Nomenclatura"
                  placeholder="Ej: 75D23L"
                  {...form.getInputProps('especificaciones.nomenclatura')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Amperaje (A)"
                  placeholder="Ej: 750"
                  min={0}
                  {...form.getInputProps('especificaciones.amperaje')}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Tipo de bornes"
                  placeholder="Ej: Normales, Invertidos"
                  {...form.getInputProps('especificaciones.bornes')}
                />
              </Grid.Col>
            </Grid>
          )}

          {tipoConsumible === 'Manguera' && (
            <Textarea
              label="Notas de especificaciones"
              placeholder="Añade cualquier especificación adicional relevante."
              {...form.getInputProps('especificaciones.notas')}
            />
          )}

        </Stack>

        <Group justify="flex-end" mt="lg">
          <Button type="submit" loading={loading}>
            {isEditing ? 'Guardar Cambios' : 'Crear Consumible'}
          </Button>
        </Group>
      </form>
    </Box>
  );
}