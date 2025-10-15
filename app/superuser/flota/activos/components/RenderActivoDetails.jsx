'use client';
import { Text, Paper, Title, Grid, Image, Accordion, Box, Divider, SimpleGrid } from '@mantine/core';

// Componente para mostrar un solo dato (con mejoras)
function DetailItem({ label, value }) {
    // No renderizar si el valor es nulo, indefinido o un string vacío.
    if (value === null || value === undefined || value === '') return null;

    // ✨ CORRECCIÓN: Ahora también muestra imágenes desde una URL (Vercel Blob)

    return (
        <Box mb="sm">
            <Text size="sm" c="dimmed">{label}</Text>
            <Text fw={500}>{Array.isArray(value) ? value.join(', ') : String(value)}</Text>
        </Box>
    );
}

// Componente recursivo para renderizar la ficha (con la lógica corregida)
export default function RenderActivoDetails({ schema, data }) {
    if (!schema || !data) return null;

    // Aseguramos que el schema sea siempre un array para poder filtrarlo
    const schemaArray = Array.isArray(schema) ? schema : Object.values(schema);

    // ✨ CORRECCIÓN: Ahora separamos los atributos en 3 tipos para manejarlos correctamente
    const simpleAttributes = schemaArray.filter(attr => attr.dataType !== 'grupo' && attr.dataType !== 'object');
    const objectAttributes = schemaArray.filter(attr => attr.dataType === 'object' && data[attr.id]);
    const componentAttributes = schemaArray.filter(attr => attr.dataType === 'grupo' && attr.componente && data[attr.id]);

    return (
        <Box>
            {/* 1. Renderiza los atributos simples en una cuadrícula */}
            <SimpleGrid cols={{ base: 1, sm: 3, md: 4 }} spacing="lg" mb="xl">
                {simpleAttributes.map((attr, x) => (
                        <DetailItem key={x} label={attr.label} value={data[attr.id]} />
                ))}
            </SimpleGrid>

            {/* 2. Renderiza los atributos de tipo objeto en su propio recuadro */}
            {objectAttributes.map(attr => (
                <Paper withBorder p="md" mt="lg" radius="md" key={attr.id}>
                    <Title order={6} mb="xs">{attr.label}</Title>
                    {/* Llamada recursiva para las propiedades del objeto */}
                    <RenderActivoDetails
                        schema={attr.definicion} // Pasamos la definición del objeto
                        data={data[attr.id] || {}} // Pasamos los datos del objeto
                    />
                </Paper>
            ))}

            {/* 3. Renderiza los componentes anidados en un acordeón (sin cambios) */}
            {componentAttributes.length > 0 && (

                
                    componentAttributes.map(attr => 
                        <>
                            <Title order={5}>{`Detalles de ${attr.label} (${attr.componente.nombre})`}</Title>
                            <Divider my="sm" />
                            <RenderActivoDetails
                                schema={Object.values(attr.componente.especificaciones)}
                                data={data[attr.id] || {}}
                            />
                        </>

                    )
                

            )}
        </Box>
    );
}