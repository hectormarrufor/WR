// app/superuser/flota/categorias/crear/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { Button, TextInput, Paper, Title, MultiSelect, Box, LoadingOverlay, Alert, Collapse, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import AtributoConstructor from '../../components/AtributoConstructor';
import { IconAlertCircle } from '@tabler/icons-react';
import BackButton from '@/app/components/BackButton';
import { useForm } from '@mantine/form';

// ✨ NUEVA FUNCIÓN HELPER: Genera un acrónimo de 3 letras
export const generarAcronimo = (nombre) => {
    if (!nombre) return '';
    // Elimina palabras comunes, toma las primeras 3 letras, y las pone en mayúsculas.
    const palabras = nombre.replace(/de|la|el/gi, '').trim().split(' ');
    if (palabras.length >= 3) {
        return (palabras[0][0] + palabras[1][0] + palabras[2][0]).toUpperCase();
    }
    return nombre.substring(0, 3).toUpperCase();
};

function transformPayloadToFormValues(payload) {
    if (!payload) return null;
    console.log("datos de payload: ", payload);
    
    function processDefinition(definicion) {
        if (!definicion || Object.keys(definicion).length === 0) return [];

        return Object.values(definicion).map(attr => {
            const newAttr = { ...attr, key: `attr_${Math.random()}` }; // Clave aleatoria para Mantine

            if (attr.dataType === 'grupo' && attr.subGrupo) {
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

            if (attr.dataType === 'object' && attr.definicion) {
                newAttr.definicion = processDefinition(attr.definicion);
            }

            return newAttr;
        });
    }

    return {
        id: payload.id,
        nombre: payload.nombre,
        definicion: processDefinition(payload.definicion),
    };
}

export default function CrearCategoriaPage() {
    const router = useRouter();
    const [grupos, setGrupos] = useState([]);
    const [selectedGrupos, setSelectedGrupos] = useState([]);
    const [initialDefinition, setInitialDefinition] = useState({});
    const [finalDefinition, setFinalDefinition] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        initialValues: {
            nombre: '',
            acronimo: '',
            definicion: [],
        },
        validate: {
            nombre: (value) => (value.trim().length > 2 ? null : 'El nombre debe tener al menos 3 caracteres'),
            acronimo: (value) => (value.trim().length === 3 ? null : 'El acrónimo debe tener 3 caracteres'),
        },
    });

    // 1. Carga todos los grupos disponibles una sola vez.
    useEffect(() => {
        async function fetchGrupos() {
            try {
                const response = await fetch('/api/gestionMantenimiento/grupos');
                if (!response.ok) throw new Error('No se pudieron cargar los grupos');
                const data = await response.json();
                console.log(data);
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

    useEffect(() => {
        const handler = setTimeout(() => {
            const nombreCategoria = form.values.nombre;
            if (nombreCategoria) {
                const acronimoSugerido = generarAcronimo(nombreCategoria);
                form.setFieldValue('acronimo', acronimoSugerido);
            }
        }, 500); // Espera 500ms después de la última pulsación

        return () => {
            clearTimeout(handler);
        };
    }, [form.values.nombre]);

    // 2. ¡AQUÍ OCURRE LA MAGIA! Este hook se ejecuta cada vez que cambia la selección de grupos.
     // 2. ¡AQUÍ OCURRE LA MAGIA! Este hook se ejecuta cada vez que cambia la selección de grupos.
    useEffect(() => {
        // Si no hay grupos seleccionados, limpia el formulario y termina.
        if (selectedGrupos.length === 0) {
            form.setFieldValue('definicion', []);
            return;
        }

        const fetchAndMergeGrupos = async () => {
            setLoading(true);
            try {
                // 1. Obtenemos los datos completos de cada grupo seleccionado.
                const fetchedGrupos = await Promise.all(
                    selectedGrupos.map(async (grupoId) => {
                        const res = await fetch(`/api/gestionMantenimiento/grupos/${grupoId}`);
                        if (!res.ok) {
                            console.error(`Error al obtener el grupo ${grupoId}`);
                            return null; // Devuelve null si hay un error para filtrarlo después
                        }
                        return res.json();
                    })
                );
                
                // Filtramos cualquier resultado nulo por si una petición falló.
                const validGrupos = fetchedGrupos.filter(g => g !== null);
                console.log("Grupos completos obtenidos:", validGrupos);

                // 2. Usamos reduce para FUSIONAR las DEFINICIONES de cada grupo en un solo objeto.
                const mergedDefinitionObject = validGrupos.reduce((acc, grupo) => {
                    // La clave: en lugar de esparcir todo el 'grupo', esparcimos 'grupo.definicion'.
                    // Esto combina las propiedades de todos los objetos 'definicion'.
                    // Si dos grupos tienen una propiedad con el mismo ID ('motor'), la del último prevalecerá,
                    // pero si tienen propiedades diferentes, todas se conservarán.
                    if (grupo && grupo.definicion) {
                        return { ...acc, ...grupo.definicion };
                    }
                    return acc;
                }, {}); // El acumulador inicial es un objeto vacío.

                console.log("Objeto de definición fusionado:", mergedDefinitionObject);
                
                // 3. Transformamos el objeto fusionado al formato que el formulario necesita.
                // Creamos un "payload" temporal solo para que la función transformadora trabaje.
                const tempPayload = {
                    nombre: form.values.nombre, // Mantenemos el nombre que ya estaba en el form
                    definicion: mergedDefinitionObject
                };

                const formValues = transformPayloadToFormValues(tempPayload);

                // 4. Actualizamos SOLAMENTE el campo 'definicion' del formulario.
                // Así no borramos el nombre de la categoría que el usuario ya pudo haber escrito.
                if (formValues && formValues.definicion) {
                    form.setFieldValue('definicion', formValues.definicion);
                }

            } catch (err) {
                notifications.show({
                    title: 'Error al procesar grupos',
                    message: err.message,
                    color: 'red',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAndMergeGrupos();
        // La dependencia clave que dispara la actualización automática.
        // No es necesario 'grupos' aquí, solo reaccionar al cambio de selección.
    }, [selectedGrupos]);

    useEffect(() => { console.log(form.values) }, [form.values]); // Para depurar los valores del formulario

    // La dependencia clave que dispara la actualización automática.



    const handleSubmit = async () => {
        if (!form.values.nombre || selectedGrupos.length === 0) {
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
                nombre: form.values.nombre,
                definicion: form.values.definicion, // Esta es la definición final, potencialmente modificada por el usuario.
                gruposBaseIds: selectedGrupos.map(id => parseInt(id)),
                acronimo: form.values.acronimo
            };
            console.log("Payload de creación:", payload);
            // setIsSubmitting(false);
            // return
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
        <Paper   shadow="md" p={30} mt={30} radius="md" style={{ position: 'relative' }}>
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
                value={form.values.nombre}
                onChange={(event) => form.setFieldValue('nombre', event.currentTarget.value.toUpperCase().replace(' ', '_'))}
                required
                mb="md"
            />
            <TextInput
                label="Acronimo (Importante para definir códigos de activos)"
                placeholder="Ej: CAM (Camioneta), CHT (Chuto), SNU (UNIDAD_SNUBBING) "
                value={form.values.acronimo}
                onChange={(event) => form.setFieldValue('acronimo', event.currentTarget.value.toUpperCase().replace(' ', '_'))}
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
                        form={form} // Pasamos el formulario para manejar la validación y el estado
                        from="Categoria"
                    />
                </Box>
            </Collapse>

            <Button fullWidth mt="xl" onClick={handleSubmit} disabled={loading || isSubmitting}>
                Crear Categoría
            </Button>
        </Paper>
    );
}