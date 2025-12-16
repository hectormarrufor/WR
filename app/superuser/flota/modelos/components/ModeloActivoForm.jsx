// app/superuser/flota/modelos/components/ModeloActivoForm.jsx
'use client';

import { useState } from 'react';
import { 
  TextInput, NumberInput, Select, Button, Group, 
  Stack, LoadingOverlay, Divider 
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { AsyncCatalogComboBox } from '@/app/components/CatalogCombobox';

// IMPORTA TU COMPONENTE AQUÍ (Ajusta la ruta según tu estructura)

export default function ModeloActivoForm({ 
    tipoPreseleccionado = 'Vehiculo', 
    onSuccess, 
    onCancel 
}) {
    const [loading, setLoading] = useState(false);

    const form = useForm({
        initialValues: {
            marca: "", // Ahora solo guardamos el ID
            modelo: '',
            anio: "",
            // Campos específicos
            tipoVehiculo: '',  
            tipoRemolque: '',  
            tipoMaquina: '',   
            ejes: 2,           
            capacidadCarga: '',
        },
        validate: {
            marca: (val) => (!val ? 'La marca es obligatoria' : null),
            modelo: (val) => (tipoPreseleccionado !== 'Remolque' && !val ? 'El modelo es obligatorio' : null),
        }
    });

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // Ya no necesitamos crear la marca aquí, el AsyncCatalogCombobox ya nos da el ID listo
            
            // 1. Preparar Payload según el Tipo
            let endpoint = '';
            let payload = {
                marca: parseInt(values.marca),
                anio: values.anio
            };

            if (tipoPreseleccionado === 'Vehiculo') {
                endpoint = '/api/gestionMantenimiento/vehiculo';
                payload = {
                    ...payload,
                    modelo: values.modelo,
                    tipoVehiculo: values.tipoVehiculo,
                    numeroEjes: values.ejes
                };
            } 
            else if (tipoPreseleccionado === 'Remolque') {
                endpoint = '/api/gestionMantenimiento/remolque';
                payload = {
                    ...payload,
                    tipoRemolque: values.tipoRemolque,
                    numeroEjes: values.ejes,
                    capacidad: values.capacidadCarga
                };
            }
            else if (tipoPreseleccionado === 'Maquina') {
                endpoint = '/api/gestionMantenimiento/maquina';
                payload = {
                    ...payload,
                    modelo: values.modelo,
                    tipoMaquina: values.tipoMaquina
                };
            }

            // 2. Enviar a la API
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const res = await response.json();

            if (res.success) {
                notifications.show({ title: 'Éxito', message: 'Plantilla creada correctamente', color: 'green' });
                if (onSuccess) onSuccess(res.data);
            } else {
                throw new Error(res.error || 'No se pudo crear el modelo');
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
            
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    {/* COMPONENTE REUTILIZABLE DE MARCAS */}
                    <AsyncCatalogComboBox
                        label="Marca"
                        placeholder="Buscar o crear marca..."
                        fieldKey="marca"
                        form={form}
                        catalogo="marcasVehiculos"
                    />

                    {/* MODELO COMERCIAL */}
                    {tipoPreseleccionado !== 'Remolque' && (
                        <TextInput 
                            label="Modelo Comercial" 
                            placeholder={tipoPreseleccionado === 'Vehiculo' ? "ej. Granite, Stralis" : "ej. 416E, D6T"}
                            required 
                            {...form.getInputProps('modelo')} 
                        />
                    )}

                    <Group grow>
                        <NumberInput 
                            label="Año del Modelo" 
                            min={1980} max={2030} 
                            {...form.getInputProps('anio')} 
                        />
                        
                        {(tipoPreseleccionado === 'Vehiculo' || tipoPreseleccionado === 'Remolque') && (
                            <NumberInput 
                                label="Nro. Ejes" 
                                min={1} max={12} 
                                {...form.getInputProps('ejes')} 
                            />
                        )}
                    </Group>

                    {/* CAMPOS ESPECÍFICOS */}
                    {tipoPreseleccionado === 'Vehiculo' && (
                        <Select 
                            label="Tipo de Vehículo"
                            placeholder="Seleccione..."
                            data={['Chuto', 'Camión 350', 'Camión 750', 'Volqueta', 'Bus', 'Camioneta', 'Automóvil']}
                            {...form.getInputProps('tipoVehiculo')}
                        />
                    )}

                    {tipoPreseleccionado === 'Remolque' && (
                        <Select 
                            label="Tipo de Remolque"
                            placeholder="Seleccione..."
                            required
                            data={['Batea', 'Plataforma', 'Lowboy', 'Cisterna', 'Jaula', 'Tolva', 'Portacontenedor']}
                            {...form.getInputProps('tipoRemolque')}
                        />
                    )}

                    {tipoPreseleccionado === 'Maquina' && (
                        <Select 
                            label="Tipo de Máquina"
                            placeholder="Seleccione..."
                            data={['Retroexcavadora', 'Excavadora', 'Payloader', 'Motoniveladora', 'Vibrocompactador', 'Grúa', 'Montacargas', 'Planta Eléctrica', 'Taladro']}
                            {...form.getInputProps('tipoMaquina')}
                        />
                    )}

                    <Divider my="sm" />

                    <Group justify="right">
                        <Button variant="default" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" leftSection={<IconDeviceFloppy size={18} />}>
                            Guardar Modelo
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Stack>
    );
}