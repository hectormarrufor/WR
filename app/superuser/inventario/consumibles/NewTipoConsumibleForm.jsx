'use client'
import { Button, Group, Select, TextInput, Title } from '@mantine/core';
import BackButton from '@/app/components/BackButton';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';

export default function NewTipoConsumibleForm({ tipoNombre, setNewTipoModalOpen, form }) {
    const [atributos, setAtributos] = useState([]);
    const [nuevoCampo, setNuevoCampo] = useState('');
    const [tipoEntrada, setTipoEntrada] = useState('');
    const [unidadMedida, setUnidadMedida] = useState('');
    const [opciones, setOpciones] = useState([]);

    const agregarAtributo = () => {
        if (!nuevoCampo || !tipoEntrada) return;
        setAtributos([
            ...atributos,
            { campo: nuevoCampo, tipoEntrada, opciones: tipoEntrada.includes('select') ? opciones : [] }
        ]);
        setNuevoCampo('');
        setTipoEntrada('');
        setOpciones([]);
    };

    const confirmar = async () => {
        const payload = {
            nombre: tipoNombre,
            unidadMedida: unidadMedida,
            especificaciones: atributos
        };
        try {
            await fetch('/api/inventario/tipo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            notifications.show({
                title: 'Éxito',
                message: 'Tipo de consumible creado correctamente.',
                color: 'green'
            });
            form.setFieldvalue('tipo', tipoNombre);
            setNewTipoModalOpen(false);

        } catch (error) {
            console.error("Error al crear el tipo de consumible:", error);
            notifications.show({
                title: 'Error',
                message: 'No se pudo crear el tipo de consumible.',
                color: 'red'
            });
            
        }



        return;
};


return (
    <>
        <Title order={4}>Nombre del Tipo: {tipoNombre}</Title>

        <Group mt="md">
            <TextInput
                placeholder="Nombre del atributo (ej. Viscosidad)"
                value={nuevoCampo}
                onChange={(e) => setNuevoCampo(e.currentTarget.value)}
            />
            <Select
                label="Unidad de Medida"
                placeholder="Selecciona una unidad"
                data={[
                    { value: 'Litros', label: 'Litros' },
                    { value: 'Unidades', label: 'Unidades' },
                    { value: 'Metros', label: 'Metros' },
                    { value: 'Kilogramos', label: 'Kilogramos' },
                ]}
                value={unidadMedida}
                onChange={setUnidadMedida}
            />
                
                
            <Select
                placeholder="Tipo de entrada"
                data={[
                    { value: 'text', label: 'Texto' },
                    { value: 'number', label: 'Número' },
                    { value: 'select', label: 'Select' },
                    { value: 'multiselect', label: 'MultiSelect' }
                ]}
                value={tipoEntrada}
                onChange={setTipoEntrada}
            />
        </Group>

        {tipoEntrada?.includes('select') && (
            <TextInput
                placeholder="Opciones separadas por coma"
                value={opciones.join(',')}
                onChange={(e) => setOpciones(e.currentTarget.value.split(','))}
            />
        )}

        <Button mt="md" onClick={agregarAtributo}>Agregar atributo</Button>

        <div style={{ marginTop: 20 }}>
            <Title order={5}>Atributos definidos:</Title>
            <ul>
                {atributos.map((a, i) => (
                    <li key={i}>
                        {a.campo} ({a.tipoEntrada}) {a.opciones?.length > 0 && `→ ${a.opciones.join(', ')}`}
                    </li>
                ))}
            </ul>
        </div>

        <Group mt="lg">
            <Button color="green" onClick={confirmar}>Confirmar</Button>
        </Group>
    </>



);
}