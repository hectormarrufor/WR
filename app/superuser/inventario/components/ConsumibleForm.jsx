'use client';

import { useState, useEffect } from 'react';
import {
    Stack, Select, TextInput, NumberInput,
    Button, Group, Text, Divider, Alert, LoadingOverlay,
    SimpleGrid,
    Paper,
    Checkbox
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconInfoCircle, IconLink, IconTrash } from '@tabler/icons-react';

// Importamos el componente de inputs serializados
import SerializadosInputs from './SerializadosInputs';
import { AsyncCatalogComboBox } from '@/app/components/CatalogCombobox';
import ImageDropzone from '../../flota/activos/components/ImageDropzone';
import ModalEquivalencias from '../consumibles/nuevo/ModalEquivalencias';

export default function ConsumibleForm({ onSuccess, onCancel, initialValues = null, isEdit = false, onSubmit=null }) {
    const [loading, setLoading] = useState(false);

    // Control de UI
    const [tipoEspecifico, setTipoEspecifico] = useState('Filtro'); // Default
    const [esSerializado, setEsSerializado] = useState(false);
    const [showEquivalencias, setShowEquivalencias] = useState(false);
    const [equivalenciaSeleccionada, setEquivalenciaSeleccionada] = useState(null); // Guardará el ID y Nombre

    // Configuración del Formulario Maestro
    const form = useForm({
        initialValues: {
            nombre: '',         // Se generará auto o manual
            marca: '',
            modelo: '',
            stockMinimo: 5,
            stockAlmacen: 0,
            categoria: '',
            precioPromedio: 0.0,

            // Lógica Serializados
            clasificacion: 'Serializado', // 'Fungible' | 'Serializado'
            unidadMedida: 'unidades', // Valor por defecto
            itemsSerializados: [],     // Array de objetos { serial: '...' }

            //CAMPO COMÚN
            codigo: '',
            tipo: '',

            // CAMPOS ESPECÍFICOS (Todos conviven aquí)
            // Filtros
            posicion: 'Primario',
            imagen: '',
            equivalencias: [],
            // Aceites
            viscosidad: '', // O id de viscosidad si usas relación
            aplicacion: '',
            // Correas
            // Baterias (Ejemplo de algo serializado por defecto)
            amperaje: 800,
            voltaje: 12,
            capacidad: 60,
            // Neumáticos
            medida: '',
            esTubeless: false,
            esRecauchable: false,
            //Sensores
            // Mangueras
            diametro: '',
            longitud: '', // Ahora será tratada numéricamente
            conectores: ''
        },
        validate: {
            itemsSerializados: (val, values) => {
                if (values.clasificacion === 'Serializado' && val.some(i => !i.serial)) {
                    return 'Todos los seriales son obligatorios';
                }
                return null;
            }
        }
    });

    // --- NUEVO: EFECTO PARA CARGAR DATOS EN EDICIÓN ---
    useEffect(() => {
        if (initialValues) {
            // 1. Establecer valores del formulario
            form.setValues(initialValues);

            // 2. Restaurar estado de Tipo Específico (para mostrar inputs correctos)
            if (initialValues.tipoSpecifico) {
                setTipoEspecifico(initialValues.tipoSpecifico);
            }

            // 3. Restaurar estado Serializado
            const esSerial = initialValues.tipo === 'Serializado';
            setEsSerializado(esSerial);

            // 4. Restaurar Equivalencia (si existe en los datos técnicos del filtro)
            if (initialValues.datosTecnicos?.grupoEquivalenciaId) {
                // Simulamos el objeto para visualización, ya que el select espera un objeto
                setEquivalenciaSeleccionada({
                    id: initialValues.datosTecnicos.grupoEquivalenciaId,
                    nombre: `Grupo Existente` // O el nombre real si lo traes en initialValues
                });
            }
        }
    }, [initialValues]);

    useEffect(() => {
        // Solo ejecutamos lógica automática si NO estamos cargando datos iniciales (para evitar sobrescribir)
        // O si el usuario cambia manualmente el tipo específico
        if (initialValues && initialValues.tipoSpecifico === tipoEspecifico) return;

        if (['Bateria', 'Neumatico'].includes(tipoEspecifico)) {
            setEsSerializado(true);
            form.setFieldValue('clasificacion', 'Serializado');
            // En edición, no queremos reiniciar el stock a 1 si ya tiene valor
            if (!isEdit) form.setFieldValue('stockAlmacen', 1);
        } else {
            setEsSerializado(false);
            form.setFieldValue('clasificacion', 'Fungible');
        }
    }, [tipoEspecifico]);

    useEffect(() => {
        if (form.values.clasificacion === 'Serializado') {
            // Si es serializado, FORZAMOS que sea Unidad
            form.setFieldValue('unidadMedida', 'unidades');
        }
    }, [form.values.clasificacion]);

    // Efecto para ajustar la categoria del consumible según el tipo específico
    useEffect(() => {
        // Evitar sobrescribir categoría al cargar edición
        if (isEdit && initialValues && form.values.categoria === initialValues.categoria) return;

        if (tipoEspecifico === 'Filtro') {
            form.setFieldValue('categoria', form.values.tipo ? `filtro de ${form.values.tipo.toLowerCase()}` : '');
            if (!isEdit) form.setFieldValue('unidadMedida', 'unidades');
        } else {
            const categoriaMap = {
                'Aceite': 'aceite',
                'Bateria': 'bateria',
                'Neumatico': 'neumatico',
                'Correa': 'correa',
                'Gasoil': 'gasoil',
                'Manguera': 'manguera' 
            };
            if (tipoEspecifico === "Aceite" && !isEdit) {
                form.setFieldValue('unidadMedida', 'litros');
            }
            if ((tipoEspecifico === "Correa" || tipoEspecifico === "Sensor" || tipoEspecifico === "Manguera") && !isEdit) {
                form.setFieldValue('unidadMedida', 'unidades');
            }
            if (tipoEspecifico === "Gasoil" && !isEdit) {
                form.setFieldValue('unidadMedida', 'litros');
            }
            if (tipoEspecifico === "Bateria" && !isEdit) {
                form.setFieldValue('unidadMedida', 'unidades');
            }

            form.setFieldValue('categoria', categoriaMap[tipoEspecifico] || '');
        }

    }, [tipoEspecifico, form.values.tipo]);

    const handleConfirmEquivalencia = (selectedFilters) => {
        const filtro = selectedFilters[0]; 

        if (filtro) {
            setEquivalenciaSeleccionada({
                id: filtro.grupoEquivalenciaId || filtro.id, 
                nombre: `${filtro.marca} ${filtro.codigo}`,
                esNuevoGrupo: !filtro.grupoEquivalenciaId, 
                sugerenciaNombreGrupo: `Grupo para ${filtro.marca} ${filtro.codigo}`
            });
            setShowEquivalencias(false);
        }
    };

    const handleSubmit = async (values) => {
        setLoading(true);

        try {
            // 1. GENERACIÓN DE NOMBRE Y DATOS TÉCNICOS
            let nombreGenerado = '';
            let datosTecnicos = {};

            if (tipoEspecifico === 'Filtro') {
                nombreGenerado = `${values.categoria} ${values.marca} ${values.codigo}`;
                datosTecnicos = {
                    marca: values.marca, 
                    tipo: values.tipo?.toLowerCase(),
                    codigo: values.codigo, 
                    posicion: values.posicion?.toLowerCase(),
                    imagen: values.imagen,
                    equivalenciaSeleccionada: equivalenciaSeleccionada || null,
                };
            }
            else if (tipoEspecifico === 'Aceite') {
                nombreGenerado = `Aceite ${values.aplicacion} ${values.marca} ${values.viscosidad} ${values.tipoAceite}`;
                datosTecnicos = {
                    marca: values.marca,
                    modelo: values.modelo,
                    tipoBase: values.tipoAceite, 
                    viscosidad: values.viscosidad,
                    aplicacion: values.aplicacion?.toLowerCase(),
                };
            }
            else if (tipoEspecifico === 'Bateria') {
                nombreGenerado = `Batería ${values.marca} Gr.${values.codigo} ${values.amperaje}CCA`;
                datosTecnicos = {
                    marca: values.marca,
                    codigo: values.codigo, 
                    amperaje: values.amperaje,
                    voltaje: values.voltaje,
                    capacidad: values.capacidad
                };
            }
            else if (tipoEspecifico === 'Neumatico') {
                nombreGenerado = `Neumático ${values.marca} ${values.modelo} ${values.medida}`;
                datosTecnicos = {
                    marca: values.marca,
                    modelo: values.modelo,
                    medida: values.medida,
                    esTubeless: values.esTubeless,
                    esRecauchable: values.esRecauchable
                };
            }
            else if (tipoEspecifico === 'Correa') {
                nombreGenerado = `Correa ${values.marca} ${values.codigo}`;
                datosTecnicos = {
                    marca: values.marca,
                    codigo: values.codigo
                };
            }
            // 🔥 LÓGICA MANGUERA REVISADA PARA FORMATO DE NOMBRE
            else if (tipoEspecifico === 'Manguera') {
                nombreGenerado = `Manguera ${values.diametro}" x ${values.longitud}cm ${values.conectores ? `(${values.conectores})` : ''}`.trim();
                datosTecnicos = {
                    diametro: values.diametro,
                    longitud: values.longitud,
                    conectores: values.conectores
                };
            }
          
            const nombreFinal = nombreGenerado || values.nombre;

            // 2. PREPARAR PAYLOAD
            const payload = {
                nombre: nombreFinal,
                tipo: values.clasificacion.toLowerCase(), 
                categoria: values.categoria,
                stockAlmacen: values.clasificacion === 'Serializado' ? values.itemsSerializados.length : values.stockAlmacen,
                stockMinimo: values.stockMinimo,
                unidadMedida: values.unidadMedida,
                precioPromedio: values.precioPromedio,
                tipoSpecifico: tipoEspecifico, 
                datosTecnicos: datosTecnicos,
                itemsSerializados: values.itemsSerializados 
            };

            // SUBIDA DE IMAGEN
            if (datosTecnicos.imagen && typeof datosTecnicos.imagen.arrayBuffer === 'function') {
                notifications.show({ id: 'uploading-image', title: 'Subiendo imagen...', message: 'Por favor espera.', loading: true });
                const imagenFile = datosTecnicos.imagen;
                const fileExtension = imagenFile.name.split('.').pop();
                const uniqueFilename = `${values.marca}${datosTecnicos.codigo}.${fileExtension}`.replace(/\s+/g, '_');

                const response = await fetch(`/api/upload?filename=${encodeURIComponent(uniqueFilename)}`, {
                    method: 'POST',
                    body: imagenFile,
                });

                if (!response.ok) console.log('Falló la subida o ya existe.');
                payload.datosTecnicos.imagen = uniqueFilename;
                notifications.update({ id: 'uploading-image', title: 'Éxito', message: 'Imagen lista.', color: 'green' });
            }

            // 3. DECISIÓN: EDITAR (onSubmit prop) o CREAR (fetch interno)
            if (isEdit && onSubmit) {
                await onSubmit(payload);
            } else {
                const response = await fetch('/api/inventario/consumibles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const res = await response.json();

                if (res.success) {
                    notifications.show({ title: 'Éxito', message: 'Consumible creado', color: 'green' });
                    if (onSuccess) onSuccess(res.data);
                } else {
                    throw new Error(res.error || 'Error al guardar');
                }
            }

        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const tipoCatalogo = {
        'Aceite': 'aceite',
        'Bateria': 'bateria',
        'Neumatico': 'neumatico',
        'Correa': 'correa',
        'Filtro': 'filtro',
        'Gasoil': 'gasoil'
    }[tipoEspecifico] || 'general';

    const tipoFiltro = {
        'Aceite': 'filtroAceite',
        'Aire': 'filtroAire',
        'Combustible': 'filtroCombustible'
    }[form.values.tipo] || 'filtroAceite';


    return (
        <Stack pos="relative">
            <LoadingOverlay visible={loading} />

            <SimpleGrid cols={2} breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
                <Select
                    label="Tipo de consumible"
                    data={['Filtro', 'Gasoil', 'Aceite', 'Bateria', 'Correa', 'Neumatico', 'Manguera']}
                    value={tipoEspecifico}
                    onChange={(val) => {
                        setTipoEspecifico(val);
                        form.reset();
                    }}
                    allowDeselect={false}
                    disabled={isEdit} 
                />
                <Select
                    label="Unidad de Medida"
                    disabled={esSerializado}
                    data={['unidades', 'litros', 'kilogramos', 'metros', 'galones']}
                    value={form.values.unidadMedida}
                    onChange={(val) => form.setFieldValue('unidadMedida', val)}
                />
                <Select
                    label="Clasificación"
                    disabled
                    data={['Fungible', 'Serializado']}
                    value={form.values.clasificacion}
                    onChange={(val) => {
                        setEsSerializado(val === 'Serializado');
                        form.setFieldValue('clasificacion', val);
                        if (val === 'Serializado') form.setFieldValue('stockAlmacen', 1);
                    }}
                />
            </SimpleGrid>

            <Divider />

            <form onSubmit={(e) => { e.stopPropagation(); form.onSubmit(handleSubmit)(e); }}>
                <Stack gap="md">

                    {/* --- DATOS COMUNES --- */}
                    {tipoEspecifico !== 'Gasoil' && tipoEspecifico !== 'Manguera' && (
                    <Group grow>
                        <AsyncCatalogComboBox
                            key={tipoCatalogo}
                            label="Marca"
                            placeholder="Selecciona una marca"
                            fieldKey="marca"
                            form={form}
                            catalogo="marcas"
                            tipo={tipoCatalogo}
                        />
                    </Group>
                    )}

                    {/* CASO: MANGUERA 🔥 (Nuevos inputs con estandarización) */}
                    {tipoEspecifico === 'Manguera' && (
                        <Group grow align="flex-start">
                            <TextInput 
                                label="Diámetro" 
                                placeholder="Ej: 1/2, 5/8, 1" 
                                rightSection={<Text size="xs" c="dimmed" mr="xs">pulg.</Text>} 
                                {...form.getInputProps('diametro')} 
                            />
                            <NumberInput 
                                label="Longitud" 
                                placeholder="Ej: 150" 
                                suffix=" cm" 
                                min={1} 
                                {...form.getInputProps('longitud')} 
                            />
                            <TextInput 
                                label="Conectores (Opcional)" 
                                placeholder="Ej: Recto JIC x Curvo 90°" 
                                {...form.getInputProps('conectores')} 
                            />
                        </Group>
                    )}

                    {/* CASO: FILTRO */}
                    {tipoEspecifico === 'Filtro' && (
                        <>
                            <Group grow>
                                <Select label="Función" placeholder="seleccione un tipo" data={['Aceite', 'Aire', 'Combustible']} {...form.getInputProps('tipo')} />
                                <AsyncCatalogComboBox
                                    key={tipoFiltro}
                                    disabled={!form.values.categoria}
                                    label="Código"
                                    placeholder="Ej. WF1036"
                                    fieldKey="codigo"
                                    form={form}
                                    catalogo="codigos"
                                    tipo={tipoFiltro}
                                />
                                <Select label="Posición" data={['Primario', 'Secundario']} {...form.getInputProps('posicion')} />
                                <ImageDropzone
                                    label="Imagen del Filtro" form={form} fieldPath="imagen"
                                />

                            </Group>
                            <Paper withBorder p="md" bg="gray.0">
                                <Text size="sm" fw={500} mb="xs">Equivalencias</Text>

                                {equivalenciaSeleccionada ? (
                                    <Group justify="space-between">
                                        <Group>
                                            <IconLink size={18} color="blue" />
                                            <Text size="sm">
                                                Vinculado con: <b>{equivalenciaSeleccionada.nombre}</b>
                                            </Text>
                                        </Group>
                                        <Button
                                            color="red" variant="subtle" size="xs"
                                            onClick={() => setEquivalenciaSeleccionada(null)}
                                        >
                                            <IconTrash size={16} />
                                        </Button>
                                    </Group>
                                ) : (
                                    <Group>
                                        <Alert variant="light" color="blue" title="¿Es igual a otro?" icon={<IconLink size={16} />} style={{ flex: 1 }}>
                                            Si este filtro es equivalente a uno existente (ej. WIX vs Millard), vincúlalos.
                                        </Alert>
                                        <Button variant="white" onClick={() => setShowEquivalencias(true)}>
                                            Buscar Equivalente
                                        </Button>
                                    </Group>
                                )}
                            </Paper>
                        </>
                    )}

                    {/* CASO: ACEITE */}
                    {tipoEspecifico === 'Aceite' && (
                        <Group grow>
                            <AsyncCatalogComboBox
                                label="Modelo"
                                placeholder="X-cess 8100"
                                fieldKey="modelo"
                                form={form}
                                catalogo="modelos"
                                tipo={tipoCatalogo}
                            />
                            <AsyncCatalogComboBox
                                label="Viscosidad"
                                placeholder="Ej. 15W-40"
                                fieldKey="viscosidad"
                                form={form}
                                catalogo="viscosidades"
                                tipo='motor'
                            />
                            <Select label="Base" data={['mineral', 'sintético', 'semi']} {...form.getInputProps('tipoAceite')} />
                            <Select label="Aplicación" data={['motor', 'hidraulico']} {...form.getInputProps('aplicacion')} />
                        </Group>
                    )}

                    {/* CASO: BATERÍA */}
                    {tipoEspecifico === 'Bateria' && (
                        <Group grow>
                            <AsyncCatalogComboBox
                                label="Grupo/Código"
                                placeholder="Ej. 24F"
                                fieldKey="codigo"
                                form={form}
                                catalogo="codigos"
                                tipo="bateria"
                            />
                            <NumberInput label="CCA (Arranque)" suffix=" A" {...form.getInputProps('amperaje')} />
                            <NumberInput label="Capacidad" suffix=" Ah" {...form.getInputProps('capacidad')} />
                            <NumberInput label="Voltaje" suffix=" V" {...form.getInputProps('voltaje')} />
                        </Group>
                    )}

                    {/* CASO: NEUMÁTICO */}
                    {tipoEspecifico === 'Neumatico' && (
                        <Group grow>
                            <AsyncCatalogComboBox label="Modelo" fieldKey="modelo" form={form} catalogo="modelos" tipo="neumatico" />
                            <AsyncCatalogComboBox label="Medida" fieldKey="medida" form={form} catalogo="medida-neumaticos" />
                            <Checkbox label="¿Neumático con cámara?" {...form.getInputProps('esTubeless', { type: 'checkbox' })} />
                            <Checkbox label="¿Neumático recauchable?" {...form.getInputProps('esRecauchable', { type: 'checkbox' })} />
                            
                        </Group>
                    )}

                    {/* CASO: CORREA */}
                    {tipoEspecifico === 'Correa' && (
                        <Group grow>
                            <TextInput label="Código/Medida" placeholder="6PK2240" {...form.getInputProps('codigo')} />
                        </Group>
                    )}

                    {/* CASO: GASOIL */}
                    {tipoEspecifico === 'Gasoil' && (
                        <Group grow>
                            <TextInput label="Nombre" placeholder="Gasoil (Tanque Principal)" {...form.getInputProps('nombre')} />
                        </Group>
                    )}

                    <Divider label="Inventario" labelPosition="center" />
                    <NumberInput
                        label="Precio Promedio Unitario"
                        min={0}
                        precision={2}
                        step={0.01}
                        prefix="$"
                        {...form.getInputProps('precioPromedio')}
                    />
                    <NumberInput
                        label="Stock Mínimo"
                        min={0}
                        {...form.getInputProps('stockMinimo')}
                    />
                    <NumberInput
                        label={esSerializado ? "Cantidad a Ingresar (Unidades)" : "Stock Almacen"}
                        min={esSerializado ? 1 : 0}
                        disabled={isEdit && !esSerializado} 
                        {...form.getInputProps('stockAlmacen')}
                    />

                    {esSerializado && (
                        <>
                            <Alert variant="light" color="blue" title="Detalle de Seriales" icon={<IconInfoCircle size={16} />}>
                                {isEdit ? "Gestione los seriales existentes." : "Ingrese los datos únicos de cada unidad."}
                            </Alert>

                            <SerializadosInputs
                                cantidad={form.values.stockAlmacen}
                                values={form.values.itemsSerializados}
                                form={form}
                                onChange={(newItems) => form.setFieldValue('itemsSerializados', newItems)}
                                esRecauchable={form.values.esRecauchable}
                            />
                        </>
                    )}

                    <Group justify="right" mt="xl">
                        {onCancel && <Button variant="default" onClick={onCancel} type="button">Cancelar</Button>}
                        <Button type="submit" leftSection={<IconDeviceFloppy size={18} />}>
                            {isEdit ? 'Actualizar Repuesto' : 'Guardar Repuesto'}
                        </Button>
                    </Group>
                </Stack>
            </form>
            <ModalEquivalencias
                open={showEquivalencias}
                onClose={() => setShowEquivalencias(false)}
                tipo={form.values.tipo.toLocaleLowerCase()}
                onConfirm={handleConfirmEquivalencia}
                initialSelected={equivalenciaSeleccionada ? [equivalenciaSeleccionada.id] : []}
            />
        </Stack>
    );
}