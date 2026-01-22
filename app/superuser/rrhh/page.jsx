// app/superuser/rrhh/page.jsx
'use client';
import { Container, Paper, Title, Text, SimpleGrid, ThemeIcon, Group, UnstyledButton } from '@mantine/core';
import Link from 'next/link';
import { FaUsers, FaBriefcase, FaTshirt, FaBuilding } from 'react-icons/fa';
import classes from '../superuser.module.css'; // Usamos el CSS module para estilos

const mockdata = [
    { 
      title: 'Gestión de Empleados', 
      icon: FaUsers, 
      color: 'blue', 
      href: '/superuser/rrhh/empleados',
      description: 'Crear, editar y consultar la ficha de todo el personal.'
    },
    { 
      title: 'Gestión de Puestos', 
      icon: FaBriefcase, 
      color: 'teal', 
      href: '/superuser/rrhh/puestos',
      description: 'Definir los cargos, roles y responsabilidades de la organización.'
    },
    { 
      title: 'Gestión de Departamentos', 
      icon: FaBuilding, 
      color: 'violet', 
      href: '/superuser/rrhh/departamentos',
      description: 'Organizar la empresa en áreas como Operaciones, Mantenimiento, etc.'
    },
    { 
      title: 'Dotación de Indumentaria', 
      icon: FaTshirt, 
      color: 'grape', 
      href: '/superuser/rrhh/dotacion',
      description: 'Contabilizar tallas y necesidades de uniformes y equipos de seguridad.'
    },
];

export default function RRHHPage() {
    const items = mockdata.map((item) => (
        <UnstyledButton component={Link} href={item.href} key={item.title} className={classes.item}>
            <ThemeIcon color={item.color} variant="light" size={60}>
                <item.icon size="1.8rem" />
            </ThemeIcon>
            <Text size="sm" mt="sm" weight={500}>
                {item.title}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
                {item.description}
            </Text>
        </UnstyledButton>
    ));

    return (
        <Container fluid>
            <Paper   shadow="md" p={30} mt={70} radius="md">
                <Title order={2} ta="center" mb="lg">
                    Módulo de Recursos Humanos
                </Title>
                <Text c="dimmed" ta="center" mb="xl">
                    Seleccione una sección para administrar el personal y la estructura organizativa.
                </Text>

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                    {items}
                </SimpleGrid>
            </Paper>
        </Container>
    );
}