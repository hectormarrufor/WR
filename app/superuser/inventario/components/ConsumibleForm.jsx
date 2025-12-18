'use client';

import { useState } from 'react';
import { 
    Stack, Select, TextInput, NumberInput, 
    Button, Group, Text, Divider, Alert, LoadingOverlay,
    Paper 
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconDeviceFloppy, IconLink } from '@tabler/icons-react';

export default function ConsumibleForm({ onSuccess, onCancel, noShadow = false }) {
    const [loading, setLoading] = useState(false);
    const [tipoEspecifico, setTipoEspecifico] = useState('Filtro'); // Filtro, Correa, Aceite...
    
    // Estados para búsqueda de equivalencias
    const [filtrosExistentes, setFiltrosExistentes] = useState([]);
    const [loadingFiltros, setLoadingFiltros] = useState(false);

    const form = useForm({
        initialValues: {
            stockMinimo: 5,
            marca: '', 
            // FILTROS
            codigoFiltro: '',
            tipoFiltro: 'Aceite', 
            equivalenciaId: null,
            // CORREAS
            perfilCorrea: 'PK', 
            canales: 6,
            longitudMm: 2000,
            // ACEITES
            viscosidad: '15W40',
            tipoAceite: 'Mineral', 
            aplicacion: 'Motor'
        },
        validate: {
            marca: (val) => !val ? 'Marca requerida' : null,
            codigoFiltro: (val) => (tipoEspecifico === 'Filtro' && !val ? 'Código requerido' : null),
        }
    });

    const handleSearchFiltros = async (query) => {
        if (!query) return;
        setLoadingFiltros(true);
        try {
            const res = await fetch(`/api/inventario/consumibles?search=${encodeURIComponent(query)}&tipo=Filtro`);
            const data = await res.json();
            if (data.success) {
                setFiltrosExistentes(data.data.map(c => ({
                    value: c.id.toString(),
                    label: `${c.nombre} (${c.codigo})`
                })));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingFiltros(false);
        }
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // 1. GENERAR NOMBRE Y CÓDIGO
            let nombreGenerado = '';
            let codigoGenerado = '';
            let datosTecnicos = {};

            if (tipoEspecifico === 'Filtro') {
                codigoGenerado = values.codigoFiltro;
                nombreGenerado = `Filtro ${values.tipoFiltro} ${values.marca} ${values.codigoFiltro}`;
                datosTecnicos = {
                    tipo: 'Filtro',
                    datos: { tipoFiltro: values.tipoFiltro },
                    equivalenciaExistenteId: values.equivalenciaId ? parseInt(values.equivalenciaId) : null
                };
            } 
            else if (tipoEspecifico === 'Correa') {
                const codigoCorrea = `${values.canales}${values.perfilCorrea}${values.longitudMm}`; 
                codigoGenerado = codigoCorrea;
                nombreGenerado = `Correa ${values.marca} ${codigoCorrea}`;
                datosTecnicos = {
                    tipo: 'Correa',
                    datos: { perfil: values.perfilCorrea, canales: values.canales, longitud: values.longitudMm }
                };
            }
            else if (tipoEspecifico === 'Aceite') {
                codigoGenerado = `${values.aplicacion.substring(0,3).toUpperCase()}-${values.viscosidad}`;
                nombreGenerado = `Aceite ${values.aplicacion} ${values.viscosidad} ${values.tipoAceite} (${values.marca})`;
                datosTecnicos = {
                    tipo: 'Aceite',
                    datos: { viscosidad: values.viscosidad, base: values.tipoAceite, aplicacion: values.aplicacion }
                };
            }

            // 2. ENVIAR A API
            const response = await fetch('/api/inventario/consumibles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: nombreGenerado,
                    codigo: codigoGenerado,
                    marca: values.marca,
                    stockActual: 0, 
                    stockMinimo: values.stockMinimo,
                    datosTecnicos: datosTecnicos 
                })
            });

            const res = await response.json();

            if (res.success) {
                notifications.show({ title: 'Creado', message: `${nombreGenerado} guardado`, color: 'green' });
                if (onSuccess) onSuccess(res.data);
                form.reset();
            } else {
                throw new Error(res.error || 'Error al crear');
            }

        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack pos="relative">
            <LoadingOverlay visible={loading} />

            <Select 
                label="Tipo de Repuesto"
                data={['Filtro', 'Correa', 'Aceite']}
                value={tipoEspecifico}
                onChange={(val) => { setTipoEspecifico(val); form.reset(); }}
                allowDeselect={false}
            />

            <Divider />
            
            <form onSubmit={(e) => {
                    // 1. Detiene la propagación para que no llegue al formulario padre (Vehículo)
                    e.stopPropagation(); 
                    
                    // 2. Ejecuta el submit de este formulario (Consumible)
                    form.onSubmit(handleSubmit)(e);
                }}>
                <Stack gap="md">
                    <Group grow>
                        <TextInput label="Marca" placeholder="WIX, Gates..." required {...form.getInputProps('marca')} />
                        <NumberInput label="Stock Mínimo" {...form.getInputProps('stockMinimo')} />
                    </Group>

                    {/* FILTROS */}
                    {tipoEspecifico === 'Filtro' && (
                        <>
                            <Group grow>
                                <TextInput label="Código Exacto" placeholder="ej. 51515" required {...form.getInputProps('codigoFiltro')} />
                                <Select label="Función" data={['Aceite', 'Aire', 'Combustible', 'Separador', 'Hidráulico', 'Cabina']} {...form.getInputProps('tipoFiltro')} />
                            </Group>
                            
                            <Alert variant="light" color="blue" title="Equivalencias" icon={<IconLink size={16}/>}>
                                Si es igual a uno existente (ej. WIX vs Millard), vincúlalos aquí.
                            </Alert>
                            
                            <Select
                                label="Vincular con Filtro Existente"
                                placeholder="Buscar por código..."
                                data={filtrosExistentes}
                                searchable
                                clearable
                                onSearchChange={handleSearchFiltros}
                                rightSection={loadingFiltros ? <Text size="xs">...</Text> : null}
                                {...form.getInputProps('equivalenciaId')}
                            />
                        </>
                    )}

                    {/* CORREAS */}
                    {tipoEspecifico === 'Correa' && (
                        <>
                            <Text size="sm" c="dimmed">Generador de Código: 8PK2000</Text>
                            <Group grow>
                                <NumberInput label="Canales" min={1} max={20} {...form.getInputProps('canales')} />
                                <Select label="Perfil" data={['PK', 'A', 'B', 'C', 'V']} {...form.getInputProps('perfilCorrea')} />
                                <NumberInput label="Longitud (mm)" min={100} suffix=" mm" {...form.getInputProps('longitudMm')} />
                            </Group>
                        </>
                    )}

                    {/* ACEITES */}
                    {tipoEspecifico === 'Aceite' && (
                        <Group grow>
                            <Select label="Aplicación" data={['Motor', 'Hidraulico', 'Transmision']} {...form.getInputProps('aplicacion')} />
                            <Select label="Viscosidad" data={['15W40', '20W50', '5W30', '80W90']} searchable creatable getCreateLabel={q => `+ ${q}`} {...form.getInputProps('viscosidad')} />
                            <Select label="Base" data={['Mineral', 'Semi-Sintetico', 'Sintetico']} {...form.getInputProps('tipoAceite')} />
                        </Group>
                    )}

                    <Group justify="right" mt="md">
                        {onCancel && <Button variant="default" onClick={onCancel}>Cancelar</Button>}
                        <Button type="submit" leftSection={<IconDeviceFloppy size={18}/>}>
                            Guardar Consumible
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Stack>
    );
}