// app/superuser/flota/categorias/[id]/editar/page.jsx
'use client';

import { useState, useEffect, use } from 'react';
import { Button, Paper, Title, Box, LoadingOverlay, Alert, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter, useParams } from 'next/navigation';
import AtributoConstructor from '../../../components/AtributoConstructor';
import { IconAlertCircle } from '@tabler/icons-react';
import BackButton from '@/app/components/BackButton';
import { useForm } from '@mantine/form';

function transformPayloadToFormValues(payload) {
    if (!payload) return null;
    console.log("datos de payload: ", payload);

    function processDefinition(definicion) {
        if (!definicion || Object.keys(definicion).length === 0) return [];
        
        return Object.values(definicion).map(attr => {
            const newAttr = { ...attr, key: `attr_${Math.random()}` }; // Clave aleatoria para Mantine
            
            if(attr.dataType === 'grupo') {
                newAttr.mode = 'define';
                const subGrupoFormValues = transformPayloadToFormValues(attr.subGrupo);
                newAttr.subGrupo = {
                    key: `sub_${Math.random()}`,
                    nombre: subGrupoFormValues.nombre,
                    definicion: subGrupoFormValues.definicion,
                };
            } else if (attr.dataType === 'grupo' && attr.refId) {
                newAttr.mode = 'select';
            }

            if(attr.dataType === 'object' && attr.definicion) {
                newAttr.definicion = processDefinition(attr.definicion);
            }

            return newAttr;
        });
    }

    return {
        id: payload.id,
        nombre: payload.nombre,
        definicion: processDefinition(payload.definicion),
        acronimo: payload.acronimo,
    };
}

export default function EditarCategoriaPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;

    const [selectedGrupos, setSelectedGrupos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        initialValues: {
            id: '',
            nombre: '',
            acronimo: '',
            definicion: [],
        },
        validate: {
            nombre: (value) => (value.trim().length > 2 ? null : 'El nombre debe tener al menos 3 caracteres'),
            acronimo: (value) => (value.trim().length === 3 ? null : 'El acrónimo debe tener 3 caracteres'),
        },
    });

    // Cargar los datos de la categoría específica a editar
    useEffect(() => {
        if (!id) return;
        async function fetchCategoriaData() {
            try {
                setLoading(true);
                const response = await fetch(`/api/gestionMantenimiento/categorias/${id}`);
                if (!response.ok) throw new Error('No se pudo cargar la categoría');
                const data = await response.json();
                form.setValues({...transformPayloadToFormValues(data), acronimo: data.acronimo });

            } catch (err) {
                setError(`error al cargar los datos de la categoria especifica a editar: ${err.message}`);
            } finally {
                setLoading(false);
            }
        }
        fetchCategoriaData();
    }, [id]);


    const handleSubmit = async () => {
        const { nombre } = form.values;

        setIsSubmitting(true);
        try {
            const payload = form.values;

            const response = await fetch(`/api/gestionMantenimiento/categorias/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al actualizar la categoría');
            }

            notifications.show({
                title: 'Éxito',
                message: `Categoría "${nombre}" actualizada exitosamente.`,
                color: 'green',
            });
            router.push('/superuser/flota/categorias');

        } catch (err) {
            notifications.show({
                title: 'Error en Actualización',
                message: err.message,
                color: 'red',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <LoadingOverlay visible={true} />;
    }

    if (error) {
        return (
            <Paper p={30} mt={30}>
                <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
                    {error}
                </Alert>
                <Group justify="center" mt="lg">
                    <BackButton />
                </Group>
            </Paper>
        );
    }

    return (
        <Paper shadow="md" p={30} mt={30} radius="md" style={{ position: 'relative' }}>
            <LoadingOverlay visible={isSubmitting} overlayProps={{ radius: "sm", blur: 2 }} />
            <Group justify="space-between" mb="xl">
                <Title order={2}>
                    Editar Categoría: {form?.nombre}
                </Title>
                <BackButton />
            </Group>


            <Box>
                {form && <AtributoConstructor
                    form={form}
                />}
            </Box>

            <Button fullWidth mt="xl" onClick={handleSubmit} disabled={isSubmitting}>
                Guardar Cambios
            </Button>
        </Paper>
    );
}