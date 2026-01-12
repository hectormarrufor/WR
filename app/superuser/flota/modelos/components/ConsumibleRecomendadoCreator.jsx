'use client';

import { useState, useEffect } from 'react';
import { 
    Select, Loader, Group, Text, Button, Badge, Stack, Paper, 
    ActionIcon, NumberInput, Tooltip, Table
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch, IconTrash, IconInfoCircle, IconPlus, IconSettings } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import ConsumibleCreatorModal from './ConsumibleCreatorModal';
import CriterioManualModal from './CriterioManualModal';

// 1. IMPORTA TU COMPONENTE EXISTENTE
// (Ajusta la ruta según donde lo tengas guardado, ej: app/superuser/inventario/components/...)

export default function ConsumibleRecomendadoCreator({ value = [], onChange }) {
    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearch] = useDebouncedValue(searchValue, 300);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [cantidad, setCantidad] = useState(1);

    const [manualModalOpen, setManualModalOpen] = useState(false); // Estado para el nuevo modal

    // Estado para controlar tu Modal existente
    const [modalOpen, setModalOpen] = useState(false);

    // Fetch de consumibles (Igual que antes)
    useEffect(() => {
        const fetchConsumibles = async () => {
            setLoading(true);
            try {
                const url = debouncedSearch 
                    ? `/api/inventario/consumibles?search=${encodeURIComponent(debouncedSearch)}` 
                    : '/api/inventario/consumibles?limit=20';
                const response = await fetch(url);
                const res = await response.json();
                
                const itemsRaw = res.items || res.data || [];
                if (Array.isArray(itemsRaw)) {
                    const items = itemsRaw.map(c => ({
                        value: c.id.toString(),
                        label: `${c.nombre} (${c.categoria})`, 
                        raw: c 
                    }));
                    setData(items);
                }
            } catch (error) { console.error(error); } 
            finally { setLoading(false); }
        };
        fetchConsumibles();
    }, [debouncedSearch]);

    const handleSelect = (consumibleId) => {
        const item = data.find(d => d.value === consumibleId);
        if (item) {
            setSelectedItem(item);
            setCantidad(1);
        }
    };

    const handleCriterioManual = (nuevaRegla) => {
        // Agregamos directamente al array de reglas
        onChange([...value, nuevaRegla]);
        setManualModalOpen(false);
    };

    // 2. LOGICA DE CONEXIÓN: Recibir el dato de tu modal y usarlo
    const handleNuevoConsumible = (nuevoConsumible) => {
        // Adaptamos el objeto que devuelve tu modal al formato del Select
        const nuevoItem = {
            value: nuevoConsumible.id.toString(),
            label: `${nuevoConsumible.nombre} (${nuevoConsumible.categoria})`,
            raw: nuevoConsumible // Es vital que venga con sus includes (Aceite, Filtro, etc)
        };
        
        // Lo inyectamos en la lista local y lo seleccionamos
        setData((prev) => [nuevoItem, ...prev]);
        setSelectedItem(nuevoItem);
        setModalOpen(false); // Cerramos el modal
        
        notifications.show({ title: 'Listo', message: 'Consumible agregado a la plantilla', color: 'green' });
    };

    // Confirmar y Agregar (Lógica MACRO igual que antes)
    const confirmAdd = () => {
        if (!selectedItem) return;
        const c = selectedItem.raw;
        
        let nuevaRegla = {
            categoria: c.categoria,
            cantidad: cantidad,
            criterioId: null,
            tipoCriterio: '',
            labelOriginal: ''
        };

        // Lógica de extracción de criterios (Aceite -> Viscosidad, etc.)
        if (c.categoria.toLowerCase().includes('filtro')) {
            if (c.Filtro?.grupoEquivalenciaId) {
                nuevaRegla.criterioId = c.Filtro.grupoEquivalenciaId;
                nuevaRegla.tipoCriterio = 'grupo';
                nuevaRegla.labelOriginal = `Grupo ${c.Filtro.marca}`;
            } else {
                nuevaRegla.criterioId = c.Filtro?.id || c.id;
                nuevaRegla.tipoCriterio = 'individual';
                nuevaRegla.labelOriginal = c.nombre;
            }
        } else {
            let valorTecnico = null;
            const cat = c.categoria.toLowerCase();

            if(cat === 'neumatico') valorTecnico = c.Neumatico?.medida;
            else if(cat === 'aceite') valorTecnico = c.Aceite?.viscosidad;
            else if(cat === 'bateria') valorTecnico = c.Baterium?.codigo;
            else if(cat === 'correa') valorTecnico = c.Correa?.codigo;

            if (valorTecnico) {
                nuevaRegla.criterioId = valorTecnico;
                nuevaRegla.tipoCriterio = 'tecnico';
                nuevaRegla.labelOriginal = `${cat.toUpperCase()} ${valorTecnico}`;
            } else {
                nuevaRegla.criterioId = c.id;
                nuevaRegla.tipoCriterio = 'individual';
                nuevaRegla.labelOriginal = c.nombre;
            }
        }

        onChange([...value, nuevaRegla]);
        setSelectedItem(null);
        setCantidad(1);
        setSearchValue('');
    };

    const removeRegla = (index) => {
        const copy = [...value];
        copy.splice(index, 1);
        onChange(copy);
    };

    return (
        <Stack gap="sm">
            <Group align="flex-end" grow>
                <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <Select
                        label="Buscar Referencia / Criterio"
                        placeholder="Buscar..."
                        data={data}
                        searchable
                        searchValue={searchValue}
                        onSearchChange={setSearchValue}
                        value={selectedItem?.value || null}
                        onChange={handleSelect}
                        rightSection={loading ? <Loader size="xs" /> : <IconSearch size={14} />}
                        style={{ flex: 1 }}
                    />
                   {/* BOTÓN 1: CREAR PRODUCTO (Existente) */}
                    <Tooltip label="Crear nuevo consumible físico">
                        <ActionIcon 
                            size="lg" variant="light" color="blue" mb={2}
                            onClick={() => setModalOpen(true)}
                        >
                            <IconPlus size={20} />
                        </ActionIcon>
                    </Tooltip>

                    {/* BOTÓN 2: CRITERIO MANUAL (NUEVO) */}
                    <Tooltip label="Definir criterio técnico manual (Sin producto)">
                        <ActionIcon 
                            size="lg" variant="light" color="violet" mb={2}
                            onClick={() => setManualModalOpen(true)}
                        >
                            <IconSettings size={20} />
                        </ActionIcon>
                    </Tooltip>
                </div>
                
                {selectedItem && (
                    <NumberInput
                        label="Cant."
                        value={cantidad}
                        onChange={(val) => setCantidad(Number(val))}
                        min={1} max={999} allowDecimal
                        w={80}
                    />
                )}

                <Button onClick={confirmAdd} disabled={!selectedItem} w={100}>
                    Añadir
                </Button>
            </Group>

            {/* LISTA DE REGLAS */}
            {value.length > 0 && (
                <Table withTableBorder withColumnBorders variant="vertical" mt="sm">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Categoría</Table.Th>
                            <Table.Th>Criterio</Table.Th>
                            <Table.Th>Cant.</Table.Th>
                            <Table.Th style={{width: 50}}></Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {value.map((item, idx) => (
                            <Table.Tr key={idx}>
                                <Table.Td><Badge variant="dot" color="gray">{item.categoria}</Badge></Table.Td>
                                <Table.Td>
                                    <Group gap={5}>
                                        <Text size="sm">{item.labelOriginal}</Text>
                                        <Tooltip label={`Tipo: ${item.tipoCriterio}`}>
                                            <IconInfoCircle size={14} style={{ opacity: 0.5 }} />
                                        </Tooltip>
                                    </Group>
                                </Table.Td>
                                <Table.Td>{item.cantidad}</Table.Td>
                                <Table.Td>
                                    <ActionIcon color="red" variant="subtle" onClick={() => removeRegla(idx)}>
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}

            {/* 3. TU MODAL EXISTENTE INTEGRADO */}
            {/* Asegúrate que tu modal tenga una prop para notificar el éxito */}
            <ConsumibleCreatorModal
                opened={modalOpen} 
                onClose={() => setModalOpen(false)}
                onSuccess={handleNuevoConsumible} 
            />
            {/* EL NUEVO MODAL MANUAL */}
            <CriterioManualModal
                opened={manualModalOpen}
                onClose={() => setManualModalOpen(false)}
                onSuccess={handleCriterioManual}
            />
        </Stack>
    );
}