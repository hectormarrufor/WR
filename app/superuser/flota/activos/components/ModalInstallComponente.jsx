'use client';
import { useState, useEffect } from 'react';
import {
    Modal, Button, Select, NumberInput, Stack, Text, Group,
    Loader, Alert, TextInput, Divider, MultiSelect, ScrollArea, Paper,
    SimpleGrid
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPackage, IconBarcode, IconCheck, IconPlus, IconMapPin, IconCalendar, IconCalendarTime } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import ConsumibleForm from '@/app/superuser/inventario/components/ConsumibleForm';
import { DatePickerInput } from '@mantine/dates'; // Asegúrate de tener @mantine/dates instalado
import 'dayjs/locale/es'; // Opcional si quieres español

export default function ModalInstallComponente({ opened, onClose, target, onSuccess, activoId }) {
    const [loading, setLoading] = useState(false);

    // --- BÚSQUEDA Y DATOS ---
    const [searchingStock, setSearchingStock] = useState(false);
    const [stockOptions, setStockOptions] = useState([]);
    const [selectedItemInfo, setSelectedItemInfo] = useState(null);

    // Seriales
    const [serialesValues, setSerialesValues] = useState([]);
    const [serialesData, setSerialesData] = useState([]);
    const [searchValue, setSearchValue] = useState('');

    // --- NUEVO ESTADO UNIFICADO ---
    // Estructura: { "SERIAL_VAL": { ubicacion: "", fechaCompra: Date, fechaGarantia: Date } }
    const [serialDetails, setSerialDetails] = useState({});

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
            setSerialDetails({});
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

    // --- HELPER PARA ACTUALIZAR DETALLES ---
    const updateDetail = (serialVal, field, value) => {
        setSerialDetails(prev => ({
            ...prev,
            [serialVal]: {
                ...prev[serialVal],
                [field]: value
            }
        }));
    };

    const handleSerialesChange = (val) => {
        // 1. Detectar nuevos
        const newItems = val.filter(v => !serialesData.some(item => item.value === v));
        if (newItems.length > 0) {
            const nuevosObjetos = newItems.map(nv => ({ value: nv, label: nv }));
            setSerialesData(current => [...current, ...nuevosObjetos]);
        }

        // 2. Inicializar fechas por defecto para los nuevos seleccionados
        setSerialDetails(prev => {
            const newState = { ...prev };
            val.forEach(v => {
                if (!newState[v]) {
                    newState[v] = {
                        ubicacion: '',
                        fechaCompra: new Date(), // Por defecto HOY
                        fechaGarantia: null
                    };
                }
            });
            return newState;
        });

        setSerialesValues(val);
        form.setFieldValue('cantidad', val.length);
        setSearchValue('');
    };

    const handleSubmit = async (values) => {
        if (esSerializado) {
            // Validar que todos tengan ubicación y fecha de compra
            const invalidos = serialesValues.some(val => {
                const det = serialDetails[val];
                return !det?.ubicacion || !det.ubicacion.trim() || !det.fechaCompra;
            });

            if (invalidos) {
                return notifications.show({ message: 'Todos los seriales requieren Ubicación y Fecha de Compra', color: 'red' });
            }
        }

        await ejecutarInstalacion({
            inventarioId: values.inventarioId,
            cantidad: values.cantidad,
            ubicacionFisica: values.ubicacionFisicaGlobal,

            // Mapeamos enviando TODO el objeto de detalles
            serialesSeleccionados: serialesValues.map(val => {
                const esExistente = selectedItemInfo.serialesDisponibles?.some(s => s.id.toString() === val);
                const details = serialDetails[val] || {};

                return {
                    value: val,
                    type: esExistente ? 'existing' : 'new',
                    ubicacion: details.ubicacion,
                    fechaCompra: details.fechaCompra,
                    fechaGarantia: details.fechaGarantia
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

    const handleUbicacionChange = (serialValue, textoUbicacion) => {
        setUbicacionesMap(prev => ({
            ...prev,
            [serialValue]: textoUbicacion
        }));
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

                                        {/* --- ZONA DE DETALLES (UBICACIÓN Y FECHAS) --- */}
                                        {serialesValues.length > 0 && (
                                            <Paper withBorder p="sm" bg="gray.0">
                                                <Text size="sm" fw={700} mb="xs" c="dimmed">DETALLES POR SERIAL:</Text>
                                                <ScrollArea.Autosize mah={300}>
                                                    <Stack gap="md">
                                                        {serialesValues.map((val) => {
                                                            const itemData = serialesData.find(d => d.value === val);
                                                            const label = itemData ? itemData.label : val;
                                                            const details = serialDetails[val] || {};

                                                            return (
                                                                <Paper key={val} withBorder p="xs" shadow="xs">
                                                                    <Group gap="xs" mb={4}>
                                                                        <IconBarcode size={16} color="blue" />
                                                                        <Text size="sm" fw={700}>{label}</Text>
                                                                    </Group>

                                                                    <SimpleGrid cols={3} spacing="xs">
                                                                        <TextInput
                                                                            label="Ubicación"
                                                                            placeholder="Ej: Eje 1 Der"
                                                                            size="xs"
                                                                            leftSection={<IconMapPin size={12} />}
                                                                            value={details.ubicacion || ''}
                                                                            onChange={(e) => updateDetail(val, 'ubicacion', e.currentTarget.value)}
                                                                            required
                                                                        />
                                                                        <DatePickerInput
                                                                            label="Fecha Compra"
                                                                            placeholder="Seleccionar"
                                                                            size="xs"
                                                                            leftSection={<IconCalendar size={12} />}
                                                                            value={details.fechaCompra}
                                                                            onChange={(d) => updateDetail(val, 'fechaCompra', d)}
                                                                            required
                                                                            maxDate={new Date()}
                                                                        />
                                                                        <DatePickerInput
                                                                            label="Vence Garantía"
                                                                            placeholder="Opcional"
                                                                            size="xs"
                                                                            leftSection={<IconCalendarTime size={12} />}
                                                                            value={details.fechaGarantia}
                                                                            onChange={(d) => updateDetail(val, 'fechaGarantia', d)}
                                                                            minDate={details.fechaCompra || new Date()}
                                                                            clearable
                                                                        />
                                                                    </SimpleGrid>
                                                                </Paper>
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