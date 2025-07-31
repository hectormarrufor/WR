// app/superuser/flota/categorias/[id]/editar/page.jsx
'use client';

import { useState, useEffect, use } from 'react';
import { Button, TextInput, Paper, Title, MultiSelect, Box, LoadingOverlay, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter, useParams } from 'next/navigation';
import AtributoConstructor from '../../../components/AtributoConstructor';
import { IconAlertCircle } from '@tabler/icons-react';
import BackButton from '@/app/components/BackButton';

export default function EditarCategoriaPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = use(params);

    const [nombre, setNombre] = useState('');
    const [grupos, setGrupos] = useState([]); // Todos los grupos disponibles
    const [selectedGrupos, setSelectedGrupos] = useState([]);
    const [initialDefinition, setInitialDefinition] = useState({});
    const [finalDefinition, setFinalDefinition] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cargar todos los grupos disponibles para el MultiSelect
    useEffect(() => {
        async function fetchGrupos() {
            try {
                const response = await fetch('/api/gestionMantenimiento/grupos');
                if (!response.ok) throw new Error('No se pudieron cargar los grupos');
                const data = await response.json();
                setGrupos(data.map(g => ({ value: g.id.toString(), label: g.nombre, definicion: g.definicion })));
            } catch (err) {
                 setError('Error de Carga: No se pudieron cargar los grupos base.');
            }
        }
        fetchGrupos();
    }, []);

    // Cargar los datos de la categoría específica a editar
    useEffect(() => {
        if (!id) return;
        async function fetchCategoriaData() {
            try {
                setLoading(true);
                const response = await fetch(`/api/gestionMantenimiento/categorias/${id}`);
                if (!response.ok) throw new Error('No se pudo cargar la categoría');
                const data = await response.json();
                
                setNombre(data.nombre);
                setSelectedGrupos(data.grupos.map(g => g.id.toString()));
                setInitialDefinition(data.definicion); // Usar la definición guardada de la categoría
                
            } catch (err) {
                 setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchCategoriaData();
    }, [id]);


    const handleSubmit = async () => {
        if (!nombre || selectedGrupos.length === 0) {
            notifications.show({
                title: 'Campos Incompletos',
                message: 'Por favor, asigna un nombre y selecciona al menos un grupo base.',
                color: 'yellow',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                nombre,
                definicion: finalDefinition,
                gruposBaseIds: selectedGrupos.map(gid => parseInt(gid)),
            };

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
            <Paper withBorder p={30} mt={30}>
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
        <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{ position: 'relative' }}>
            <LoadingOverlay visible={isSubmitting} overlayProps={{ radius: "sm", blur: 2 }} />
             <Group justify="space-between" mb="xl">
                <Title order={2}>
                    Editar Categoría: {nombre}
                </Title>
                <BackButton />
            </Group>

            <TextInput
                label="Nombre de la Categoría"
                placeholder="Ej: CAMIONETA, CHUTO"
                value={nombre}
                onChange={(event) => setNombre(event.currentTarget.value.toUpperCase())}
                required
                mb="md"
            />

            <MultiSelect
                label="Selecciona Grupo(s) Base"
                placeholder="Puedes cambiar los grupos base"
                data={grupos}
                value={selectedGrupos}
                onChange={setSelectedGrupos}
                searchable
                required
                mb="xl"
                disabled // Deshabilitado por ahora para evitar complejidad al fusionar definiciones. Se puede habilitar en el futuro.
            />

            <Box>
                <Title order={4} mb="sm">Definición de Atributos</Title>
                <AtributoConstructor
                    initialData={initialDefinition}
                    onDefinitionChange={setFinalDefinition}
                    level="categoria"
                />
            </Box>

            <Button fullWidth mt="xl" onClick={handleSubmit} disabled={isSubmitting}>
                Guardar Cambios
            </Button>
        </Paper>
    );
}