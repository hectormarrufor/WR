// app/superuser/flota/grupos/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Title, Paper, LoadingOverlay, Alert, Group, Anchor, Text, ActionIcon, Modal, FileButton } from '@mantine/core';
import { IconDownload, IconPencil, IconPlus, IconTrash, IconUpload } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { notifications } from '@mantine/notifications';

export default function GruposListPage() {
    const router = useRouter();
    const [grupos, setGrupos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalImportOpened, setModalImportOpened] = useState(false);
    const [fileToImport, setFileToImport] = useState(null);
    
    const fetchGrupos = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/gestionMantenimiento/grupos');
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'No se pudieron cargar los grupos');
            }
            setGrupos(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {

        fetchGrupos();
    }, []);

    const handleExport = (grupoId) => {
        // Simplemente redirigimos a la API de exportación y el navegador se encarga de la descarga
        window.location.href = `/api/gestionMantenimiento/grupos/${grupoId}/export`;
    };

    // Función para importar un grupo
    const handleImport = async () => {
        if (!fileToImport) {
            notifications.show({ title: 'Error', message: 'Por favor, selecciona un archivo.', color: 'red' });
            return;
        }

        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const jsonContent = JSON.parse(event.target.result);
                const response = await fetch('/api/gestionMantenimiento/grupos/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(jsonContent)
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.message);

                notifications.show({ title: 'Éxito', message: data.message, color: 'green' });
                setModalImportOpened(false);
                setFileToImport(null);
                fetchGrupos(); // Recargar la lista
            } catch (error) {
                notifications.show({ title: 'Error de Importación', message: error.message, color: 'red' });
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(fileToImport);
    };

    const eliminarGrupo = async (id) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este grupo?')) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/gestionMantenimiento/grupos/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'No se pudo eliminar el grupo');
            }
            setGrupos(grupos.filter(grupo => grupo.id !== id));
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    const rows = grupos.map((grupo) => (
        <Table.Tr key={grupo.id}>
            <Table.Td>{grupo.id}</Table.Td>
            <Table.Td>{grupo.nombre}</Table.Td>
            <Table.Td>{Object.keys(grupo.definicion).length}</Table.Td>
            <Table.Td>
                <Button
                    leftSection={<IconPencil size={14} />}
                    variant="outline"
                    onClick={() => router.push(`/superuser/flota/grupos/${grupo.id}/editar`)}
                >
                    Editar
                </Button>
                <Button
                    leftSection={<IconTrash size={14} />}
                    mx={10}
                    color='red'
                    variant="outline"
                    onClick={() => eliminarGrupo(grupo.id)}
                >
                    Eliminar
                </Button>
                <ActionIcon variant="subtle" color="green" onClick={() => handleExport(grupo.id)}>
                    <IconDownload size={18} />
                </ActionIcon>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
            <Group justify="space-between" mb="xl">
                <Title order={2}>Grupos de Activos</Title>
                <Group>
                    <Button
                        component={Link}
                        href="/superuser/flota/grupos/crear"
                        leftSection={<IconPlus size={14} />}
                    >
                        Crear Nuevo Grupo
                    </Button>
                    <Button variant="outline" leftSection={<IconUpload size={16} />} onClick={() => setModalImportOpened(true)}>
                        Importar Grupo
                    </Button>
                </Group>
            </Group>

            <LoadingOverlay visible={loading} />

            {error && <Alert color="red" title="Error">{error}</Alert>}

            <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>ID</Table.Th>
                        <Table.Th>Nombre</Table.Th>
                        <Table.Th>Nº de Atributos Definidos</Table.Th>
                        <Table.Th>Acciones</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.length > 0 ? rows : (
                        <Table.Tr>
                            <Table.Td colSpan={4}>
                                <Text c="dimmed" align="center">No se encontraron grupos.</Text>
                            </Table.Td>
                        </Table.Tr>
                    )}
                </Table.Tbody>
            </Table>
             <Modal opened={modalImportOpened} centered onClose={() => setModalImportOpened(false)} title="Importar Grupo desde Archivo JSON">
                <Text size="sm" c="dimmed" mb="md">
                    Selecciona un archivo JSON que haya sido exportado previamente desde este sistema.
                </Text>
                <Group>
                    <FileButton onChange={setFileToImport} accept="application/json">
                        {(props) => <Button {...props}>Seleccionar Archivo</Button>}
                    </FileButton>
                    {fileToImport && <Text size="sm">{fileToImport.name}</Text>}
                </Group>
                <Group justify="flex-end" mt="lg">
                    <Button variant="default" onClick={() => setModalImportOpened(false)}>Cancelar</Button>
                    <Button onClick={handleImport} disabled={!fileToImport}>Importar</Button>
                </Group>
            </Modal>
        </Paper>
    );
}