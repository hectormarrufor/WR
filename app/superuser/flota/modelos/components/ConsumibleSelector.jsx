'use client';

import { useState, useEffect } from 'react';
import { Select, Loader, Group, Text, Button, Badge, Stack, Paper, ActionIcon, NumberInput, Tooltip } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconPlus, IconTrash, IconSearch, IconAlertTriangle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import ConsumibleCreatorModal from './ConsumibleCreatorModal';

export default function ConsumibleSelector({ value = [], onChange }) {
    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearch] = useDebouncedValue(searchValue, 300);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    // Estado para la "pre-selección" antes de agregar
    const [selectedItem, setSelectedItem] = useState(null);
    const [cantidad, setCantidad] = useState(1);

    // 1. Fetch de consumibles (igual que antes)
    useEffect(() => {
        fetchConsumibles(debouncedSearch);
    }, [debouncedSearch]);

    const fetchConsumibles = async (query) => {
        setLoading(true);
        try {
            const url = query
                ? `/api/inventario/consumibles?search=${encodeURIComponent(query)}`
                : '/api/inventario/consumibles?limit=20';
            const response = await fetch(url);
            const res = await response.json();
            if (res.items) {
                const items = res.items.map(c => ({
                    value: c.id.toString(),
                    label: `${c.nombre} (${c.categoria})`,
                    raw: c
                }));
                setData(items);
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    // 2. Procesar la selección del Dropdown
    const handleSelect = (consumibleId) => {
        const item = data.find(d => d.value === consumibleId);
        if (item) {
            setSelectedItem(item);
            setCantidad(1); // Resetear cantidad
        }
    };

const esConsumibleGranel = (categoria) => {
        return ['aceite', 'refrigerante', 'grasa', 'liquido'].includes(categoria?.toLowerCase());
    };

    const confirmAdd = () => {
        if (!selectedItem) return;

        const c = selectedItem.raw;
        
        // 1. Inicializamos la variable con el nombre CORRECTO
        let baseRecomendacion = { 
            categoria: c.categoria, 
            cantidad: 1,
            criterioId: null, 
            tipoCriterio: '',
            labelOriginal: '',
            // Guardamos la cantidad requerida explícitamente
            cantidad: 1 
        };

        // 2. Lógica para FILTROS (Sigue siendo especial por los Grupos)
        if (c.categoria.startsWith('filtro')) {
            if (c.Filtro?.grupoEquivalenciaId) {
                baseRecomendacion.criterioId = c.Filtro.grupoEquivalenciaId;
                baseRecomendacion.tipoCriterio = 'grupo';
                baseRecomendacion.labelOriginal = `Grupo ${c.Filtro.marca}`;
            } else {
                baseRecomendacion.criterioId = c.Filtro.id;
                baseRecomendacion.tipoCriterio = 'individual';
                baseRecomendacion.labelOriginal = `${c.nombre}`;
            }
        } 
        // 3. Lógica para TODO LO DEMÁS (Criterio Técnico)
        else {
            let valorTecnico = null;
            let etiqueta = '';

            switch (c.categoria) {
                case 'neumatico':
                    valorTecnico = c.Neumatico?.medida;     // "11R22.5"
                    etiqueta = `Medida ${valorTecnico}`;
                    break;
                case 'aceite':
                    valorTecnico = c.Aceite?.viscosidad;    // "15W40"
                    etiqueta = `Viscosidad ${valorTecnico}`;
                    break;
                case 'bateria':
                    valorTecnico = c.Baterium?.codigo;       // "24F"
                    etiqueta = `Grupo ${valorTecnico}`;
                    break;
                case 'correa':
                case 'sensor':
                    const hijo = c.Correa || c.Sensor;
                    valorTecnico = hijo?.codigo;            // "6PK..."
                    etiqueta = `Código ${valorTecnico}`;
                    break;
            }

            if (valorTecnico) {
                baseRecomendacion.criterioId = valorTecnico;
                baseRecomendacion.tipoCriterio = 'tecnico';
                baseRecomendacion.labelOriginal = etiqueta;
            } else {
                // Fallback si falta el dato técnico o es otra categoría
                baseRecomendacion.criterioId = c.id;
                baseRecomendacion.tipoCriterio = 'individual';
                baseRecomendacion.labelOriginal = c.nombre;
            }
        }

        // --- 4. LÓGICA DE CANTIDAD Y GENERACIÓN DE SLOTS ---
        const nuevosSlots = [];

        if (esConsumibleGranel(c.categoria)) {
            // CASO FLUIDOS (Aceite): 1 solo slot con la cantidad total

        if (esConsumibleGranel(c.categoria)) {
            // CASO FLUIDOS (Aceite): 1 solo slot con la cantidad total
            nuevosSlots.push({
                ...baseRecomendacion,
                cantidad: cantidad, // Ej: 40 Litros
                label: `${baseRecomendacion.labelOriginal} (${cantidad} Lts)`
            });
        } else {
            // CASO DISCRETO (Cauchos, Filtros): N slots de 1 unidad
            for (let i = 0; i < cantidad; i++) {
                nuevosSlots.push({
                    ...baseRecomendacion, // Aquí es donde daba el error antes
                    cantidad: 1, 
                    label: cantidad > 1 
                        ? `${baseRecomendacion.labelOriginal} (Pos. ${value.length + i + 1})`
                        : baseRecomendacion.labelOriginal
                });
            }
        }

        onChange([...value, ...nuevosSlots]);
        setSelectedItem(null);
        setCantidad(1);
        setSearchValue('');
    };

    const removeRecomendacion = (index) => {
        const copy = [...value];
        copy.splice(index, 1);
        onChange(copy);
    };

    return (
        <Stack gap="xs">
            <Group align="flex-end" grow>
                {/* Selector */}
                <Select
                    label="Agregar Requisito / Parte"
                    placeholder="Buscar repuesto modelo..."
                    data={data}
                    searchable
                    searchValue={searchValue}
                    onSearchChange={setSearchValue}
                    value={selectedItem?.value || null}
                    onChange={handleSelect}
                    rightSection={loading ? <Loader size="xs" /> : <IconSearch size={14} />}
                    nothingFoundMessage={
                        <Button variant="light" size="xs" fullWidth onClick={() => setModalOpen(true)}>
                            + Crear Nuevo
                        </Button>
                    }
                />

                {/* Input de Cantidad (Solo aparece si seleccionaste algo) */}
                {selectedItem && (
                    <NumberInput
                        // Cambiamos el label dinámicamente para dar feedback al usuario
                        label={esConsumibleGranel(selectedItem.raw.categoria) ? "Litros / Cantidad" : "Unidades"}
                        value={cantidad}
                        onChange={setCantidad}
                        min={1}
                        max={50}
                        w={80}
                    />
                )}

                {/* Botón Agregar */}
                {selectedItem && (
                    <Button onClick={confirmAdd} variant="filled" color="blue">
                        Agregar
                    </Button>
                )}
            </Group>

            {/* Lista de Slots Definidos */}
            <Paper withBorder p="xs" bg="gray.0" radius="md">
                <Text size="xs" c="dimmed" mb={5} fw={700}>POSICIONES DEFINIDAS PARA ESTE SISTEMA:</Text>

                {value.length === 0 && <Text size="xs" c="dimmed" fs="italic">Sin partes definidas.</Text>}

                <Stack gap={4}>
                    {console.log(value)}
                    {value.map((item, idx) => (
                        <Group key={idx} justify="space-between" bg="white" p={4} style={{ border: '1px solid #eee', borderRadius: 4 }}>
                            <Group gap={5}>
                                <Badge size="sm" variant="dot" color="gray">Slot #{idx + 1}</Badge>
                                <Text size="sm" fw={500}>{item.categoria.toUpperCase()}:</Text>
                                <Text size="sm">{item.label}</Text>
                                {/* Indicador de Flexibilidad */}
                                <Tooltip label="El sistema permitirá montar otra medida bajo advertencia">
                                    <Badge size="xs" variant="outline" color="orange" style={{ cursor: 'help' }}>Flexible</Badge>
                                </Tooltip>
                            </Group>
                            <ActionIcon color="red" variant="subtle" size="sm" onClick={() => removeRecomendacion(idx)}>
                                <IconTrash size={14} />
                            </ActionIcon>
                        </Group>
                    ))}
                </Stack>
            </Paper>

            <ConsumibleCreatorModal
                opened={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={(nuevo) => fetchConsumibles(nuevo.nombre)}
            />
        </Stack>
    );}
}
