'use client'
import { Button, Group, Select, TextInput, Title } from '@mantine/core';
import BackButton from '@/app/components/BackButton';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';

export default function NewTipoConsumibleForm({ tipoNombre, setNewTipoModalOpen, form }) {
    const [Nombre, setTipoNombre] = useState(tipoNombre || '');
    const [atributos, setAtributos] = useState([]);
    const [nuevoCampo, setNuevoCampo] = useState('');
    const [tipoEntrada, setTipoEntrada] = useState('');
    const [unidadMedida, setUnidadMedida] = useState('');
    const [opciones, setOpciones] = useState([]);
    const [atributosUso, setAtributosUso] = useState([]);


    useEffect(() => {
        console.log('Atributos actuales:', atributos);
    }, [atributos]);

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

    const addAtributoUso = () => {
        setAtributosUso([...atributosUso, { campo: '', tipoEntrada: '', unidad: '' }]);
    };



    const confirmar = async () => {
        const payload = {
            nombre: Nombre,
            unidadMedida: unidadMedida,
            especificaciones: atributos,
            atributosUso: atributosUso
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
            form && form.setFieldvalue('tipo', Nombre);
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
            <Title order={4}>Nombre del Tipo: {Nombre}</Title>
            <TextInput
                mt="md"
                label="Nombre del Tipo de Consumible"
                placeholder="Ingresa el nombre del tipo de consumible"
                value={Nombre}
                disabled={Boolean(tipoNombre)}
                onChange={(e) => setTipoNombre(e.currentTarget.value)}
            />

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
                    onChange={(value) => {
                        setUnidadMedida(value)
                    }}
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

            {/* Sección de atributos de uso */}
            <Title order={5} mt="lg">Atributos de Uso</Title>
            {atributosUso.map((attr, i) => (
                <Group key={i} mt="sm">
                    <TextInput
                        placeholder="Campo (ej. Capacidad)"
                        value={attr.campo}
                        onChange={(e) => {
                            const updated = [...atributosUso];
                            updated[i].campo = e.currentTarget.value;
                            setAtributosUso(updated);
                        }}
                    />
                    <Select
                        placeholder="Tipo"
                        data={['text', 'number', 'select', 'multiselect']}
                        value={attr.tipoEntrada}
                        onChange={(val) => {
                            const updated = [...atributosUso];
                            updated[i].tipoEntrada = val;
                            setAtributosUso(updated);
                        }}
                    />
                    <TextInput
                        placeholder="Unidad (ej. %, km, horas)"
                        value={attr.unidad}
                        onChange={(e) => {
                            const updated = [...atributosUso];
                            updated[i].unidad = e.currentTarget.value;
                            setAtributosUso(updated);
                        }}
                    />
                </Group>
            ))}
            <Button mt="md" onClick={addAtributoUso}>Agregar atributo de uso</Button>


            <Group mt="lg">
                <Button color="green" onClick={confirmar}>Confirmar</Button>
            </Group>
        </>



    );
}