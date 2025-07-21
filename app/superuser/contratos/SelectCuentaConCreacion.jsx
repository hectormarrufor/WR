// components/tesoreria/SelectCuentaConCreacion.jsx
'use client';

import React, { useEffect, useState } from 'react';
import { Select, Group, Button, Loader, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { ModalCrearCuentaBancaria } from '../../components/ModalCrearCuentaBancaria';


export function SelectCuentaConCreacion({ form, fieldName, label, placeholder, required = false }) {
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCuentas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tesoreria/cuentas-bancarias');
      if (!response.ok) {
        throw new Error('Error al cargar las cuentas bancarias');
      }
      const data = await response.json();
      setCuentas(data.map(cuenta => ({
        value: cuenta.id.toString(),
        label: `${cuenta.nombreBanco} - ${cuenta.numeroCuenta.slice(-4)} (${cuenta.moneda})`,
      })));
    } catch (err) {
      console.error('Error fetching cuentas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCuentas();
  }, []);

  const handleCuentaCreada = (nuevaCuenta) => {
    // Actualizar la lista de cuentas y seleccionar la nueva cuenta
    setCuentas(prev => [
      ...prev,
      {
        value: nuevaCuenta.id.toString(),
        label: `${nuevaCuenta.nombreBanco} - ${nuevaCuenta.numeroCuenta} (${nuevaCuenta.moneda})`,
      }
    ]);
    form.setFieldValue(fieldName, nuevaCuenta.id.toString());
  };

  if (loading) {
    return <Loader size="sm" />;
  }

  if (error) {
    return <Text color="red">Error: {error}</Text>;
  }

  return (
    <Group grow 
    preventGrowOverflow={false}
    align="flex-end">
      <Select
        label={label}
        placeholder={placeholder}
        data={cuentas}
        searchable
        clearable
        required={required}
        {...form.getInputProps(fieldName)}
      />
      <ModalCrearCuentaBancaria onCuentaCreada={handleCuentaCreada}>
        <Button leftSection={<IconPlus size={16} />} variant="default">
          Nueva
        </Button>
      </ModalCrearCuentaBancaria>
    </Group>
  );
}