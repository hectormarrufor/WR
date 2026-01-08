'use client';

import { useState, useEffect } from 'react';
import { Select, Loader, Group, Text, Button, Badge, Stack, Paper, ActionIcon, NumberInput, Tooltip, Table } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch, IconTrash, IconInfoCircle } from '@tabler/icons-react';

export default function ConsumibleRecomendadoCreator({ value = [], onChange }) {
    // Buscador
    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearch] = useDebouncedValue(searchValue, 300);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Estado temporal para la selección actual
    const [selectedItem, setSelectedItem] = useState(null);
    const [cantidad, setCantidad] = useState(1);

    // 1. Fetch de consumibles (Catálogo Maestro)
    useEffect(() => {
        const fetchConsumibles = async () => {
            setLoading(true);
            try {
                const url = debouncedSearch 
                    ? `/api/inventario/consumibles?search=${encodeURIComponent(debouncedSearch)}` 
                    : '/api/inventario/consumibles?limit=20';
                const response = await fetch(url);
                const res = await response.json();
                if (res.items) {
                    const items = res.items.map(c => ({
                        value: c.id.toString(),
                        // Mostramos info relevante para que el ingeniero elija bien
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

    // 2. Manejar selección del dropdown
    const handleSelect = (consumibleId) => {
        const item = data.find(d => d.value === consumibleId);
        if (item) {
            setSelectedItem(item);
            setCantidad(1); // Reset cantidad
        }
    };

    // 3. Confirmar y Agregar (LÓGICA MACRO)
    const confirmAdd = () => {
        if (!selectedItem) return;

        const c = selectedItem.raw;
        
        // Estructura base de la REGLA
        let nuevaRegla = {
            categoria: c.categoria,
            cantidad: cantidad, // Cantidad TOTAL (Ej: 8 cauchos, 40 litros)
            criterioId: null,
            tipoCriterio: '',
            labelOriginal: ''
        };

        // Extracción de Criterio (Lógica simplificada que definimos antes)
        if (c.categoria.startsWith('filtro')) {
            if (c.Filtro?.grupoEquivalenciaId) {
                nuevaRegla.criterioId = c.Filtro.grupoEquivalenciaId;
                nuevaRegla.tipoCriterio = 'grupo';
                nuevaRegla.labelOriginal = `Grupo ${c.Filtro.marca}`;
            } else {
                nuevaRegla.criterioId = c.Filtro.id;
                nuevaRegla.tipoCriterio = 'individual';
                nuevaRegla.labelOriginal = c.nombre;
            }
        } else {
            // Lógica Técnica (Neumáticos, Aceites, Baterías)
            let valorTecnico = null;
            let etiqueta = '';

            switch (c.categoria) {
                case 'neumatico':
                    valorTecnico = c.Neumatico?.medida;
                    etiqueta = `Medida ${valorTecnico}`;
                    break;
                case 'aceite':
                    valorTecnico = c.Aceite?.viscosidad;
                    etiqueta = `Viscosidad ${valorTecnico}`;
                    break;
                case 'bateria':
                    valorTecnico = c.Baterium?.codigo;
                    etiqueta = `Grupo ${valorTecnico}`;
                    break;
                case 'correa':
                    valorTecnico = c.Correa?.codigo;
                    etiqueta = `Código ${valorTecnico}`;
                    break;
            }

            if (valorTecnico) {
                nuevaRegla.criterioId = valorTecnico;
                nuevaRegla.tipoCriterio = 'tecnico';
                nuevaRegla.labelOriginal = etiqueta;
            } else {
                nuevaRegla.criterioId = c.id;
                nuevaRegla.tipoCriterio = 'individual';
                nuevaRegla.labelOriginal = c.nombre;
            }
        }

        // AGREGAMOS UNA SOLA FILA (MACRO)
        // Usamos spread para mantener inmutabilidad
        onChange([...value, nuevaRegla]);
        
        // Limpieza
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
            

            {/* --- LISTA DE REGLAS DEFINIDAS --- */}
            {value.length > 0 ? (
                <Table withTableBorder withColumnBorders variant="vertical">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Categoría</Table.Th>
                            <Table.Th>Criterio de Selección</Table.Th>
                            <Table.Th>Cantidad</Table.Th>
                            <Table.Th style={{width: 50}}></Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {value.map((item, idx) => (
                            <Table.Tr key={idx}>
                                <Table.Td>
                                    <Badge variant="dot" color="gray">{item.categoria.toUpperCase()}</Badge>
                                </Table.Td>
                                <Table.Td>
                                    <Group gap={5}>
                                        <Text size="sm" fw={500}>{item.labelOriginal}</Text>
                                        <Tooltip label={`Tipo: ${item.tipoCriterio}`}>
                                            <IconInfoCircle size={14} style={{ opacity: 0.5 }} />
                                        </Tooltip>
                                    </Group>
                                </Table.Td>
                                <Table.Td>
                                    <Text fw={700}>{item.cantidad}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <ActionIcon color="red" variant="subtle" onClick={() => removeRegla(idx)}>
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            ) : (
                <Paper p="xs" bg="gray.0" withBorder>
                    <Text size="xs" c="dimmed" ta="center">
                        No hay consumibles definidos para este subsistema.
                    </Text>
                </Paper>
            )}

            <Group align="flex-end" grow>
                <Select
                    label="Buscar Referencia / Criterio"
                    placeholder="Ej: 295/80, 15W40, WIX 51515..."
                    data={data}
                    searchable
                    searchValue={searchValue}
                    onSearchChange={setSearchValue}
                    value={selectedItem?.value || null}
                    onChange={handleSelect}
                    rightSection={loading ? <Loader size="xs" /> : <IconSearch size={14} />}
                />
                
                {selectedItem && (
                    <NumberInput
                        label="Cantidad Requerida"
                        description="Unidades o Litros totales"
                        value={cantidad}
                        onChange={(val) => setCantidad(Number(val))}
                        min={1}
                        max={999}
                        allowDecimal
                        w={140}
                    />
                )}

                <Button 
                    onClick={confirmAdd} 
                    disabled={!selectedItem}
                    w={100}
                >
                    Añadir
                </Button>
            </Group>
        </Stack>
    );
}