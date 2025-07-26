// app/superuser/flota/categorias/crear/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { Button, TextInput, Paper, Title, MultiSelect, Box, LoadingOverlay, Alert, Collapse, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import AtributoConstructor from '../../components/AtributoConstructor';
import { IconAlertCircle } from '@tabler/icons-react';
import BackButton from '@/app/components/BackButton';



export default function CrearCategoriaPage() {
    const router = useRouter();
    const [nombre, setNombre] = useState('');
    const [grupos, setGrupos] = useState([]);
    const [selectedGrupos, setSelectedGrupos] = useState([]);
    const [initialDefinition, setInitialDefinition] = useState({});
    const [finalDefinition, setFinalDefinition] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. Carga todos los grupos disponibles una sola vez.
    useEffect(() => {
        async function fetchGrupos() {
            try {
                const response = await fetch('/api/gestionMantenimiento/grupos');
                if (!response.ok) throw new Error('No se pudieron cargar los grupos');
                const data = await response.json();
                setGrupos(data.map(g => ({ value: g.id.toString(), label: g.nombre, definicion: g.definicion })));
            } catch (err) {
                setError(err.message);
                notifications.show({
                    title: 'Error de Carga',
                    message: 'No se pudieron cargar los grupos base.',
                    color: 'red',
                });
            } finally {
                setLoading(false);
            }
        }
        fetchGrupos();
    }, []);

    // 2. ¡AQUÍ OCURRE LA MAGIA! Este hook se ejecuta cada vez que cambia la selección de grupos.
    useEffect(() => {
        // Si hay grupos seleccionados...
        if (selectedGrupos.length > 0) {
            // ...usamos reduce para fusionar las definiciones de cada grupo seleccionado en un solo objeto.
            const mergedDefinition = selectedGrupos.reduce((acc, grupoId) => {
                const grupo = grupos.find(g => g.value === grupoId);
                // Si el grupo existe y tiene una definición, sus propiedades se añaden al acumulador.
                // Si una propiedad ya existe (ej. 'motor'), la del último grupo seleccionado en la lista prevalecerá.
                if (grupo && grupo.definicion) {
                    return { ...acc, ...grupo.definicion };
                }
                return acc;
            }, {});
            
            // 3. Actualizamos el estado con la nueva definición combinada.
            setInitialDefinition(mergedDefinition);
        } else {
            // Si no hay grupos seleccionados, la definición inicial está vacía.
            setInitialDefinition({});
        }
    }, [selectedGrupos, grupos]); // La dependencia clave que dispara la actualización automática.

    const handleSubmit = async () => {
        if (!nombre || selectedGrupos.length === 0) {
            notifications.show({
                title: 'Campos Incompletos',
                message: 'Por favor, asigna un nombre a la categoría y selecciona al menos un grupo base.',
                color: 'yellow',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                nombre,
                definicion: finalDefinition, // Esta es la definición final, potencialmente modificada por el usuario.
                gruposBaseIds: selectedGrupos.map(id => parseInt(id)),
            };

            const response = await fetch('/api/gestionMantenimiento/categorias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al crear la categoría');
            }

            const data = await response.json();
            notifications.show({
                title: 'Éxito',
                message: `Categoría "${data.nombre}" creada exitosamente.`,
                color: 'green',
            });
            router.push('/superuser/flota/categorias'); 

        } catch (err) {
            notifications.show({
                title: 'Error en Creación',
                message: err.message,
                color: 'red',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{ position: 'relative' }}>
            <LoadingOverlay visible={loading || isSubmitting} overlayProps={{ radius: "sm", blur: 2 }} />
             <Group justify="space-between" mb="xl">
                <Title order={2}>
                    Crear Nueva Categoría de Activo
                </Title>
                <BackButton />
            </Group>

            {error && (
                 <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" mb="lg">
                    {error}
                </Alert>
            )}

            <TextInput
                label="Nombre de la Categoría"
                placeholder="Ej: CAMIONETA, CHUTO, UNIDAD_SNUBBING"
                value={nombre}
                onChange={(event) => setNombre(event.currentTarget.value.toUpperCase())}
                required
                mb="md"
            />

            <MultiSelect
                label="Selecciona Grupo(s) Base"
                placeholder="Puedes seleccionar uno o más grupos para heredar sus propiedades"
                data={grupos}
                value={selectedGrupos}
                onChange={setSelectedGrupos}
                searchable
                required
                mb="xl"
            />
            
            {/* 4. El AtributoConstructor se renderiza aquí, dentro de un Collapse para un efecto visual */}
            <Collapse in={selectedGrupos.length > 0}>
                <Box>
                    <Title order={4} mb="sm">Definición de Atributos Heredados y Nuevos</Title>
                    <Text size="sm" c="dimmed" mb="md">
                        Las propiedades de los grupos base se han cargado. Puedes modificarlas o añadir nuevos atributos específicos para esta categoría.
                    </Text>
                    <AtributoConstructor
                        initialData={initialDefinition} // Le pasamos la definición fusionada como estado inicial
                        onDefinitionChange={setFinalDefinition} // Nos devuelve la definición final para enviarla a la API
                        level="categoria"
                    />
                </Box>
            </Collapse>

            <Button fullWidth mt="xl" onClick={handleSubmit} disabled={loading || isSubmitting}>
                Crear Categoría
            </Button>
        </Paper>
    );
}