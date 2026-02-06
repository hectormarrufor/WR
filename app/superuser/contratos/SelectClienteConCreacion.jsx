// components/clientes/SelectClienteConCreacion.jsx
'use client'; // Necesario para componentes interactivos en Next.js App Router

import React, { useState, useEffect } from 'react';
import { Select, ActionIcon, Group, Tooltip, rem, Box, Flex, Avatar, Card, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { ModalClienteForm } from './clientes/ModalClienteForm'; // Ajusta la ruta si es necesario
import { notifications } from '@mantine/notifications';

export function SelectClienteConCreacion({ form, fieldName = 'clienteId', label = 'Cliente', placeholder = 'Selecciona un cliente', disabled = false  }) {
  const [clientesData, setClientesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [opened, setOpened] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);

  // Función para cargar los clientes desde la API
  const fetchClientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/contratos/clientes'); // Asume que tienes un GET en esta ruta
      if (!response.ok) {
        throw new Error('Error al cargar clientes');
      }
      const data = await response.json();
  
      setClientesData(data);
    } catch (err) {
      setError(err.message);
      notifications.show({
        title: 'Error al cargar clientes',
        message: 'No se pudieron obtener los clientes desde el servidor.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    if (selectedCliente) {
      form.setFieldValue("cliente", String(selectedCliente.nombre));
    }
  }, [selectedCliente]);

  // Callback para cuando se crea un nuevo cliente en el modal
  const handleClienteCreado = (nuevoCliente) => {
    // Añadir el nuevo cliente a la lista y seleccionarlo automáticamente
    const newClientOption = {
      value: String(nuevoCliente.id),
      label: nuevoCliente.razonSocial || `${nuevoCliente.nombreContacto || ''} ${nuevoCliente.apellidoContacto || ''}`.trim(),
    };
    setClientesData(prevData => [...prevData, newClientOption]);
    form.setFieldValue(fieldName, newClientOption.value); // Seleccionar el nuevo cliente
    notifications.show({
      title: 'Cliente Añadido',
      message: `${newClientOption.label} ha sido añadido y seleccionado.`,
      color: 'blue',
    });
  };

  return (
    <Box wrap="nowrap" align="flex-end" style={{ width: '100%' }}>
      <Flex style={{ flex: 1 }}>
        <Select
          label={label}
          grow
          placeholder={placeholder}
          data={clientesData.map((cliente => ({
            value: String(cliente.id),
            label: cliente.nombre ,
          })))}
          searchable
          clearable // Permite deseleccionar si es necesario
          disabled={disabled || loading}
          nothingFoundMessage={loading ? "Cargando clientes..." : (error ? "Error al cargar clientes" : "No se encontraron clientes")}
          {...form.getInputProps(fieldName)}
          onChange={(value) => {
            form.setFieldValue(fieldName, value);
            const selected = clientesData.find(c => c.id == value);
            setSelectedCliente(selected);
          }}
        />
        <ActionIcon
          variant="filled"
          size="lg" // Ajusta el tamaño para que se vea bien junto al Select
          aria-label="Crear nuevo cliente"
          disabled={disabled}
          mt={26}
          style={{ marginBottom: rem(2.5) }} // Ajusta el margen si es necesario para alinear
          onClick={() => setOpened(true)}
        >
          <IconPlus style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
        </ActionIcon>
      </Flex>
      {selectedCliente &&
                  <Card padding="sm" radius="md" withBorder>
                    <Group>
                      <Avatar
                        src={`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${selectedCliente?.imagen}?v=${process.env.NEXT_PUBLIC_APP_VERSION}`}
                        alt={selectedCliente?.nombre}
                        radius="xl"
                      />
                      <Text>{selectedCliente?.nombre}</Text>
                    </Group>
                  </Card>
                }

        <ModalClienteForm onClienteCreado={handleClienteCreado} opened={opened} onClose={() => setOpened(false)}/>
    </Box>
  );
}