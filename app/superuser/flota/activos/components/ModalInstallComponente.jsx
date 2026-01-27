'use client';
import { useState, useEffect } from 'react';
import {
    Modal, Button, Select, NumberInput, Stack, Text, Group,
    Loader, Alert, TextInput, Divider, MultiSelect, ScrollArea, Paper
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPackage, IconBarcode, IconCheck, IconPlus, IconMapPin } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import ConsumibleForm from '@/app/superuser/inventario/components/ConsumibleForm';

export default function ModalInstallComponente({ opened, onClose, target, onSuccess, activoId }) {
    const [loading, setLoading] = useState(false);

    // --- BÚSQUEDA Y DATOS ---
    const [searchingStock, setSearchingStock] = useState(false);
    const [stockOptions, setStockOptions] = useState([]);
    const [selectedItemInfo, setSelectedItemInfo] = useState(null);

    // --- LÓGICA DE SERIALES ---
    const [serialesValues, setSerialesValues] = useState([]); // Lo que está seleccionado
    const [serialesData, setSerialesData] = useState([]);     // La lista de opciones disponibles (BD + Nuevos)
    const [searchValue, setSearchValue] = useState('');       // Texto del buscador

    // --- UBICACIONES DINÁMICAS ---
    const [ubicacionesMap, setUbicacionesMap] = useState({});

    const [createModalOpened, setCreateModalOpened] = useState(false);

    const form = useForm({
        initialValues: {
            inventarioId: '',
            cantidad: 1,
            ubicacionFisicaGlobal: ''
        },
        validate: {
            inventarioId: (val) => !val ? 'Seleccione un producto' : null,
            cantidad: (val) => val <= 0 ? 'Cantidad inválida' : null,
        }
    });

    // Limpieza al abrir
    useEffect(() => {
        if (opened && target) {
            fetchStockCompatible();
            form.reset();
            setSelectedItemInfo(null);
            setSerialesValues([]);
            setSerialesData([]);
            setUbicacionesMap({});
            setSearchValue('');
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
        } catch (error) { console.error(error); }
        finally { setSearchingStock(false); }
    };

    const handleSelectChange = (val) => {
        form.setFieldValue('inventarioId', val);
        setSerialesValues([]);
        setUbicacionesMap({});
        setSearchValue('');

        const selectedOption = stockOptions.find(o => o.value === val);

        if (selectedOption) {
            setSelectedItemInfo(selectedOption);

            // Si hay seriales en BD los cargamos, si no, array vacío listo para recibir nuevos
            if (selectedOption.serialesDisponibles?.length > 0) {
                setSerialesData(selectedOption.serialesDisponibles.map(s => ({
                    value: s.id.toString(),
                    label: s.label
                })));
            } else {
                setSerialesData([]);
            }
        }
    };

    // --- CLAVE: Lógica para permitir múltiples nuevos seriales ---
    const handleSerialesChange = (val) => {
        // 1. Detectar si hay valores nuevos que no estaban en la data
        const newItems = val.filter(v => !serialesData.some(item => item.value === v));

        // 2. Si hay nuevos, agregarlos a la data persistente para que el MultiSelect no los borre
        if (newItems.length > 0) {
            const nuevosObjetos = newItems.map(nv => ({ value: nv, label: nv }));
            setSerialesData(current => [...current, ...nuevosObjetos]);
        }

        // 3. Actualizar selección
        setSerialesValues(val);
        form.setFieldValue('cantidad', val.length);

        // 4. IMPORTANTE: Limpiar el buscador para permitir escribir el siguiente inmediatamente
        setSearchValue('');
    };

    const handleUbicacionChange = (serialValue, textoUbicacion) => {
        setUbicacionesMap(prev => ({
            ...prev,
            [serialValue]: textoUbicacion
        }));
    };

    const handleSubmit = async (values) => {
        // Validación de ubicaciones para serializados
        if (esSerializado) {
            const faltantes = serialesValues.some(val => !ubicacionesMap[val] || ubicacionesMap[val].trim() === '');
            if (faltantes) {
                return notifications.show({ message: 'Indica la posición de cada serial (ej: Delantero Izq)', color: 'red' });
            }
        }

        await ejecutarInstalacion({
            inventarioId: values.inventarioId,
            cantidad: values.cantidad,
            ubicacionFisica: values.ubicacionFisicaGlobal,
            serialesSeleccionados: serialesValues.map(val => {
                const esExistente = selectedItemInfo.serialesDisponibles?.some(s => s.id.toString() === val);
                return {
                    value: val,
                    type: esExistente ? 'existing' : 'new',
                    ubicacion: ubicacionesMap[val]
                };
            })
        });
    };

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
                notifications.show({ title: 'Éxito', message: 'Instalación registrada', color: 'green' });
                onSuccess(); onClose();
            } else { throw new Error(result.error); }
        } catch (error) { notifications.show({ title: 'Error', message: error.message, color: 'red' }); }
        finally { setLoading(false); }
    };

    const handleSuccessCreate = (newConsumible) => {
        setCreateModalOpened(false);
        const tipo = newConsumible.tipo ? newConsumible.tipo.toLowerCase() : 'fungible';
        const esSerial = tipo === 'serializado';

        let serialesPayload = [];
        if (esSerial) {
            const lista = newConsumible.serializados || newConsumible.itemsSerializados || [];
            serialesPayload = lista.map(s => ({
                value: s.id,
                type: 'existing',
                ubicacion: 'Instalación Rápida' // Valor por defecto si vienes de crear masivo
            }));
        }

        ejecutarInstalacion({
            inventarioId: newConsumible.id,
            cantidad: esSerial ? serialesPayload.length : newConsumible.stockAlmacen,
            ubicacionFisica: 'Instalación Rápida',
            serialesSeleccionados: serialesPayload
        });
    };

    if (!target) return null;
    const esSerializado = selectedItemInfo?.serialesDisponibles !== undefined || selectedItemInfo?.original?.tipo === 'serializado';

    return (
        <>
            <Modal opened={opened} onClose={onClose} title={`Instalar: ${target.rec.label}`} centered size="lg">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack>
                        <Alert icon={<IconPackage size={16} />} color="blue" variant="light">
                            Requerido: <b>{target.rec.cantidad}</b> en <b>{target.sub.nombre}</b>.
                        </Alert>

                        <Group align="flex-end" grow>
                            {searchingStock ? <Loader size="sm" /> : (
                                <Select
                                    label="Producto" placeholder="Buscar..." data={stockOptions} searchable
                                    {...form.getInputProps('inventarioId')} onChange={handleSelectChange}
                                />
                            )}
                            <Button variant="light" color="teal" leftSection={<IconPlus size={16} />} onClick={() => setCreateModalOpened(true)} style={{ flexGrow: 0 }}>
                                Crear Nuevo
                            </Button>
                        </Group>

                        {selectedItemInfo && (
                            <>
                                {esSerializado ? (
                                    <>
                                        <MultiSelect
                                            label="Seleccionar Seriales"
                                            description="Si no existe, escríbelo y presiona Enter."
                                            placeholder="Escribe serial..."
                                            data={serialesData}
                                            value={serialesValues}
                                            onChange={handleSerialesChange}

                                            // Configuración CRÍTICA para que funcione bien al crear varios
                                            searchable
                                            searchValue={searchValue}
                                            onSearchChange={setSearchValue}
                                            creatable
                                            getCreateLabel={(query) => `+ Agregar Nuevo: ${query}`}
                                            nothingFoundMessage={searchValue.length > 0 ? "Presiona Enter para crear" : "Sin resultados"}
                                            hidePickedOptions
                                            checkIconPosition="right"
                                            clearable
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault(); // 1. DETIENE EL SUBMIT DEL FORMULARIO
                                                    e.stopPropagation(); // 2. EVITA QUE EL EVENTO SUBA

                                                    // 3. AGREGAMOS MANUALMENTE EL VALOR (Para asegurar que entre)
                                                    // Si hay texto escrito y no está vacío...
                                                    if (searchValue && searchValue.trim().length > 0) {
                                                        const nuevoValor = searchValue.trim();

                                                        // Solo agregamos si no está ya seleccionado
                                                        if (!serialesValues.includes(nuevoValor)) {
                                                            handleSerialesChange([...serialesValues, nuevoValor]);
                                                        }
                                                    }
                                                }
                                            }}
                                        />

                                        {/* ZONA DE UBICACIONES - Aparece automáticamente al seleccionar */}
                                        {serialesValues.length > 0 && (
                                            <Paper withBorder p="sm" bg="gray.0">
                                                <Text size="sm" fw={700} mb="xs" c="dimmed">UBICACIONES FÍSICAS:</Text>
                                                <ScrollArea.Autosize mah={250}>
                                                    <Stack gap="xs">
                                                        {serialesValues.map((val) => {
                                                            // Intentamos mostrar el nombre amigable si existe
                                                            const itemData = serialesData.find(d => d.value === val);
                                                            const label = itemData ? itemData.label : val;

                                                            return (
                                                                <Group key={val} grow wrap="nowrap" align="center">
                                                                    <Group gap={6} w={130}>
                                                                        <IconBarcode size={16} color="blue" />
                                                                        <Text size="sm" fw={500} truncate>{label}</Text>
                                                                    </Group>
                                                                    <TextInput
                                                                        placeholder="Ej: Eje 1 - Izquierdo"
                                                                        size="sm"
                                                                        variant="filled"
                                                                        leftSection={<IconMapPin size={14} />}
                                                                        value={ubicacionesMap[val] || ''}
                                                                        onChange={(e) => handleUbicacionChange(val, e.currentTarget.value)}
                                                                        required
                                                                    />
                                                                </Group>
                                                            );
                                                        })}
                                                    </Stack>
                                                </ScrollArea.Autosize>
                                            </Paper>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <NumberInput
                                            label="Cantidad"
                                            min={0.1} max={selectedItemInfo.stockActual > 0 ? selectedItemInfo.stockActual : 999}
                                            {...form.getInputProps('cantidad')}
                                        />
                                        <TextInput
                                            label="Ubicación Global"
                                            placeholder="Ej: Motor"
                                            {...form.getInputProps('ubicacionFisicaGlobal')}
                                        />
                                    </>
                                )}
                            </>
                        )}
                        <Divider />
                        <Button type="submit" loading={loading} fullWidth leftSection={<IconCheck size={18} />} disabled={!form.values.inventarioId}>
                            Confirmar
                        </Button>
                    </Stack>
                </form>
            </Modal>

            <Modal opened={createModalOpened} onClose={() => setCreateModalOpened(false)} title="Crear" size="xl" centered>
                <ConsumibleForm onSuccess={handleSuccessCreate} onCancel={() => setCreateModalOpened(false)} />
            </Modal>
        </>
    );
}