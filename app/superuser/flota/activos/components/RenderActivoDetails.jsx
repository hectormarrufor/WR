// app/components/RenderActivoDetails.jsx
'use client';
import { Text, Paper, Title, Grid, Image, Accordion, Box } from '@mantine/core';

// Componente para mostrar un solo dato
function DetailItem({ label, value }) {
    if (!value) return null;
    return (
        <Box mb="sm">
            <Text size="sm" c="dimmed">{label}</Text>
            {label.toLowerCase().includes('imagen') && typeof value === 'string' && value.startsWith('data:image') ?
                <Image src={value} maw={240} mt={5} radius="md" /> :
                <Text fw={500}>{Array.isArray(value) ? value.join(', ') : value}</Text>
            }
        </Box>
    );
}

// Componente recursivo para renderizar la ficha
export default function RenderActivoDetails({ schema, data }) {
    if (!schema || !data) return null;

    const topLevelAttributes = schema.filter(attr => attr.dataType !== 'grupo');
    const componentAttributes = schema.filter(attr => attr.dataType === 'grupo' && attr.componente);

    return (
        <Box>
            <Grid>
                {topLevelAttributes.map(attr => (
                    <Grid.Col span={{ base: 12, md: 6 }} key={attr.key || attr.id}>
                        <DetailItem label={attr.label} value={data[attr.id]} />
                    </Grid.Col>
                ))}
            </Grid>

            {componentAttributes.length > 0 && (
                <Accordion variant="separated" mt="xl">
                    {componentAttributes.map(attr => (
                        <Accordion.Item value={attr.id} key={attr.key || attr.id}>
                            <Accordion.Control>
                                <Title order={5}>{`Detalles de ${attr.label} (${attr.componente.nombre})`}</Title>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <RenderActivoDetails
                                    schema={Object.values(attr.componente.especificaciones)}
                                    data={data[attr.id] || {}}
                                />
                            </Accordion.Panel>
                        </Accordion.Item>
                    ))}
                </Accordion>
            )}
        </Box>
    );
}