'use client';

import { TextInput, Select, MultiSelect, NumberInput, Textarea, Accordion, Box, Grid, Title, Paper, TagsInput } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

// ✨ NUEVO COMPONENTE PARA EL FORMULARIO DE ACTIVO ✨
function ActivoConsumibleSelect({ attribute, form, fieldPath, modeloId }) {
    const [opciones, setOpciones] = useState([]);

    useEffect(() => {
        if (modeloId) {
            // Pedimos a la API los consumibles que ya sabemos que son compatibles con este modelo
            fetch(`/api/gestionMantenimiento/modelos-activos/${modeloId}/consumibles-compatibles?atributoId=${attribute.id}`)
                .then(res => res.json())
                .then(data => {
                    setOpciones(data.map(c => ({
                        value: c.id.toString(),
                        label: `${c.nombre} (Marca: ${c.marca})`
                    })));
                });
        }
    }, [modeloId, attribute.id]);

    return (
        <Select
            label={attribute.label}
            data={opciones}
            {...form.getInputProps(fieldPath)}
        />
    );
}

// Este componente es recursivo para manejar la jerarquía de componentes (ej. Motor dentro de Camioneta)
export default function RenderActivoForm({ schema, form, pathPrefix = 'datosPersonalizados' }) {
    if (!schema) return null;

    // Convertimos el objeto de especificaciones a un array para poder mapearlo
    const schemaArray = Array.isArray(schema) ? schema : Object.values(schema);

    const renderInput = (attr) => {
        const fieldPath = `${pathPrefix}.${attr.id}`;

        // ✨ LÓGICA INTELIGENTE: Si el atributo es un consumible, usa el Select especial ✨
        if (attr.consumibleType) {
            return <ActivoConsumibleSelect attribute={attr} form={form} fieldPath={fieldPath} modeloId={form.values.modeloId} />;
        }
        // ✨ LÓGICA CLAVE: Determinamos si el campo debe estar bloqueado ✨
        // Un campo se bloquea si tiene un `defaultValue` que no sea nulo o vacío.
        const isLocked = attr.defaultValue !== null && attr.defaultValue !== undefined && attr.defaultValue !== '';

        // Ahora, en cada componente, añadimos la propiedad `disabled={isLocked}`.
        if (attr.inputType === 'multiSelect') {
            return <Select data={attr.selectOptions || []} searchable multiple label={attr.label}  {...form.getInputProps(fieldPath)} />;
        }
        if (attr.inputType === 'select') {
            return <Select data={attr.selectOptions || []} searchable label={attr.label} {...form.getInputProps(fieldPath)} />;
        }
        if (attr.inputType === 'number') {
            return <NumberInput label={attr.label} min={attr.min} max={attr.max}  {...form.getInputProps(fieldPath)} />;
        }
        return <TextInput label={attr.label}  {...form.getInputProps(fieldPath)} />;
    };

    const topLevelAttributes = schemaArray.filter(attr => attr.dataType !== 'grupo' && attr.dataType !== 'object');
    const objectAttributes = schemaArray.filter(attr => attr.dataType === 'object');
    const componentAttributes = schemaArray.filter(attr => attr.dataType === 'grupo' && attr.componente);

    return (
        <Box>
            <Grid>
                {topLevelAttributes.map(attr => (
                    <Grid.Col span={{ base: 12, md: 6 }} key={attr.id}>
                        {renderInput(attr)}
                    </Grid.Col>
                ))}
            </Grid>

            {objectAttributes.map(attr => (
                <Paper withBorder p="md" mt="lg" radius="md" key={attr.id}>
                    <Title order={6} mb="xs">{attr.label}</Title>
                    <RenderActivoForm
                        schema={attr.definicion}
                        form={form}
                        pathPrefix={`${pathPrefix}.${attr.id}`}
                    />
                </Paper>
            ))}

            {componentAttributes.length > 0 && (
                <Accordion variant="separated" mt="xl">
                    {componentAttributes.map(attr => (
                        <Accordion.Item value={attr.id} key={attr.id}>
                            <Accordion.Control>
                                <Title order={5}>{`Datos de ${attr.label} (${attr.componente.nombre})`}</Title>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <RenderActivoForm
                                    schema={attr.componente.especificaciones}
                                    form={form}
                                    pathPrefix={`${pathPrefix}.${attr.id}`}
                                />
                            </Accordion.Panel>
                        </Accordion.Item>
                    ))}
                </Accordion>
            )}
        </Box>
    );
}