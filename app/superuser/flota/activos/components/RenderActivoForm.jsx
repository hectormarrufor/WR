// app/superuser/flota/components/RenderActivoForm.jsx
'use client';

import { TextInput, Select, MultiSelect, NumberInput, Textarea, Accordion, Box, Grid, Title, Paper } from '@mantine/core';
import ImageDropzone from './ImageDropzone';

function RenderActivoForm({ schema, form, pathPrefix = 'datosPersonalizados' }) {
    // Protección por si el schema no es un array
    if (!Array.isArray(schema)) {
        return null;
    }

    const renderInput = (attr) => {
        // La ruta al campo en el objeto del formulario, ej: 'datosPersonalizados.motor.aceite.tipo'
        const fieldPath = `${pathPrefix}.${attr.id}`;

        switch (attr.inputType) {
            case 'select':
                return <Select
                    label={attr.label}
                    placeholder={`Seleccione ${attr.label.toLowerCase()}`}
                    data={attr.selectOptions || []}
                    {...form.getInputProps(fieldPath)}
                />;
            case 'multiSelect':
                return <MultiSelect
                    label={attr.label}
                    placeholder={`Seleccione una o más opciones`}
                    data={attr.selectOptions || []}
                    searchable
                    {...form.getInputProps(fieldPath)}
                />;
            case 'textarea':
                return <Textarea
                    label={attr.label}
                    placeholder={`Ingrese ${attr.label.toLowerCase()}`}
                    autosize
                    minRows={3}
                    {...form.getInputProps(fieldPath)}
                />;
            case 'image':
                return <ImageDropzone
                    label={attr.label}
                    form={form}
                    fieldPath={fieldPath}
                />;
            case 'number':
                return <NumberInput
                    label={attr.label}
                    placeholder={`Ingrese ${attr.label.toLowerCase()}`}
                    min={attr.min}
                    max={attr.max}
                    {...form.getInputProps(fieldPath)}
                />;
            default: // 'text', 'string', etc.
                return <TextInput
                    label={attr.label}
                    placeholder={`Ingrese ${attr.label.toLowerCase()}`}
                    {...form.getInputProps(fieldPath)}
                />;
        }
    };

    // 1. Filtramos los atributos simples (que no son ni grupo ni objeto anidado)
    const topLevelAttributes = schema.filter(attr => attr.dataType !== 'grupo' && attr.dataType !== 'object');
    
    // 2. Filtramos los atributos que son objetos anidados (como 'aceite')
    const objectAttributes = schema.filter(attr => attr.dataType === 'object' && attr.definicion);
    
    // 3. Filtramos los atributos que son componentes completos (como 'motor')
    const componentAttributes = schema.filter(attr => attr.dataType === 'grupo' && attr.componente);

    return (
        <Box>
            {/* Renderiza los atributos simples en una cuadrícula */}
            <Grid>
                {topLevelAttributes.map(attr => (
                    <Grid.Col span={{ base: 12, md: 6 }} key={attr.key || attr.id}>
                        {renderInput(attr)}
                    </Grid.Col>
                ))}
            </Grid>

            {/* ✨ NUEVA LÓGICA: Renderiza los objetos anidados dentro de un recuadro */}
            {objectAttributes.map(attr => (
                <Paper withBorder p="md" mt="lg" radius="md" key={attr.key || attr.id}>
                    <Title order={6} mb="xs">{attr.label}</Title>
                    {/* Llamada recursiva para las propiedades del objeto */}
                    <RenderActivoForm
                        schema={Object.values(attr.definicion)}
                        form={form}
                        pathPrefix={`${pathPrefix}.${attr.id}`} // ej: datosPersonalizados.motor.aceite
                    />
                </Paper>
            ))}

            {/* Renderiza los componentes anidados en un acordeón (esto ya estaba bien) */}
            {componentAttributes.length > 0 && (
                <Accordion variant="separated" mt="xl">
                    {componentAttributes.map(attr => (
                        <Accordion.Item value={attr.id} key={attr.key || attr.id}>
                            <Accordion.Control>
                                <Title order={5}>{`Datos de ${attr.label}`}</Title>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <RenderActivoForm
                                    schema={Object.values(attr.componente.especificaciones)}
                                    form={form}
                                    pathPrefix={`${pathPrefix}.${attr.id}`} // ej: datosPersonalizados.motor
                                />
                            </Accordion.Panel>
                        </Accordion.Item>
                    ))}
                </Accordion>
            )}
        </Box>
    );
}

export default RenderActivoForm;