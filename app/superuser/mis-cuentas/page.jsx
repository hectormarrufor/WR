"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Importar useRouter
import {
    Container, Title, Button, Group, SimpleGrid, Card, Text,
    Badge, ActionIcon, Modal, TextInput, Select, NumberInput,
    Stack, LoadingOverlay, ThemeIcon, Menu, Box, Alert, Center, Loader
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
    IconPlus, IconBuildingBank, IconDotsVertical, IconEdit,
    IconTrash, IconAlertCircle, IconChevronLeft // Importar IconChevronLeft
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { AsyncCatalogComboBox } from "@/app/components/CatalogCombobox";

export default function GestionCuentasPage() {
    const router = useRouter(); // Inicializar router
    const [cuentas, setCuentas] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados visuales
    const [opened, setOpened] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // 1. USEFORM CONFIGURADO
    const form = useForm({
        initialValues: {
            id: null,
            nombreBanco: "",
            titularCuenta: "Transporte Dadica",
            cedulaCuenta: "", 
            numeroCuenta: "",
            tipoCuenta: "Corriente",
            moneda: "VES",
            saldoActual: 0,
        },
        validate: {
            nombreBanco: (value) => (value ? null : 'Selecciona un banco'),
            numeroCuenta: (value) => (value.length < 5 ? 'Número muy corto' : null),
            titularCuenta: (value) => (value ? null : 'Requerido'),
            cedulaCuenta: (value) => (value ? null : 'Requerido'),
        },
    });

    // Cargar cuentas
    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/tesoreria/cuentas-bancarias");
            const data = await res.json();
            if (Array.isArray(data)) setCuentas(data);
        } catch (error) {
            console.error(error);
            notifications.show({ title: "Error", message: "No se pudieron cargar las cuentas", color: "red" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Guardar (Crear o Editar)
    const handleSubmit = async (values) => {
        setSaving(true);
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch("/api/tesoreria/cuentas-bancarias", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Error al guardar");

            notifications.show({ title: "Éxito", message: "Cuenta guardada correctamente", color: "green" });
            fetchData();
            setOpened(false);
            form.reset();
        } catch (error) {
            notifications.show({ title: "Error", message: error.message, color: "red" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Seguro que deseas eliminar esta cuenta?")) return;
        try {
            await fetch(`/api/tesoreria/cuentas-bancarias?id=${id}`, { method: 'DELETE' });
            notifications.show({ title: "Eliminado", message: "Cuenta eliminada", color: "blue" });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const openCreate = () => {
        setIsEditing(false);
        form.reset();
        form.setValues({
            nombreBanco: "",
            titularCuenta: "Transporte Dadica",
            tipoCuenta: "Corriente",
            moneda: "VES",
            saldoActual: 0
        });
        setOpened(true);
    };

    const openEdit = (cuenta) => {
        setIsEditing(true);
        form.setValues({
            id: cuenta.id,
            nombreBanco: cuenta.nombreBanco,
            numeroCuenta: cuenta.numeroCuenta,
            titularCuenta: cuenta.titularCuenta,
            cedulaCuenta: cuenta.cedulaCuenta,
            tipoCuenta: cuenta.tipoCuenta,
            moneda: cuenta.moneda,
            saldoActual: Number(cuenta.saldoActual)
        });
        setOpened(true);
    };

    return (
        <Container size="xl" py="md">
            {/* ENCABEZADO CON BOTÓN ATRÁS */}
            <Group mb="xl" align="center" justify="space-between">
                 <Group>
                    <ActionIcon 
                        variant="subtle" 
                        color="gray" 
                        size="lg" 
                        onClick={() => router.back()}
                        aria-label="Volver"
                    >
                        <IconChevronLeft size={24} />
                    </ActionIcon>
                    <div>
                        <Title order={2}>Cuentas Bancarias</Title>
                        <Text c="dimmed" size="sm">Tesorería / Cuentas de la Empresa</Text>
                    </div>
                 </Group>
                 
                 <Button leftSection={<IconPlus size={18} />} onClick={openCreate}>
                    Nueva Cuenta
                </Button>
            </Group>

            {loading ? (
                <Center h={200}>
                    <Loader type="dots" />
                </Center>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                    {cuentas.map((cuenta) => (
                        <Card 
                            key={cuenta.id} 
                            shadow="sm" 
                            padding="lg" 
                            radius="md" 
                            withBorder
                            style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = 'var(--mantine-shadow-md)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'var(--mantine-shadow-sm)';
                            }}
                        >
                            {/* Cabecera */}
                            <Group justify="space-between" mb="xs" align="flex-start">
                                <Group gap="sm">
                                    <ThemeIcon
                                        size="xl" radius="md" variant="light"
                                        color={cuenta.moneda === 'VES' ? 'blue' : 'green'}
                                    >
                                        <IconBuildingBank size={24} />
                                    </ThemeIcon>
                                    <Box>
                                        <Text fw={700} lineClamp={1} size="lg" style={{ lineHeight: 1.2 }}>
                                            {cuenta.nombreBanco}
                                        </Text>
                                        <Badge size="xs" variant="outline" color="gray" mt={4}>
                                            {cuenta.tipoCuenta}
                                        </Badge>
                                    </Box>
                                </Group>

                                <Menu shadow="md" width={200} position="bottom-end">
                                    <Menu.Target>
                                        <ActionIcon variant="transparent" color="gray">
                                            <IconDotsVertical size={18} />
                                        </ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>Acciones</Menu.Label>
                                        <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => openEdit(cuenta)}>
                                            Editar / Ajustar
                                        </Menu.Item>
                                        <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => handleDelete(cuenta.id)}>
                                            Eliminar
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>

                            {/* Saldos */}
                            <Stack gap={0} my="lg">
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Saldo Disponible</Text>
                                <Group align="baseline" gap={5}>
                                    <Text
                                        size="2rem" fw={900} lh={1}
                                        c={cuenta.moneda === 'VES' ? 'blue.8' : 'green.8'}
                                    >
                                        {cuenta.moneda === 'VES' ? 'Bs.' : '$'} {Number(cuenta.saldoActual).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                    </Text>
                                    <Text size="sm" fw={500} c="dimmed">
                                        {cuenta.moneda}
                                    </Text>
                                </Group>
                            </Stack>

                            {/* Footer Detalles */}
                            <Card.Section inheritPadding py="sm" bg="gray.0" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                                <Group justify="space-between">
                                    <Box>
                                        <Text size="xs" c="dimmed" fw={600}>NRO. CUENTA</Text>
                                        <Text size="sm" ff="monospace" style={{ wordBreak: 'break-all' }} c="dark.3">
                                            {cuenta.numeroCuenta}
                                        </Text>
                                    </Box>
                                </Group>
                            </Card.Section>
                        </Card>
                    ))}
                    {cuentas.length === 0 && (
                        <Alert icon={<IconAlertCircle />} title="Sin Cuentas" color="gray" variant="light">
                            No hay cuentas registradas en el sistema.
                        </Alert>
                    )}
                </SimpleGrid>
            )}

            {/* MODAL */}
            <Modal
                opened={opened}
                onClose={() => setOpened(false)}
                title={isEditing ? "Editar Cuenta" : "Registrar Nueva Cuenta"}
                centered
                size="lg"
                padding="lg"
            >
                <LoadingOverlay visible={saving} overlayProps={{ radius: "sm", blur: 2 }} />

                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="md">

                        {/* 1. SELECCIÓN DE BANCO */}
                        <AsyncCatalogComboBox
                            label="Banco"
                            placeholder="Seleccione o cree un banco"
                            catalogo="bancos"
                            fieldKey="nombreBanco"
                            form={form}
                        />
                        
                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                            <Select
                                label="Moneda"
                                data={[
                                    { value: 'VES', label: 'Bolívares (VES)' },
                                    { value: 'USD', label: 'Dólares (USD)' },
                                    { value: 'EUR', label: 'Euros (EUR)' },
                                ]}
                                allowDeselect={false}
                                {...form.getInputProps('moneda')}
                            />
                            <Select
                                label="Tipo de Cuenta"
                                data={[
                                    { value: 'Corriente', label: 'Corriente' },
                                    { value: 'Ahorros', label: 'Ahorros' },
                                    { value: 'Dólares', label: 'Cuenta en Dólares (Nacional)' },
                                    { value: 'Euros', label: 'Cuenta en Euros' },
                                ]}
                                allowDeselect={false}
                                {...form.getInputProps('tipoCuenta')}
                            />
                        </SimpleGrid>

                        <NumberInput
                            label="Saldo Inicial / Actual"
                            description="Ajusta este valor para cuadrar con el banco real."
                            prefix={form.values.moneda === 'VES' ? 'Bs. ' : '$ '}
                            thousandSeparator="."
                            decimalSeparator=","
                            decimalScale={2}
                            allowNegative={true}
                            hideControls
                            {...form.getInputProps('saldoActual')}
                        />

                        <TextInput
                            label="Número de Cuenta"
                            placeholder="0134-xxxx-xxxx..."
                            {...form.getInputProps('numeroCuenta')}
                        />

                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                            <TextInput
                                label="Titular"
                                placeholder="Transporte Dadica"
                                {...form.getInputProps('titularCuenta')}
                            />
                            <TextInput
                                label="RIF / Cédula"
                                placeholder="J-123456789"
                                {...form.getInputProps('cedulaCuenta')}
                            />
                        </SimpleGrid>

                        <Group justify="flex-end" mt="lg">
                            <Button variant="default" onClick={() => setOpened(false)}>Cancelar</Button>
                            <Button type="submit" loading={saving} color="blue">
                                {isEditing ? "Guardar Cambios" : "Crear Cuenta"}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Container>
    );
}