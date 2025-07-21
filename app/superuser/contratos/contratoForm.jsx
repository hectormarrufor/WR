'use client';

import React, { useEffect, useState } from 'react';
import {
  TextInput, Button, Group, Box, Paper, Title, Grid, Divider, ActionIcon,
  Select, NumberInput, Textarea, Text, Checkbox,
  Loader
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import '@mantine/dates/styles.css';
import { SelectCuentaConCreacion } from './SelectCuentaConCreacion';
import { SelectClienteConCreacion } from './SelectClienteConCreacion';

// 🚀 FUNCIÓN PARA OBTENER LA TASA DE CAMBIO REAL DEL BCV
// Esta función ahora llama a tu API de Next.js /api/bcv/precio
async function fetchTasaCambioReal() {
  try {
    const response = await fetch('/api/bcv'); // Llama a tu API que gestiona el scraping y guardado
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error desconocido al obtener la tasa de cambio del BCV.');
    }
    const data = await response.json();

    // Tu API devuelve un objeto con la propiedad 'precio'
    if (data.precio && typeof data.precio === 'number') {
      return data.precio;
    } else {
      throw new Error('Formato de respuesta de la tasa de cambio inesperado de la API del BCV.');
    }
  } catch (error) {
    console.error("Error en fetchTasaCambioReal:", error);
    throw error; // Propaga el error para que el useEffect lo capture
  }
}


export function ContratoForm({ initialData = null }) {
  const router = useRouter();
  const [loadingTasa, setLoadingTasa] = useState(false);

  const form = useForm({
    initialValues: {
      numeroContrato: '',
      clienteId: '',
      fechaFirmaContrato: null,
      fechaInicio: null,
      fechaFinEstimada: null,
      monedaContrato: 'USD',
      montoEstimado: 0.0,
      montoEstimadoUSD: 0.0,
      montoEstimadoVES: 0.0,
      tasaCambioUSDVES: 0.0,
      descripcion: '',
      estado: 'Pendiente',
      renglones: [],
      hasAnticipo: false,
      montoAnticipo: 0.0,
      cuentaAnticipoId: '',
      tipoPagoContrato: 'plan_pagos',
      generarFacturaInicial: false,
    },
    validate: {
      numeroContrato: (value) => (value ? null : 'El número de contrato es requerido'),
      clienteId: (value) => (value ? null : 'Seleccionar un cliente es requerido'),
      fechaFirmaContrato: (value) => (value ? null : 'La fecha de firma del contrato es requerida'),
      fechaInicio: (value) => (value ? null : 'La fecha de inicio es requerida'),
      montoEstimado: (value) => (value > 0 ? null : 'El monto Estimado debe ser mayor a 0'),
      renglones: (value) => (value.length > 0 ? null : 'Debe agregar al menos un renglón/fase al contrato'),
      fechaFinEstimada: (value, values) => {
        if (values.fechaInicio && value && value < values.fechaInicio) {
          return 'La fecha de fin no puede ser anterior a la fecha de inicio del contrato';
        }
        return null;
      },
      renglones: {
        nombreRenglon: (value) => (value ? null : 'El nombre del renglón es requerido'),
        pozoNombre: (value) => (value ? null : 'El nombre del pozo es requerido'),
        estado: (value) => (value ? null : 'El estado de la fase es requerido'),
      },
      montoAnticipo: (value, values) => {
        if (values.hasAnticipo && (value <= 0 || value === null || value === undefined)) {
          return 'El monto del anticipo debe ser mayor a 0 si se registra un anticipo.';
        }
        return null;
      },
      cuentaAnticipoId: (value, values) => {
        if (values.hasAnticipo && !value) {
          return 'Debe seleccionar una cuenta de tesorería para el anticipo.';
        }
        return null;
      },
      generarFacturaInicial: (value, values) => {
        if (values.tipoPagoContrato === 'total' && value && (!values.fechaInicio || !values.clienteId || values.montoEstimado <= 0)) {
          return 'Se requiere fecha de inicio, cliente y monto estimado para generar la factura.';
        }
        return null;
      }
    },
  });

  useEffect(() => {
    form.setValues({
      numeroContrato: 'CONTRATO-001',
      clienteId: '1',
      descripcion: 'Una descripcion orientativa',
    })
  }, [])

  // Efecto para cargar datos iniciales en modo edición
  useEffect(() => {
    if (initialData) {
      form.setValues({
        ...initialData,
        clienteId: initialData.clienteId.toString(),
        fechaFirmaContrato: initialData.fechaFirmaContrato ? new Date(initialData.fechaFirmaContrato) : null,
        fechaInicio: initialData.fechaInicio ? new Date(initialData.fechaInicio) : null,
        fechaFinEstimada: initialData.fechaFinEstimada ? new Date(initialData.fechaFinEstimada) : null,
        monedaContrato: initialData.monedaContrato || 'USD',
        montoEstimado: initialData.montoEstimado || 0.0,
        montoEstimadoUSD: initialData.montoEstimadoUSD || 0.0,
        montoEstimadoVES: initialData.montoEstimadoVES || 0.0,
        tasaCambioUSDVES: initialData.tasaCambioUSDVES || 0.0,
        renglones: initialData.RenglonesContrato?.map(r => ({
          ...r,
          fechaInicioEstimada: r.fechaInicioEstimada ? new Date(r.fechaInicioEstimada) : null,
          fechaFinEstimada: r.fechaFinEstimada ? new Date(r.fechaFinEstimada) : null,
        })) || [],
        hasAnticipo: false,
        montoAnticipo: 0.0,
        cuentaAnticipoId: '',
        tipoPagoContrato: initialData.tipoPagoContrato || 'plan_pagos',
        generarFacturaInicial: false,
      });
    }
  }, [initialData]);

  // Efecto para calcular las fechas de inicio/fin, el estado y la tasa/montos de moneda
  useEffect(() => {
    const renglonesWithDates = form.values.renglones.filter(r => r.fechaInicioEstimada || r.fechaFinEstimada);

    let newFechaInicio = null;
    let newFechaFin = null;

    if (renglonesWithDates.length > 0) {
      const allStartDates = renglonesWithDates
        .filter(r => r.fechaInicioEstimada)
        .map(r => new Date(r.fechaInicioEstimada).getTime());

      const allEndDates = renglonesWithDates
        .filter(r => r.fechaFinEstimada)
        .map(r => new Date(r.fechaFinEstimada).getTime());

      if (allStartDates.length > 0) {
        newFechaInicio = new Date(Math.min(...allStartDates));
      }
      if (allEndDates.length > 0) {
        newFechaFin = new Date(Math.max(...allEndDates));
      }
    }

    if (newFechaInicio?.getTime() !== form.values.fechaInicio?.getTime()) {
      form.setFieldValue('fechaInicio', newFechaInicio);
    }
    if (newFechaFin?.getTime() !== form.values.fechaFinEstimada?.getTime()) {
      form.setFieldValue('fechaFinEstimada', newFechaFin);
    }

    const today = new Date(); // Usar la fecha actual del sistema
    today.setHours(0, 0, 0, 0);

    const currentFechaInicio = form.values.fechaInicio;
    const currentFechaFinEstimada = form.values.fechaFinEstimada;

    let newEstado = form.values.estado;

    if (currentFechaInicio) {
      const inicioTime = currentFechaInicio.getTime();
      const finTime = currentFechaFinEstimada?.getTime();

      if (inicioTime > today.getTime()) {
        newEstado = 'Pendiente';
      } else if (finTime && finTime < today.getTime()) {
        newEstado = 'Finalizado';
      } else {
        newEstado = 'Activo';
      }
    }

    if (newEstado !== form.values.estado) {
      form.setFieldValue('estado', newEstado);
    }
  }, [form.values.renglones]);

  //efecto para calcular la tasa bcv
  useEffect(() => {
    const updateTasaAndAmounts = async () => {
      const monto = parseFloat(form.values.montoEstimado);
      const moneda = form.values.monedaContrato;
      const fechaFirma = form.values.fechaFirmaContrato;

      let tasa = form.values.tasaCambioUSDVES; // Usar el valor actual del formulario

      // 🎯 Lógica para obtener la tasa de cambio:
      // Solo intentar obtener tasa automáticamente si es un contrato nuevo (!initialData)
      // Y la moneda es USD
      const shouldFetchTasa = !initialData && moneda === 'USD';

      if (fechaFirma && shouldFetchTasa) {
        // La API de BCV que creamos no usa la fecha, siempre trae la del día.
        // Pero mantenemos el parámetro aquí por si en el futuro la API soporta fechas históricas.
        const fechaFirmaIso = fechaFirma.toISOString().split('T')[0];
        setLoadingTasa(true);
        try {
          const fetchedTasa = await fetchTasaCambioReal(fechaFirmaIso); // 🚀 Llama a la API real
          tasa = fetchedTasa;
          form.setFieldValue('tasaCambioUSDVES', fetchedTasa);
        
        } catch (error) {
          console.error("Error al obtener la tasa de cambio:", error);
          notifications.show({
            title: 'Error al obtener la tasa',
            message: `No se pudo obtener la tasa de cambio del BCV para la fecha. Por favor, ingrese la tasa manualmente.`,
            color: 'red',
            autoClose: 8000
          });
          form.setFieldValue('tasaCambioUSDVES', 0); // Resetear si falla, para que el usuario pueda escribir
          tasa = 0; // Para cálculos, usar 0 si no se pudo obtener
        } finally {
          setLoadingTasa(false);
        }
      } else if (initialData) {
        // En modo edición, la tasa viene de initialData o se edita manualmente.
        // No se auto-obtiene a menos que el usuario la cambie manualmente.
        tasa = form.values.tasaCambioUSDVES;
      } else if (moneda === 'VES') {
        // Si la moneda del contrato es VES, la tasa siempre es editable y no se auto-obtiene.
        tasa = form.values.tasaCambioUSDVES;
      }


      let montoUSD = 0;
      let montoVES = 0;

      // Calcular montos en USD y VES
      if (moneda === 'USD') {
        montoUSD = monto;
        montoVES = monto * (tasa || 0); // Usar la tasa obtenida o 0 si no hay
      } else if (moneda === 'VES') {
        montoVES = monto;
        montoUSD = monto / (tasa || 1); // Si la tasa es 0 o nula, evitar división por cero
      }

      // Actualizar campos solo si hay un cambio significativo para evitar re-renders innecesarios
      if (Math.abs(parseFloat(montoUSD.toFixed(2)) - parseFloat(form.values.montoEstimadoUSD.toFixed(2))) > 0.001) {
        form.setFieldValue('montoEstimadoUSD', parseFloat(montoUSD.toFixed(2)));
      }
      if (Math.abs(parseFloat(montoVES.toFixed(2)) - parseFloat(form.values.montoEstimadoVES.toFixed(2))) > 0.001) {
        form.setFieldValue('montoEstimadoVES', parseFloat(montoVES.toFixed(2)));
      }
    };

    updateTasaAndAmounts();
  }, [form.values.fechaFirmaContrato])


  const handleSubmitSuccess = async (values) => {
    const payload = {
      ...values,
      clienteId: parseInt(values.clienteId),
      fechaFirmaContrato: values.fechaFirmaContrato ? values.fechaFirmaContrato.toISOString().split('T')[0] : null,
      fechaInicio: values.fechaInicio ? values.fechaInicio.toISOString().split('T')[0] : null,
      fechaFinEstimada: values.fechaFinEstimada ? values.fechaFinEstimada.toISOString().split('T')[0] : null,
      montoEstimado: parseFloat(values.montoEstimado),
      montoEstimadoUSD: parseFloat(values.montoEstimadoUSD),
      montoEstimadoVES: parseFloat(values.montoEstimadoVES),
      tasaCambioUSDVES: parseFloat(values.tasaCambioUSDVES), // ✅ Se guarda la tasa, sea auto-obtenida o manual
      renglones: values.renglones.map(renglon => ({
        ...renglon,
        fechaInicioEstimada: renglon.fechaInicioEstimada ? new Date(renglon.fechaInicioEstimada).toISOString().split('T')[0] : null,
        fechaFinEstimada: renglon.fechaFinEstimada ? new Date(renglon.fechaFinEstimada).toISOString().split('T')[0] : null,
      })),
    };

    const { hasAnticipo, montoAnticipo, cuentaAnticipoId, tipoPagoContrato, generarFacturaInicial, ...contratoPayload } = payload;

    let response;
    let url = '/api/contratos';
    let method = 'POST';
    let successMessage = 'Contrato registrado exitosamente';
    let errorMessage = 'Error al registrar contrato';

    if (initialData) {
      url = `/api/contratos/${initialData.id}`;
      method = 'PUT';
      successMessage = 'Contrato actualizado exitosamente';
      errorMessage = 'Error al actualizar contrato';
    }

    try {
      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contratoPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || response.statusText);
      }

      const contratoCreadoOActualizado = await response.json();
      let finalSuccessMessage = successMessage;

      if (!initialData) {
        let facturaGenerada = null;

        if (tipoPagoContrato === 'total' && generarFacturaInicial) {
          try {
            const numeroFactura = `FCT-${Date.now().toString().slice(-6)}`;

            const facturaPayload = {
              numeroFactura: numeroFactura,
              clienteId: parseInt(values.clienteId),
              contratoId: contratoCreadoOActualizado.id,
              fechaEmision: new Date().toISOString().split('T')[0],
              fechaVencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              montoTotal: parseFloat(values.montoEstimado),
              impuestos: 0.00,
              totalAPagar: parseFloat(values.montoEstimado),
              estado: (hasAnticipo && parseFloat(montoAnticipo) === parseFloat(values.montoEstimado)) ? 'Pagada' : 'Pendiente',
              notas: `Factura por pago total del Contrato N° ${contratoCreadoOActualizado.numeroContrato}`,
              renglones: [{
                descripcion: `Pago total del Contrato N° ${contratoCreadoOActualizado.numeroContrato}`,
                cantidad: 1,
                precioUnitario: parseFloat(values.montoEstimado),
                total: parseFloat(values.montoEstimado),
              }]
            };

            const facturaResponse = await fetch('/api/facturas', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(facturaPayload),
            });

            if (!facturaResponse.ok) {
              const errorFacturaData = await facturaResponse.json();
              throw new Error(errorFacturaData.message || 'Error al generar la factura.');
            }
            facturaGenerada = await facturaResponse.json();
            finalSuccessMessage += ' Y factura generada.';

          } catch (error) {
            notifications.show({
              title: 'Advertencia: Contrato Creado, pero Error al Generar Factura',
              message: `El contrato se registró, pero hubo un error al generar la factura inicial: ${error.message}`,
              color: 'orange',
              autoClose: 10000,
            });
          }
        }

        if (hasAnticipo && parseFloat(montoAnticipo) > 0 && cuentaAnticipoId) {
          const movimientoTesoreriaPayload = {
            monto: parseFloat(montoAnticipo),
            moneda: values.monedaContrato,
            tipoMovimiento: 'Ingreso',
            categoria: 'Venta Servicio',
            descripcion: `Anticipo de pago para Contrato N° ${contratoCreadoOActualizado.numeroContrato}`,
            cuentaDestinoId: parseInt(cuentaAnticipoId),
            contratoServicioId: contratoCreadoOActualizado.id,
            fechaMovimiento: new Date().toISOString().split('T')[0],
            facturaClienteId: facturaGenerada ? facturaGenerada.id : null,
          };

          const movimientoResponse = await fetch('/api/tesoreria/movimientos', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(movimientoTesoreriaPayload),
          });

          if (!movimientoResponse.ok) {
            const errorMovimientoData = await movimientoResponse.json();
            notifications.show({
              title: 'Advertencia: Contrato Creado, pero Error en Anticipo',
              message: `El contrato se registró, pero hubo un error al registrar el anticipo: ${errorMovimientoData.message || movimientoResponse.statusText}`,
              color: 'orange',
              autoClose: 10000,
            });
          } else {
            if (!facturaGenerada) {
              finalSuccessMessage += ' y anticipo registrado.';
            }
          }
        }
      }

      notifications.show({
        title: 'Éxito',
        message: finalSuccessMessage,
        color: 'green',
      });
      router.push('/superuser/contratos');
    } catch (error) {
      console.error(errorMessage, error);
      notifications.show({
        title: 'Error',
        message: `${errorMessage}: ${error.message}`,
        color: 'red',
      });
    }
  };


  const handleSubmitError = (errors) => {
    const errorFields = Object.keys(errors)
      .filter(key => errors[key])
      .map(key => {
        if (Array.isArray(errors[key])) {
          return errors[key].map((renglonErrors, index) => {
            if (renglonErrors) {
              const subErrors = Object.keys(renglonErrors).map(subKey => {
                return `- Renglón ${index + 1}: ${renglonErrors[subKey]}`;
              }).join('\n');
              return subErrors;
            }
            return null;
          }).filter(Boolean).join('\n');
        }
        return `- ${key}: ${errors[key]}`;
      })
      .filter(Boolean)
      .join('\n');

    notifications.show({
      title: 'Campos requeridos incompletos',
      message: `Por favor, complete los siguientes campos:\n${errorFields}`,
      color: 'red',
      autoClose: 8000,
    });
  };


  const addRenglon = () => {
    form.insertListItem('renglones', {
      nombreRenglon: '',
      pozoNombre: '',
      ubicacionPozo: '',
      fechaInicioEstimada: null,
      fechaFinEstimada: null,
      estado: 'Pendiente',
    });
  };

  const removeRenglon = (index) => {
    form.removeListItem('renglones', index);
  };

  const renglonesFields = form.values.renglones.map((item, index) => (
    <Paper key={index} withBorder shadow="xs" p="md" mb="sm">
      <Group justify="flex-end">
        <ActionIcon
          color="red"
          onClick={() => removeRenglon(index)}
          variant="light"
          size="sm"
          aria-label="Eliminar renglón"
        >
          <IconTrash style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
      </Group>
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Nombre del Renglón/Fase"
            placeholder="Ej: Instalación pozo X, Mantenimiento preventivo"
            required
            {...form.getInputProps(`renglones.${index}.nombreRenglon`)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Nombre del Pozo"
            placeholder="Ej: Pozo J-15, Campo Morichal"
            required
            {...form.getInputProps(`renglones.${index}.pozoNombre`)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TextInput
            label="Ubicación del Pozo"
            placeholder="Ej: Sector Las Mercedes, Bloque 3"
            {...form.getInputProps(`renglones.${index}.ubicacionPozo`)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label="Estado de la Fase"
            placeholder="Selecciona el estado"
            data={['Pendiente', 'En Preparación', 'Mudanza', 'Operando', 'Finalizado', 'Pausado', 'Cancelado']}
            required
            {...form.getInputProps(`renglones.${index}.estado`)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <DateInput
            label="Fecha Inicio Estimada"
            placeholder="Fecha estimada de inicio"
            valueFormat="DD/MM/YYYY"
            {...form.getInputProps(`renglones.${index}.fechaInicioEstimada`)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <DateInput
            label="Fecha Fin Estimada"
            placeholder="Fecha estimada de fin"
            valueFormat="DD/MM/YYYY"
            {...form.getInputProps(`renglones.${index}.fechaFinEstimada`)}
          />
        </Grid.Col>
      </Grid>
    </Paper>
  ));

  return (
    <Box maw={1000} mx="auto">
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title order={2} ta="center" mb="lg">
          {initialData ? 'Editar Contrato' : 'Registrar Nuevo Contrato'}
        </Title>
        <form onSubmit={form.onSubmit(handleSubmitSuccess, handleSubmitError)}>
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Número de Contrato"
                placeholder="CONTRATO-001"
                required
                {...form.getInputProps('numeroContrato')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <SelectClienteConCreacion
                form={form}
                fieldName="clienteId"
                label="Cliente"
                placeholder="Selecciona un cliente o crea uno nuevo"
                disabled={!!initialData}
              />
            </Grid.Col>
            {/* Fecha de Firma del Contrato */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Fecha de Firma del Contrato"
                placeholder="Selecciona la fecha de firma"
                valueFormat="DD/MM/YYYY"
                required
                {...form.getInputProps('fechaFirmaContrato')}
              />
            </Grid.Col>
            {/* Tasa de Cambio, siempre visible pero editable si es VES o si falló la auto-obtención */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label="Tasa de Cambio USD/VES (Fecha Firma)"
                placeholder="Ej. 37.50"
                decimalScale={2}
                fixedDecimalScale
                min={0}
                thousandSeparator="."
                decimalSeparator=","
                required
                rightSection={loadingTasa ? <Loader size="xs" /> : null}
                {...form.getInputProps('tasaCambioUSDVES')}
                // 🎯 Lógica de readOnly:
                // Es readOnly si:
                // 1. Es un contrato nuevo (!initialData)
                // 2. La moneda del contrato es USD
                // 3. Y ya se ha obtenido una tasa válida (tasaCambioUSDVES > 0)
                // En cualquier otro caso (edición, moneda VES, o tasa no obtenida/fallida), es editable.
                readOnly={!initialData && form.values.monedaContrato === 'USD' && form.values.tasaCambioUSDVES > 0}
              />
            </Grid.Col>

            {/* Fecha de Inicio del Contrato (operaciones) */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Fecha de Inicio de Operaciones"
                placeholder="Calculada automáticamente"
                valueFormat="DD/MM/YYYY"
                required
                readOnly
                disabled
                {...form.getInputProps('fechaInicio')}
              />
            </Grid.Col>
            {/* Fecha de Fin del Contrato */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateInput
                label="Fecha de Fin del Contrato"
                placeholder="Calculada automáticamente"
                valueFormat="DD/MM/YYYY"
                readOnly
                disabled
                {...form.getInputProps('fechaFinEstimada')}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Descripción General del Contrato"
                placeholder="Detalles y términos generales del contrato"
                {...form.getInputProps('descripcion')}
                rows={3}
              />
            </Grid.Col>

            {/* Tipo de Pago del Contrato */}
            {!initialData && (
              <Grid.Col span={12}>
                <Select
                  label="¿Cómo será pagado el contrato?"
                  placeholder="Selecciona el tipo de pago"
                  data={[
                    { value: 'total', label: 'Pago en su totalidad desde el principio' },
                    { value: 'plan_pagos', label: 'Plan de pagos con adelantos/avances' },
                  ]}
                  required
                  {...form.getInputProps('tipoPagoContrato')}
                  onChange={(value) => {
                    form.setFieldValue('tipoPagoContrato', value);
                    if (value === 'plan_pagos') {
                      form.setFieldValue('generarFacturaInicial', false);
                      form.setFieldValue('hasAnticipo', false);
                      form.setFieldValue('montoAnticipo', 0.0);
                      form.setFieldValue('cuentaAnticipoId', '');
                    }
                  }}
                />
              </Grid.Col>
            )}

            {/* Moneda del Contrato */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Moneda del Contrato"
                placeholder="Selecciona la moneda"
                data={['USD', 'VES']}
                required
                {...form.getInputProps('monedaContrato')}
              />
            </Grid.Col>
            {/* Monto Total Estimado - La etiqueta y el prefijo cambian */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label={`Monto Total Estimado (${form.values.monedaContrato})`}
                placeholder="Ej. 1500.00"
                prefix={form.values.monedaContrato === 'VES' ? 'Bs. ' : '$ '}
                decimalScale={2}
                fixedDecimalScale
                min={0}
                thousandSeparator="."
                decimalSeparator=","
                required
                {...form.getInputProps('montoEstimado')}
                mt="lg"
              />
            </Grid.Col>

            {/* Monto Estimado en la otra moneda, siempre visible */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              {form.values.monedaContrato === 'USD' ? (
                <TextInput
                  label="Monto Estimado en VES"
                  placeholder="Calculado automáticamente"
                  readOnly
                  disabled
                  value={`Bs. ${form.values.montoEstimadoVES?.toFixed(2).replace('.', ',') || '0,00'}`}
                />
              ) : (
                <TextInput
                  label="Monto Estimado en USD"
                  placeholder="Calculado automáticamente"
                  readOnly
                  disabled
                  value={`$ ${form.values.montoEstimadoUSD?.toFixed(2) || '0.00'}`}
                />
              )}
            </Grid.Col>

            {/* Espacio en blanco si la columna anterior era 6 para que quede balanceado */}
            {form.values.monedaContrato === 'USD' ? (
              <Grid.Col span={{ base: 12, md: 6 }}>
                {/* Este espacio en blanco equilibra el grid si la columna de arriba es 6 */}
              </Grid.Col>
            ) : (
              <Grid.Col span={{ base: 12, md: 0 }}>
                {/* No se necesita espacio si la columna de arriba ocupa 12 */}
              </Grid.Col>
            )}

            {/* Estado del Contrato */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label="Estado del Contrato"
                placeholder="Calculado automáticamente"
                data={['Activo', 'Pausado', 'Finalizado', 'Cancelado', 'Pendiente']}
                required
                readOnly
                disabled
                {...form.getInputProps('estado')}
              />
            </Grid.Col>

            {/* Sección de anticipo y generación de factura inicial */}
            {!initialData && (
              <>
                <Grid.Col span={12}>
                  <Divider my="md" label="Anticipo / Pago Inicial y Facturación" labelPosition="center" />
                </Grid.Col>

                {form.values.tipoPagoContrato === 'total' && (
                  <Grid.Col span={12}>
                    <Checkbox
                      label="Generar Factura al crear contrato (por el monto total)"
                      checked={form.values.generarFacturaInicial}
                      {...form.getInputProps('generarFacturaInicial', { type: 'checkbox' })}
                      onChange={(event) => {
                        form.setFieldValue('generarFacturaInicial', event.currentTarget.checked);
                        if (event.currentTarget.checked) {
                          form.setFieldValue('hasAnticipo', true);
                          form.setFieldValue('montoAnticipo', form.values.montoEstimado);
                        } else {
                          form.setFieldValue('hasAnticipo', false);
                          form.setFieldValue('montoAnticipo', 0.0);
                          form.setFieldValue('cuentaAnticipoId', '');
                        }
                      }}
                    />
                  </Grid.Col>
                )}

                {!(form.values.tipoPagoContrato === 'total' && form.values.generarFacturaInicial) && (
                  <Grid.Col span={12}>
                    <Checkbox
                      label="¿Se realizó un anticipo o pago parcial al contrato?"
                      checked={form.values.hasAnticipo}
                      {...form.getInputProps('hasAnticipo', { type: 'checkbox' })}
                      onChange={(event) => {
                        form.setFieldValue('hasAnticipo', event.currentTarget.checked);
                        if (!event.currentTarget.checked) {
                          form.setFieldValue('montoAnticipo', 0.0);
                          form.setFieldValue('cuentaAnticipoId', '');
                        }
                      }}
                    />
                  </Grid.Col>
                )}

                {(form.values.hasAnticipo || (form.values.tipoPagoContrato === 'total' && form.values.generarFacturaInicial)) && (
                  <>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <NumberInput
                        label="Monto del Anticipo"
                        placeholder="Ej. 500.00"
                        prefix={form.values.monedaContrato === 'VES' ? 'Bs. ' : '$ '}
                        decimalScale={2}
                        fixedDecimalScale
                        min={0}
                        thousandSeparator="."
                        decimalSeparator=","
                        required
                        {...form.getInputProps('montoAnticipo')}
                        readOnly={form.values.tipoPagoContrato === 'total' && form.values.generarFacturaInicial}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <SelectCuentaConCreacion
                        form={form}
                        fieldName="cuentaAnticipoId"
                        label="Cuenta de Tesorería del Anticipo"
                        placeholder="Selecciona una cuenta o crea una nueva"
                        required
                      />
                    </Grid.Col>
                  </>
                )}
              </>
            )}

            <Grid.Col span={12}>
              <Divider my="md" label="Fases/Renglones de Servicio (Hitos)" labelPosition="center" />
              {renglonesFields.length > 0 ? (
                renglonesFields
              ) : (
                <Text c="dimmed" ta="center" mt="md">No hay fases/renglones agregados. Agregue uno.</Text>
              )}
              <Group justify="center" mt="md">
                <Button leftSection={<IconPlus size={16} />} onClick={addRenglon} variant="light">
                  Agregar Fase/Renglón
                </Button>
              </Group>
              {form.errors.renglones && form.values.renglones.length === 0 && (
                <Text c="red" size="sm" mt={4}>{form.errors.renglones}</Text>
              )}
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? 'Actualizar Contrato' : 'Registrar Contrato'}
            </Button>
          </Group>
        </form>
      </Paper>
    </Box>
  );
}