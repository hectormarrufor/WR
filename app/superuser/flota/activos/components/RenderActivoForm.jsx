// src/app/superuser/flota/components/ActivoConsumibleSelect.jsx (NUEVO ARCHIVO)
'use client';

import { TextInput, Select, MultiSelect, NumberInput, Textarea, Accordion, Box, Grid, Title, Paper, TagsInput, Collapse, Group, Text, Loader } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';

function ActivoConsumibleSelect({ attribute, form, fieldPath }) {
    const [opciones, setOpciones] = useState([]);
    const [loading, setLoading] = useState(false);
    const selectedConsumible = form.getInputProps(fieldPath).value;

    useEffect(() => {
        const fetchCompatibles = async () => {
            if (!attribute.compatibilidad) {
                setOpciones([]);
                return;
            }

            setLoading(true);
            const { mode, consumibleIds, propiedades } = attribute.compatibilidad;
            let query = new URLSearchParams();
            query.append('tipo', attribute.consumibleType);

            if (mode === 'directa' && consumibleIds?.length > 0) {
                query.append('ids', consumibleIds.join(','));
            } else if (mode === 'porPropiedades' && propiedades) {
                query.append('especificaciones', JSON.stringify(propiedades));
            } else {
                setLoading(false);
                setOpciones([]);
                return;
            }

            try {
                const response = await fetch(`/api/inventario/consumibles?${query.toString()}`);
                if (!response.ok) {
                    throw new Error('Error al cargar consumibles compatibles');
                }
                const data = await response.json();
                const formattedData = data.map(c => ({
                    value: c.id.toString(),
                    label: `${c.nombre} (Marca: ${c.marca})`,
                }));
                setOpciones(formattedData);
            } catch (error) {
                console.error(error);
                notifications.show({ title: 'Error', message: error.message, color: 'red' });
                setOpciones([]);
            } finally {
                setLoading(false);
            }
        };
        fetchCompatibles();
    }, [attribute.compatibilidad, attribute.consumibleType]);

    return (
        <>
            <Select
                label={attribute.label}
                data={opciones}
                {...form.getInputProps(fieldPath)}
                disabled={loading}
                placeholder={loading ? 'Cargando...' : 'Selecciona un consumible'}
            />
            <Collapse in={!!selectedConsumible}>
                <Paper   p="xs" mt="xs" radius="sm">
                    <Text size="xs" fw={500}>Datos de Instalación (Opcional, para piezas ya instaladas)</Text>
                    <Group grow mt="xs">
                        <DateInput
                            label="Fecha de Instalación"
                            valueFormat="DD/MM/YYYY"
                            {...form.getInputProps(`${fieldPath}.fechaInstalacion`)}
                        />
                        <NumberInput
                            label="KM de Instalación"
                            {...form.getInputProps(`${fieldPath}.kmInstalacion`)}
                        />
                    </Group>
                </Paper>
            </Collapse>
        </>
    );
}

export default function RenderActivoForm({ schema, form, pathPrefix = 'datosPersonalizados', modeloId }) {
    if (!schema) return null;

    const schemaArray = Array.isArray(schema) ? schema : Object.values(schema);

    const renderInput = (attr) => {
        const fieldPath = `${pathPrefix}.${attr.id}`;
        const isLocked = attr.defaultValue !== null && attr.defaultValue !== undefined && attr.defaultValue !== '';
        
        if (attr.consumibleType) {
            return <ActivoConsumibleSelect attribute={attr} form={form} fieldPath={fieldPath} modeloId={modeloId} />;
        }
        
        if (attr.inputType === 'multiSelect') {
            return <Select data={attr.selectOptions || []} searchable multiple label={attr.label} disabled={isLocked} {...form.getInputProps(fieldPath)} />;
        }
        if (attr.inputType === 'select') {
            return <Select data={attr.selectOptions || []} searchable label={attr.label} disabled={isLocked} {...form.getInputProps(fieldPath)} />;
        }
        if (attr.dataType === 'number') {
            return <NumberInput label={attr.label} min={attr.min} max={attr.max} disabled={isLocked} {...form.getInputProps(fieldPath)} />;
        }
        return <TextInput label={attr.label} disabled={isLocked} {...form.getInputProps(fieldPath)} />;
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
                <Paper   p="md" mt="lg" radius="md" key={attr.id}>
                    <Title order={6} mb="xs">{attr.label}</Title>
                    <RenderActivoForm
                        schema={attr.definicion}
                        form={form}
                        pathPrefix={`${pathPrefix}.${attr.id}`}
                        modeloId={modeloId}
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
                                    modeloId={modeloId}
                                />
                            </Accordion.Panel>
                        </Accordion.Item>
                    ))}
                </Accordion>
            )}
        </Box>
    );
}