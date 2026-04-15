'use client';
import { useState, useEffect } from 'react';
import {
    Modal, Button, Select, NumberInput, Stack, Text, Group,
    Loader, Alert, TextInput, Divider, MultiSelect, ScrollArea, Paper,
    SimpleGrid, Switch // 🔥 1. AÑADIMOS SWITCH
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPackage, IconBarcode, IconCheck, IconPlus, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { DatePickerInput } from '@mantine/dates';
import 'dayjs/locale/es';

export default function ModalInstalarPieza({ 
    opened, 
    onClose, 
    slotSeleccionado,
    subsistemaInstanciaId,
    activo, 
    onSuccess, 
    onSolicitarCrearConsumible,
    reloadTrigger
}) {
    const [loading, setLoading] = useState(false);
    const [searchingStock, setSearchingStock] = useState(false);
    const [stockOptions, setStockOptions] = useState([]);
    const [selectedItemInfo, setSelectedItemInfo] = useState(null);

    // Seriales y Detalles
    const [serialesValues, setSerialesValues] = useState([]);
    const [serialesData, setSerialesData] = useState([]);
    const [searchValue, setSearchValue] = useState('');
    const [serialDetails, setSerialDetails] = useState({});

    const form = useForm({
        // 🔥 2. AÑADIMOS esAsentamiento AL ESTADO INICIAL 🔥
        initialValues: { inventarioId: '', cantidad: 1, ubicacionFisicaGlobal: '', esAsentamiento: false },
        validate: {
            inventarioId: (val) => !val ? 'Seleccione un producto' : null,
            cantidad: (val) => val <= 0 ? 'Cantidad inválida' : null,
        }
    });

    useEffect(() => {
        if (opened && slotSeleccionado) {
            fetchStockCompatible();
            form.reset();
            setSelectedItemInfo(null);
            setSerialesValues([]);
            setSerialesData([]);
            setSerialDetails({});
            setSearchValue('');
            form.setFieldValue('cantidad', slotSeleccionado.cantidad || 1);
        }
    }, [opened, slotSeleccionado]);

    useEffect(() => {
        if (opened && reloadTrigger > 0) {
            fetchStockCompatible();
        }
    }, [reloadTrigger]);

    const fetchStockCompatible = async () => {
        setSearchingStock(true);
        try {
            const res = await fetch(`/api/inventario/compatibles?recomendacionId=${slotSeleccionado.id}`);
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
        setSearchValue('');
        const selectedOption = stockOptions.find(o => o.value === val);

        if (selectedOption) {
            setSelectedItemInfo(selectedOption);
            if (selectedOption.serialesDisponibles?.length > 0) {
                setSerialesData(selectedOption.serialesDisponibles.map(s => ({
                    value: s.id.toString(), label: s.label
                })));
            } else {
                setSerialesData([]);
            }
        }
    };

    const updateDetail = (serialVal, field, value) => {
        setSerialDetails(prev => ({
            ...prev,
            [serialVal]: { ...prev[serialVal], [field]: value }
        }));
    };

    const handleSerialesChange = (val) => {
        const newItems = val.filter(v => !serialesData.some(item => item.value === v));
        if (newItems.length > 0) {
            const nuevosObjetos = newItems.map(nv => ({ value: nv, label: nv }));
            setSerialesData(current => [...current, ...nuevosObjetos]);
        }

        setSerialDetails(prev => {
            const newState = { ...prev };
            val.forEach(v => {
                if (!newState[v]) {
                    newState[v] = { ubicacion: '', fechaCompra: new Date(), fechaGarantia: null };
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
            const invalidos = serialesValues.some(val => {
                const det = serialDetails[val];
                return !det?.ubicacion || !det.ubicacion.trim() || !det.fechaCompra;
            });
            if (invalidos) return notifications.show({ message: 'Todos los seriales requieren Ubicación y Fecha', color: 'red' });
        }

        setLoading(true);
        try {
            const payload = {
                activoId: activo.id,
                subsistemaInstanciaId: subsistemaInstanciaId,
                recomendacionId: slotSeleccionado.id,
                inventarioId: values.inventarioId,
                cantidad: values.cantidad,
                ubicacionFisica: values.ubicacionFisicaGlobal,
                // 🔥 3. ENVIAMOS EL FLAG AL BACKEND 🔥
                esAsentamiento: values.esAsentamiento, 
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
            };

            const res = await fetch('/api/gestionMantenimiento/componentes/instalar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            
            if (result.success) {
                notifications.show({ title: 'Éxito', message: 'Instalación registrada', color: 'green' });
                onSuccess(); 
                onClose();
            } else { 
                throw new Error(result.error); 
            }
        } catch (error) { 
            notifications.show({ title: 'Error', message: error.message, color: 'red' }); 
        } finally { 
            setLoading(false); 
        }
    };

    if (!slotSeleccionado) return null;
    const esSerializado = selectedItemInfo?.serialesDisponibles !== undefined || selectedItemInfo?.original?.tipo === 'serializado';

    return (
        <Modal opened={opened}
        zIndex={100}
        onClose={onClose} title={`Instalar en Puesto: ${slotSeleccionado.valor || 'Pieza'}`} centered size="lg">
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <Alert icon={<IconPackage size={16} />} color="blue" variant="light">
                        Requerido: <b>{slotSeleccionado.canti || 1}</b> unidades.
                    </Alert>

                    <Group align="flex-end" grow>
                        {searchingStock ? <Loader size="sm" /> : (
                            <Select
                                label="Inventario Disponible (Compatibles)" 
                                placeholder="Buscar repuesto..." 
                                data={stockOptions} 
                                searchable
                                {...form.getInputProps('inventarioId')} 
                                onChange={handleSelectChange}
                            />
                        )}
                        <Button 
                            variant="light" color="teal" leftSection={<IconPlus size={16} />} 
                            onClick={onSolicitarCrearConsumible} 
                            style={{ flexGrow: 0 }}
                        >
                            Crear Nuevo
                        </Button>
                    </Group>

                    {/* 🔥 4. BLOQUE DE ADVERTENCIA Y SWITCH DE ASENTAMIENTO 🔥 */}
                    {selectedItemInfo && (
                        <Paper p="sm" withBorder bg="orange.0" style={{ borderColor: '#ffc078' }}>
                            <Group wrap="nowrap">
                                <IconAlertCircle size={32} color="#fd7e14" style={{ flexShrink: 0 }} />
                                <div>
                                    <Switch
                                        label={<Text fw={700} c="orange.9">Modo Asentamiento (Pieza ya pre-instalada)</Text>}
                                        description="Active esto si la pieza ya forma parte del equipo físico y NO se tomará del almacén (ideal para carga inicial del sistema)."
                                        color="orange"
                                        size="md"
                                        {...form.getInputProps('esAsentamiento', { type: 'checkbox' })}
                                    />
                                </div>
                            </Group>
                        </Paper>
                    )}

                    {selectedItemInfo && (
                        <>
                            {esSerializado ? (
                                <>
                                    <MultiSelect
                                        label="Seleccionar o Crear Seriales"
                                        placeholder="Escribe serial y presiona Enter..."
                                        data={serialesData}
                                        value={serialesValues}
                                        onChange={handleSerialesChange}
                                        searchable
                                        searchValue={searchValue}
                                        onSearchChange={setSearchValue}
                                        creatable
                                        getCreateLabel={(query) => `+ Agregar Serial Manual: ${query}`}
                                        hidePickedOptions
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (searchValue && searchValue.trim().length > 0) {
                                                    const nuevoValor = searchValue.trim();
                                                    if (!serialesValues.includes(nuevoValor)) {
                                                        handleSerialesChange([...serialesValues, nuevoValor]);
                                                    }
                                                }
                                            }
                                        }}
                                    />

                                    {serialesValues.length > 0 && (
                                        <Paper withBorder p="sm" bg="gray.0" mt="md">
                                            <Text size="sm" fw={700} mb="xs" c="dimmed">DETALLES DE UBICACIÓN Y GARANTÍA:</Text>
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
                                                                        label="Ubicación Específica" placeholder="Ej: Eje 1 Der" size="xs"
                                                                        value={details.ubicacion || ''} onChange={(e) => updateDetail(val, 'ubicacion', e.currentTarget.value)} required
                                                                    />
                                                                    <DatePickerInput
                                                                        label="Fecha Compra" size="xs" value={details.fechaCompra} onChange={(d) => updateDetail(val, 'fechaCompra', d)} required maxDate={new Date()}
                                                                    />
                                                                    <DatePickerInput
                                                                        label="Garantía Vence" placeholder="Opcional" size="xs" value={details.fechaGarantia} onChange={(d) => updateDetail(val, 'fechaGarantia', d)} minDate={details.fechaCompra || new Date()} clearable
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
                                    {/* 🔥 5. DESBLOQUEO DEL LÍMITE MAX SI ES ASENTAMIENTO 🔥 */}
                                    <NumberInput 
                                        label="Cantidad a Instalar" 
                                        min={0.1} 
                                        max={form.values.esAsentamiento ? 99999 : (selectedItemInfo.stockActual > 0 ? selectedItemInfo.stockActual : 999)} 
                                        {...form.getInputProps('cantidad')} 
                                    />
                                    <TextInput label="Ubicación Física" placeholder="Ej: Motor" {...form.getInputProps('ubicacionFisicaGlobal')} />
                                </>
                            )}
                        </>
                    )}
                    <Divider />
                    <Button type="submit" loading={loading} fullWidth leftSection={<IconCheck size={18} />} disabled={!form.values.inventarioId}>
                        Confirmar Instalación
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}