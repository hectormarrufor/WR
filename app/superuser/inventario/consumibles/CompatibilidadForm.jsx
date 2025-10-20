'use client';
import { useState } from 'react';
import { useForm } from '@mantine/form';
import { Button, Group, Box, Paper, Text, ActionIcon, Loader, Checkbox, Title, Collapse } from '@mantine/core';
import { IconTrash, IconSearch } from '@tabler/icons-react';

export default function CompatibilidadForm({ form }) {
    const [sugerencias, setSugerencias] = useState([]);
    const [loading, setLoading] = useState(false);

    // Formulario local para la búsqueda y selección de sugerencias
    const sugerenciasForm = useForm({
        initialValues: {
            seleccion: [] // Array de strings JSON de las sugerencias seleccionadas
        }
    });

    // Función que se dispara al buscar
    const buscarCompatibilidades = async () => {
        // Usamos el 'nombre' o 'sku' del consumible como término de búsqueda
        const searchTerm = form.values.nombre || form.values.sku;
        if (!searchTerm) {
            alert('Por favor, introduce un nombre o SKU para el consumible antes de buscar.');
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`/api/inventario/compatibilidad/buscar?term=${encodeURIComponent(searchTerm)}`);
            const data = await response.json();
            setSugerencias(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Función para añadir las compatibilidades seleccionadas al formulario principal
    const addCompatibilidades = () => {
        const seleccionadas = sugerenciasForm.values.seleccion.map(s => JSON.parse(s));
        
        // Filtramos para no añadir duplicados
        const compatibilidadesActuales = form.values.compatibilidades || [];
        const nuevas = seleccionadas.filter(sel => 
            !compatibilidadesActuales.some(curr => curr.modeloId === sel.modeloId && curr.atributoId === sel.atributoId)
        );

        form.setFieldValue('compatibilidades', [...compatibilidadesActuales, ...nuevas]);
        sugerenciasForm.reset(); // Limpiamos la selección
    };

    const removeCompatibilidad = (index) => {
        form.setFieldValue('compatibilidades', form.values.compatibilidades.filter((_, i) => i !== index));
    };

    return (
        <Paper   p="md" mt="lg">
            <Title order={5}>Compatibilidad Automática</Title>
            <Text size="sm" c="dimmed">Busca automáticamente los modelos que son compatibles con este consumible.</Text>
            
            <Group mt="md">
                <Button onClick={buscarCompatibilidades} leftSection={<IconSearch size={16} />} loading={loading}>
                    Buscar Modelos Compatibles
                </Button>
            </Group>

            <Collapse in={sugerencias.length > 0}>
                <Box mt="md">
                    <Text fw={500}>Sugerencias encontradas:</Text>
                    <Checkbox.Group {...sugerenciasForm.getInputProps('seleccion')}>
                        <Group mt="xs" direction="column" gap="xs">
                            {sugerencias.map((sug, index) => (
                                <Checkbox 
                                    key={`${sug.modeloId}-${sug.atributoId}`} 
                                    value={JSON.stringify(sug)} // Guardamos el objeto completo como string
                                    label={`${sug.modeloNombre} > ${sug.atributoLabel}`} 
                                />
                            ))}
                        </Group>
                    </Checkbox.Group>
                    <Button onClick={addCompatibilidades} mt="sm" disabled={sugerenciasForm.values.seleccion.length === 0}>
                        Añadir Seleccionados
                    </Button>
                </Box>
            </Collapse>

            <Box mt="xl">
                <Text size="sm" fw={500}>Compatibilidades Asignadas:</Text>
                {(!form.values.compatibilidades || form.values.compatibilidades.length === 0) && (
                    <Text size="sm" c="dimmed" mt={5}>Aún no se han añadido compatibilidades.</Text>
                )}
                {(form.values.compatibilidades || []).map((comp, index) => (
                    <Paper   p="xs" radius="sm" key={index} mt={5}>
                        <Group justify="space-between">
                            <Text size="sm">
                                <Text span fw={700}>{comp.modeloNombre || comp.modeloLabel}</Text> &gt; {comp.atributoLabel}
                            </Text>
                            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeCompatibilidad(index)}>
                                <IconTrash size={14} />
                            </ActionIcon>
                        </Group>
                    </Paper>
                ))}
            </Box>
        </Paper>
    );
}