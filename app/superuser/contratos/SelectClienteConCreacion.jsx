// components/clientes/SelectClienteConCreacion.jsx
'use client'; // Necesario para componentes interactivos en Next.js App Router

import React, { useState, useEffect } from 'react';
import { Select, ActionIcon, Group, Tooltip, rem, Box } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { ModalClienteForm } from './clientes/ModalClienteForm'; // Ajusta la ruta si es necesario
import { notifications } from '@mantine/notifications';

export function SelectClienteConCreacion({ form, fieldName = 'clienteId', label = 'Cliente', placeholder = 'Selecciona un cliente', disabled = false }) {
  const [clientesData, setClientesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      // Mapear los clientes al formato { value: id, label: nombreCompleto/razonSocial }
      const formattedClients = data.map(cliente => ({
        value: String(cliente.id), // Mantine Select espera valores de tipo string
        label: cliente.razonSocial || `${cliente.nombreContacto || ''} ${cliente.apellidoContacto || ''}`.trim(),
      }));
      setClientesData(formattedClients);
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
    <Group wrap="nowrap" align="flex-end" style={{ width: '100%' }}>
      <Box style={{ flexGrow: 1 }}>
        <Select
          label={label}
          placeholder={placeholder}
          data={clientesData}
          searchable
          clearable // Permite deseleccionar si es necesario
          disabled={disabled || loading}
          nothingFoundMessage={loading ? "Cargando clientes..." : (error ? "Error al cargar clientes" : "No se encontraron clientes")}
          {...form.getInputProps(fieldName)}
        />
      </Box>
      <Tooltip label="Crear Nuevo Cliente" position="top-end" withArrow>
        <ModalClienteForm onClienteCreado={handleClienteCreado}>
          <ActionIcon
            variant="filled"
            size="lg" // Ajusta el tamaño para que se vea bien junto al Select
            aria-label="Crear nuevo cliente"
            disabled={disabled}
            style={{ marginBottom: rem(2.5) }} // Ajusta el margen si es necesario para alinear
          >
            <IconPlus style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
          </ActionIcon>
        </ModalClienteForm>
      </Tooltip>
    </Group>
  );
}