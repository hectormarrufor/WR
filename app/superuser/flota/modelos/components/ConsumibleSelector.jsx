// app/superuser/flota/modelos/components/ConsumibleSelector.jsx
'use client';

import { useState, useEffect } from 'react';
import { MultiSelect, Loader, Group, Text, Button, Badge } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconPlus, IconLink } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import ConsumibleCreatorModal from './ConsumibleCreatorModal';

export default function ConsumibleSelector({ value = [], onChange, error }) {
    const [searchValue, setSearchValue] = useState('');
    const [debouncedSearch] = useDebouncedValue(searchValue, 300);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

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

            if (res.success) {
                // Mapeamos los datos y nos aseguramos de que los seleccionados actualmente
                // también estén en la lista para que no desaparezcan visualmente
                const items = res.data.map(c => ({
                    value: c.id.toString(),
                    label: `${c.nombre} (${c.codigo || 'S/C'})`,
                    // Guardamos info extra oculta para usarla en la lógica
                    tipo: c.tipoConsumible // 'Filtro', 'Correa', etc.
                }));
                setData(items);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA DE EQUIVALENCIAS AUTOMÁTICAS ---
    const handleChange = async (newSelectedIds) => {
        // 1. Detectar qué ID se acaba de agregar (si creció el array)
        const addedId = newSelectedIds.find(id => !value.includes(id));
        
        let finalSelection = [...newSelectedIds];

        if (addedId) {
            setLoading(true);
            try {
                // Consultamos si este consumible tiene equivalencias
                const res = await fetch(`/api/inventario/filtros/equivalencias?consumibleId=${addedId}`);
                const dataEquiv = await res.json();

                if (dataEquiv.success && dataEquiv.data.length > 0) {
                    const nuevosHermanos = [];
                    
                    dataEquiv.data.forEach(hermano => {
                        const hermanoId = hermano.id.toString();
                        
                        // Si no estaba seleccionado ya, lo preparamos para agregar
                        if (!finalSelection.includes(hermanoId)) {
                            finalSelection.push(hermanoId);
                            nuevosHermanos.push({
                                value: hermanoId,
                                label: `${hermano.nombre} (${hermano.codigo})`
                            });
                        }
                    });

                    if (nuevosHermanos.length > 0) {
                        // Agregamos visualmente las opciones al Select si no estaban cargadas
                        setData(prev => {
                            // Filtramos duplicados por si acaso
                            const currentIds = new Set(prev.map(p => p.value));
                            const uniqueNew = nuevosHermanos.filter(n => !currentIds.has(n.value));
                            return [...prev, ...uniqueNew];
                        });

                        notifications.show({
                            title: 'Equivalencias Encontradas',
                            message: `Se agregaron automáticamente ${nuevosHermanos.length} filtros compatibles.`,
                            color: 'blue',
                            icon: <IconLink size={16} />
                        });
                    }
                }
            } catch (e) {
                console.error("Error buscando equivalencias auto:", e);
            } finally {
                setLoading(false);
            }
        }

        // 2. Propagar el cambio final al padre
        onChange(finalSelection);
    };

    const handleSuccessCreate = (nuevoConsumible) => {
        const newItem = {
            value: nuevoConsumible.id.toString(),
            label: `${nuevoConsumible.nombre} (${nuevoConsumible.codigo})`
        };
        setData((prev) => [newItem, ...prev]);
        
        // Al crear, también disparamos el handleChange por si creaste una equivalencia (avanzado)
        // Por ahora solo lo seleccionamos directo.
        onChange([...value.map(String), newItem.value]);
    };

    return (
        <>
            <MultiSelect
                label="Repuestos Homologados"
                description="Selecciona uno y el sistema buscará sus equivalentes automáticamente."
                placeholder="Buscar (ej. WIX 51515)"
                data={data}
                value={value.map(String)}
                onChange={handleChange} // Usamos nuestro handler inteligente
                searchable
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                nothingFoundMessage={
                    <Group justify="center" p="xs">
                        <Button variant="light" size="xs" leftSection={<IconPlus size={14}/>} onClick={() => setModalOpen(true)}>
                            Crear Nuevo Repuesto
                        </Button>
                    </Group>
                }
                limit={20}
                clearable
                hidePickedOptions
                maxDropdownHeight={250}
                leftSection={loading ? <Loader size="xs" /> : null}
                error={error}
            />

            <ConsumibleCreatorModal 
                opened={modalOpen} 
                onClose={() => setModalOpen(false)}
                onSuccess={handleSuccessCreate}
            />
        </>
    );
}