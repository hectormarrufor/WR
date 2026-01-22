"use client";

import { useEffect, useState } from "react";
import { Container, Title, SimpleGrid, Paper, Text, Table, Badge, Stack, Group, Center } from "@mantine/core";
import { IconShirt, IconShoe, IconAffiliate } from "@tabler/icons-react";

export default function DotacionReportPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/rrhh/reporte-tallas")
            .then(res => res.json())
            .then(data => {
                console.log(data);
                setData(data);
                setLoading(false);
            });
    }, []);


    if (loading) return <Center>Cargando reporte...</Center>;

    if (data.length === 0) return <Center>No hay datos para mostrar</Center>;

    return (
        <Container size="xl" py="xl">
            <Title order={2} mb="xl">Necesidades de Dotación (Personal Activo)</Title>

            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                {/* TARJETA ZAPATOS */}
                <TallaCard
                    titulo="Calzado de Seguridad"
                    icon={<IconShoe size={24} />}
                    color="blue"
                    items={data.zapatos}
                    keyName="tallaZapato"
                />

                {/* TARJETA CAMISAS */}
                <TallaCard
                    titulo="Camisas / Uniformes"
                    icon={<IconShirt size={24} />}
                    color="orange"
                    items={data.camisas}
                    keyName="tallaCamisa"
                />

                {/* TARJETA PANTALONES */}
                <TallaCard
                    titulo="Pantalones / Bragas"
                    icon={<IconAffiliate size={24} />}
                    color="teal"
                    items={data.pantalones}
                    keyName="tallaPantalon"
                />
            </SimpleGrid>
        </Container>
    );
}


function TallaCard({ titulo, icon, color, items, keyName }) {
    return (
        <Paper shadow="sm" p="md" withBorder radius="md">
            <Group mb="md">
                <Badge size="xl" circle color={color} variant="light">{icon}</Badge>
                <Text fw={700} size="lg">{titulo}</Text>
            </Group>

            <Table verticalSpacing="xs">
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Talla</Table.Th>
                        <Table.Th ta="right">Cantidad (Und)</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {items?.map((item, index) => (
                        <Table.Tr key={index}>
                            <Table.Td><Text fw={500}>{item[keyName] || "S/T"}</Text></Table.Td>
                            <Table.Td ta="right"><Badge variant="outline" color={color}>{item.total}</Badge></Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </Paper>
    );
}