'use client';
import { useState, useEffect } from 'react';
import { 
    Modal, Button, Select, NumberInput, Stack, Text, Group, 
    Loader, Alert, TextInput, Divider, MultiSelect 
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPackage, IconBarcode, IconCheck, IconPlus, IconSearch } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import ConsumibleForm from '@/app/superuser/inventario/components/ConsumibleForm';

// IMPORTAMOS TU FORMULARIO MAESTRO

export default function ModalInstallComponente({ opened, onClose, target, onSuccess, activoId }) {
    const [loading, setLoading] = useState(false);
    
    // --- LÓGICA DE BÚSQUEDA ---
    const [searchingStock, setSearchingStock] = useState(false);
    const [stockOptions, setStockOptions] = useState([]);
    const [selectedItemInfo, setSelectedItemInfo] = useState(null); 
    
    // --- LÓGICA DE SERIALES ---
    const [serialesValues, setSerialesValues] = useState([]);
    const [serialesData, setSerialesData] = useState([]); 
    const [searchValue, setSearchValue] = useState(''); // Para el MultiSelect

    // --- LÓGICA DE CREACIÓN RÁPIDA ---
    const [createModalOpened, setCreateModalOpened] = useState(false);

    const form = useForm({
        initialValues: {
            inventarioId: '',
            cantidad: 1,
            ubicacionFisica: '' 
        },
        validate: {
            inventarioId: (val) => !val ? 'Seleccione un producto' : null,
            cantidad: (val) => val <= 0 ? 'Cantidad inválida' : null,
        }
    });

    useEffect(() => {
        if (opened && target) {
            fetchStockCompatible();
            form.reset();
            setSelectedItemInfo(null);
            setSerialesValues([]);
            setSerialesData([]);
            form.setFieldValue('cantidad', target.rec.cantidad || 1); 
        }
    }, [opened, target]);

    const fetchStockCompatible = async () => {
        setSearchingStock(true);
        try {
            const res = await fetch(`/api/inventario/compatibles?recomendacionId=${target.rec.id}`);
            const result = await res.json();
            
            if (result.success) {
                const options = result.data.map(item => ({
                    ...item,
                    value: item.value.toString(), 
                    original: item 
                }));
                setStockOptions(options);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSearchingStock(false);
        }
    };

    const handleSelectChange = (val) => {
        form.setFieldValue('inventarioId', val);
        setSerialesValues([]);

        const selectedOption = stockOptions.find(o => o.value === val);
        
        if (selectedOption) {
            setSelectedItemInfo(selectedOption);
            
            // Preparamos data para MultiSelect
            if (selectedOption.serialesDisponibles?.length > 0) {
                const dataMantine = selectedOption.serialesDisponibles.map(s => ({
                    value: s.id.toString(), 
                    label: s.label 
                }));
                setSerialesData(dataMantine);
            } else {
                setSerialesData([]);
            }
        }
    };

    // --- CORRECCIÓN MANTINE 7: Lógica Creatable Manual ---
    const handleSerialesChange = (val) => {
        // 'val' es un array de strings (IDs o nuevos valores)
        setSerialesValues(val);
        
        // Si el usuario escribió un valor nuevo que no está en la data, lo agregamos
        // Mantine 7 permite valores fuera de la data si es creatable, pero debemos gestionar la data visual
        const newItems = val.filter(v => !serialesData.some(item => item.value === v));
        
        if (newItems.length > 0) {
            const nuevosObjetos = newItems.map(nv => ({ value: nv, label: nv })); // Usamos el texto como value y label
            setSerialesData(current => [...current, ...nuevosObjetos]);
        }

        form.setFieldValue('cantidad', val.length);
    };

    // --- INSTALACIÓN ESTÁNDAR ---
    const handleSubmit = async (values) => {
        await ejecutarInstalacion({
            inventarioId: values.inventarioId,
            cantidad: values.cantidad,
            ubicacionFisica: values.ubicacionFisica,
            // Procesamos los seriales para distinguir nuevos de existentes
            serialesSeleccionados: serialesValues.map(val => {
                // Si el valor es numérico (ID) y existe en la data original, es existente
                const esExistente = selectedItemInfo.serialesDisponibles.some(s => s.id.toString() === val);
                return { 
                    value: val, 
                    type: esExistente ? 'existing' : 'new' 
                };
            })
        });
    };

    // --- FUNCIÓN CENTRAL DE INSTALACIÓN ---
    const ejecutarInstalacion = async (payloadBase) => {
        setLoading(true);
        try {
            const payload = {
                activoId,
                subsistemaInstanciaId: target.sub.id,
                recomendacionId: target.rec.id,
                ...payloadBase
            };

            const res = await fetch('/api/gestionMantenimiento/componentes/instalar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.success) {
                notifications.show({ title: 'Instalación Exitosa', message: 'Componentes registrados y asignados.', color: 'green' });
                onSuccess(); // Refrescar página
                onClose();   // Cerrar todo
            } else {
                throw new Error(result.error || 'Error al instalar');
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    // --- CREACIÓN RÁPIDA: PUENTE ENTRE CREAR E INSTALAR ---
    // --- CREACIÓN RÁPIDA: PUENTE ENTRE CREAR E INSTALAR ---
    const handleSuccessCreate = (newConsumible) => {
        console.log("Respuesta API Crear:", newConsumible); // Para depuración
        setCreateModalOpened(false); 

        // 1. Detectamos si es serializado
        // A veces la API devuelve "Serializado" (capitalizado) o "serializado", aseguramos con toLowerCase
        const tipo = newConsumible.tipo ? newConsumible.tipo.toLowerCase() : 'fungible';
        const esSerializado = tipo === 'serializado';
        
        let serialesPayload = [];

        if (esSerializado) {
            // --- AQUÍ ESTABA EL ERROR ---
            // El backend suele devolver la relación con el alias del modelo ('serializados')
            // El form usa 'itemsSerializados'. Intentamos leer ambos por seguridad.
            const listaDeSeriales = newConsumible.serializados || newConsumible.itemsSerializados || [];

            if (listaDeSeriales.length > 0) {
                serialesPayload = listaDeSeriales.map(s => ({
                    value: s.id,     // ID de base de datos (vital para type: 'existing')
                    type: 'existing' // Como se acaban de crear en BD, ya son "existentes" en almacén
                }));
            } else {
                console.warn("Alerta: El item es serializado pero no se detectaron seriales en la respuesta.", newConsumible);
            }
        }

        // 2. Ejecutamos la instalación
        ejecutarInstalacion({
            inventarioId: newConsumible.id,
            // Si es serializado usamos el largo del array, si no, el stock total
            cantidad: esSerializado ? serialesPayload.length : newConsumible.stockAlmacen,
            ubicacionFisica: 'Instalación Inmediata (Ingreso Rápido)',
            serialesSeleccionados: serialesPayload
        });
    };

    if (!target) return null;
    const esSerializado = selectedItemInfo?.serialesDisponibles !== undefined;

    return (
        <>
            <Modal 
                opened={opened} 
                onClose={onClose} 
                title={`Instalar: ${target.rec.label}`} 
                centered
                size="lg"
            >
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack>
                        <Alert icon={<IconPackage size={16}/>} color="blue" variant="light">
                           Instalando en <b>{target.sub.nombre}</b>. 
                           Requerido: <b>{target.rec.cantidad}</b>.
                        </Alert>

                        {/* SELECTOR DE PRODUCTO + BOTÓN CREAR */}
                        <Group align="flex-end" grow>
                             {searchingStock ? (
                                <Group justify="center" py="xs"><Loader size="sm" type="dots" /></Group>
                            ) : (
                                <Select
                                    label="Producto del Inventario"
                                    placeholder="Buscar pieza..."
                                    data={stockOptions}
                                    searchable
                                    {...form.getInputProps('inventarioId')}
                                    onChange={handleSelectChange}
                                    nothingFoundMessage="No encontrado"
                                />
                            )}
                            <Button 
                                variant="light" 
                                color="teal" 
                                leftSection={<IconPlus size={16}/>}
                                onClick={() => setCreateModalOpened(true)}
                                style={{ flexGrow: 0 }} // Para que no ocupe todo el ancho
                            >
                                Crear Nuevo
                            </Button>
                        </Group>

                        {selectedItemInfo && (
                            <>
                                {esSerializado ? (
                                    // CORRECCIÓN MULTISELECT MANTINE 7
                                    <MultiSelect
                                        label={`Seleccionar Seriales (${serialesValues.length} seleccionados)`}
                                        placeholder="Seleccione o escriba..."
                                        data={serialesData}
                                        value={serialesValues}
                                        onChange={handleSerialesChange}
                                        searchable
                                        searchValue={searchValue}
                                        onSearchChange={setSearchValue}
                                        nothingFoundMessage={
                                            searchValue.length > 0 
                                            ? `Presiona Enter para agregar "${searchValue}" como nuevo` 
                                            : "Sin resultados"
                                        }
                                        creatable
                                        getCreateLabel={(query) => `+ Agregar Nuevo: ${query}`}
                                        leftSection={<IconBarcode size={16}/>}
                                        hidePickedOptions
                                        clearable
                                        checkIconPosition="right"
                                    />
                                ) : (
                                    <NumberInput
                                        label="Cantidad a Instalar"
                                        min={0.1}
                                        max={selectedItemInfo.stockActual} 
                                        {...form.getInputProps('cantidad')}
                                    />
                                )}

                                <TextInput 
                                    label="Ubicación Física"
                                    placeholder="Ej: Lado derecho"
                                    {...form.getInputProps('ubicacionFisica')}
                                />
                            </>
                        )}

                        <Divider />
                        <Button 
                            type="submit" 
                            loading={loading} 
                            fullWidth 
                            leftSection={<IconCheck size={18}/>}
                            disabled={!form.values.inventarioId}
                        >
                            Confirmar Instalación
                        </Button>
                    </Stack>
                </form>
            </Modal>

            {/* MODAL PARA CREAR NUEVO CONSUMIBLE + SERIALES */}
            <Modal
                opened={createModalOpened}
                onClose={() => setCreateModalOpened(false)}
                title="Crear y Asignar Consumible"
                size="xl"
                centered
            >
                <Alert color="green" mb="md">
                    El consumible que crees aquí se <b>instalará automáticamente</b> en el activo seleccionado.
                </Alert>
                
                {/* REUTILIZAMOS TU FORMULARIO MAESTRO */}
                <ConsumibleForm
                    onSuccess={handleSuccessCreate}
                    onCancel={() => setCreateModalOpened(false)}
                    // Pre-llenamos datos según lo que pedía la recomendación del activo
                   
                />
            </Modal>
        </>
    );
}

// Helper simple para pre-seleccionar el tipo en el formulario nuevo
function mapearCategoriaATipo(categoria) {
    const cat = categoria?.toLowerCase() || '';
    if (cat.includes('filtro')) return 'Filtro';
    if (cat.includes('aceite')) return 'Aceite';
    if (cat.includes('bateria')) return 'Bateria';
    if (cat.includes('neumatico') || cat.includes('caucho')) return 'Neumatico';
    if (cat.includes('correa')) return 'Correa';
    return '';
}