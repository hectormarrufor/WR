import React, { useEffect, useState } from 'react';
import { TextInput, Select, Button, Group, Modal } from '@mantine/core';
import { useForm } from '@mantine/form';
import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { AsyncCatalogComboBox } from '@/app/components/CatalogCombobox';
import ODTSelectableGrid from '@/app/superuser/odt/ODTSelectableGrid';

const FiltroForm = () => {
    const [filtros, setFiltros] = useState([]);

    const form = useForm({
        initialValues: {
            marca: '',
            tipo: '',
            codigo: '',
            equivalencias: [],
            posicion: '',
        },
    });

    useEffect(() => {
        // Fetch existing filtros for equivalencias selection
        const fetchFiltros = async () => {
            try {
                const response = await axios.get(`/api/inventario/filtros/${form.values.tipo}`);
                setFiltros(response.data);
            } catch (error) {
                console.error('Error fetching filtros:', error);
            }
        };
        form.values.tipo.length > 0 && fetchFiltros();
    }, [form.values.tipo]);

    const handleSubmit = async (values) => {
        try {
            await axios.post('/api/inventario/filtro', values);
            // Handle success (e.g., show a success message or reset the form)
            form.reset();
            notifications.show({
                title: 'Éxito',
                message: 'Filtro creado exitosamente',
                color: 'green',
            });
        } catch (error) {
            // Handle error (e.g., show an error message)
            console.error('Error submitting form:', error);
            notifications.show({
                title: 'Error',
                message: `Hubo un error al crear el filtro, ${error.message}`,
                color: 'red',
            });
        }
    };

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <AsyncCatalogComboBox
                label="Marca"
                placeholder="Selecciona una marca"
                fieldKey="marca"
                form={form}
                catalogo="marcas"
            />
            <Select
                label="Tipo"
                data={['aceite', 'aire', 'combustible', 'cabina']}
                {...form.getInputProps('tipo')}
            />
            <AsyncCatalogComboBox
                label="Código"
                placeholder="Ingresa el código del filtro"
                fieldKey="codigo"
                form={form}
                catalogo="codigos"
                tipo = {form.values.tipo}
            />
            <ODTSelectableGrid
                label="Equivalencias"
                data={filtros}
                onChange={(values) => form.setFieldValue("equivalencias", values)}
            />
            <Select
                label="Posición"
                data={['primario', 'secundario']}
                {...form.getInputProps('posicion')}
            />
            <Group position="right" mt="md">
                <Button type="submit">Submit</Button>
            </Group>
        
        </form>

    );
};

export default FiltroForm;