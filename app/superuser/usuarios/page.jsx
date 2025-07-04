"use client"
import { Button, Card, CloseButton, Flex, Table, Title, Modal, Text } from '@mantine/core'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { eliminarUsuario, obtenerUsuarios } from '../../ApiFunctions/userServices'
import EditButton from '../../components/EditButton'
import BackButton from '../../components/BackButton'
import DeleteModal from '../DeleteModal'

const clients = () => {
    const router = useRouter();
    const [deleteModalOpened, setDeleteModalOpened] = useState(false);
    const [clientToDelete, setClientToDelete] = useState(null);
    const [clients, setClients] = useState([]);
    const [rows, setRows] = useState(null)
    useEffect(() => {
        async function fetchData() {
            const fetchdata = await obtenerUsuarios();
            setClients(fetchdata)
        }
        fetchData();
    }, []);

    useEffect(() => {
        setRows(clients.map(client => (
            <Table.Tr key={client.name}>
                <Table.Td>{client.id}</Table.Td>
                <Table.Td>{client.name} {client.lastname}</Table.Td>
                <Table.Td>{client.email}</Table.Td>
                <Table.Td>{client.phone}</Table.Td>
                <Table.Td>{client.city}</Table.Td>
                <Table.Td>{client.state}</Table.Td>
                <Table.Td>{client.address}</Table.Td>
                <Table.Td>{client.type}</Table.Td>
                <Table.Td>{client.createdAt.split("T")[0]}</Table.Td>
                <Table.Td><EditButton onclick={handleEdit}/></Table.Td>
                <Table.Td><CloseButton onClick={() => handleDelete(client)}/></Table.Td>
            </Table.Tr>
        )))

    }, [clients])


    const handleEdit = () => {
        console.log("entre al modal de edit")
    }
    const handleDelete = (client) => {
        setClientToDelete(client);
        setDeleteModalOpened(true)
    }
    const handleDeleteConfirm = async () => {
        await eliminarUsuario(clientToDelete.id)
        setClientToDelete(null)
        setDeleteModalOpened(false);
        setClients(await obtenerUsuarios())
    }


    return (<>
        <DeleteModal
            opened={deleteModalOpened}
            onclose={() => setDeleteModalOpened(false)}
            onConfirm={handleDeleteConfirm}
            clientName={clientToDelete?.name}
        />
        <Card
            style={{
                height: "50vh",
                backgroundColor: "white"
            }}

            m={100}


        >
            {!rows ? <Title>Loading</Title> :

                <>
                    <Flex justify="space-between" align="start">
                        <BackButton onClick={() => router.push('/superuser')}/>
                        <Button onClick={() => router.push('/superuser/usuarios/crear')}>Crear usuario</Button>
                    </Flex>
                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>ID</Table.Th>
                                <Table.Th>Name</Table.Th>
                                <Table.Th>Email</Table.Th>
                                <Table.Th>Phone</Table.Th>
                                <Table.Th>City</Table.Th>
                                <Table.Th>State</Table.Th>
                                <Table.Th>Address</Table.Th>
                                <Table.Th>Type</Table.Th>
                                <Table.Th>Date of creation</Table.Th>
                                <Table.Th>Edit</Table.Th>
                                <Table.Th>Delete</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{rows}</Table.Tbody>
                    </Table>
                </>}
        </Card>
    </>)
}

export default clients