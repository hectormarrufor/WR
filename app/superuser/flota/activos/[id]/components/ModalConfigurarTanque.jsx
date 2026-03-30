'use client';

import { useState } from 'react';
import { 
    Modal, Button, Group, Stack, NumberInput, SegmentedControl, 
    Switch, Text, Alert, Paper, Divider, LoadingOverlay, Center, ActionIcon, Table
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
    IconCheck, IconAlertCircle, IconMathSymbols, IconGeometry, 
    IconSettings, IconCylinder, IconBox, IconPlus, IconTrash, IconListNumbers 
} from '@tabler/icons-react';

export default function ModalConfigurarTanque({ opened, onClose, activo, onSuccess }) {
    const [loading, setLoading] = useState(false);

    // Si ya tiene una configuración previa (sea heredada o propia), la cargamos
    const configInicial = activo?.configuracionTanque 
                       || activo?.vehiculoInstancia?.plantilla?.configuracionTanque 
                       || activo?.maquinaInstancia?.plantilla?.configuracionTanque 
                       || activo?.remolqueInstancia?.plantilla?.configuracionTanque 
                       || {};
                       
    const dimsIniciales = configInicial.dimensiones || {};
    const tieneAforoPrevio = configInicial.tablaAforo && configInicial.tablaAforo.length > 0;

    const form = useForm({
        initialValues: {
            tipoForma: configInicial.tipoForma || 'cilindrico',
            cantidadTanques: dimsIniciales.cantidadTanques || 1,
            largo: dimsIniciales.largo || '',
            diametro: dimsIniciales.diametro || '', // Para cilíndrico
            ancho: dimsIniciales.ancho || '',       // Para rectangular
            alto: dimsIniciales.alto || '',         // Para rectangular
            factorDescuento: configInicial.factorDescuento ? configInicial.factorDescuento * 100 : 0,
            propagateToTemplate: true,
            
            // ✨ NUEVO: TABLA DE AFORO MANUAL ✨
            usarAforoManual: tieneAforoPrevio,
            tablaAforo: tieneAforoPrevio ? configInicial.tablaAforo : [{ cm: '', litros: '' }]
        },
        validate: {
            cantidadTanques: (value) => (!value || value < 1 ? 'Mínimo 1 tanque' : null),
            largo: (value) => (!value || value <= 0 ? 'Requerido' : null),
            diametro: (value, values) => (values.tipoForma === 'cilindrico' && (!value || value <= 0) ? 'Requerido' : null),
            ancho: (value, values) => (values.tipoForma === 'rectangular' && (!value || value <= 0) ? 'Requerido' : null),
            alto: (value, values) => (values.tipoForma === 'rectangular' && (!value || value <= 0) ? 'Requerido' : null),
            tablaAforo: {
                cm: (value, values) => (values.usarAforoManual && (!value || value < 0) ? 'Requerido' : null),
                litros: (value, values) => (values.usarAforoManual && (!value || value <= 0) ? 'Requerido' : null),
            }
        }
    });

    // ✨ CÁLCULO MATEMÁTICO EN TIEMPO REAL ✨
    // ✨ CÁLCULO MATEMÁTICO EN TIEMPO REAL ✨
    const calcularCapacidad = () => {
        const { tipoForma, cantidadTanques, largo, diametro, ancho, alto, factorDescuento } = form.values;
        let volumenCm3 = 0;

        const L = parseFloat(largo) || 0;
        
        if (tipoForma === 'cilindrico') {
            const D = parseFloat(diametro) || 0;
            const R = D / 2;
            volumenCm3 = Math.PI * Math.pow(R, 2) * L;
        } else if (tipoForma === 'rectangular') {
            const W = parseFloat(ancho) || 0;
            const H = parseFloat(alto) || 0;
            volumenCm3 = L * W * H;
        }

        const qty = parseInt(cantidadTanques) || 1;
        const litrosUnidad = volumenCm3 / 1000; // Lo que agarra 1 solo tanque
        const litrosBrutosTotal = litrosUnidad * qty; // Lo que agarran todos los tanques juntos
        
        const descuento = parseFloat(factorDescuento) || 0;
        const litrosNetosTotal = litrosBrutosTotal * (1 - (descuento / 100)); // El total final real

        return {
            unidad: litrosUnidad.toFixed(2),
            brutoTotal: litrosBrutosTotal.toFixed(2),
            netoTotal: litrosNetosTotal.toFixed(2),
            qty
        };
    };

    const capacidadCalculada = calcularCapacidad();

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // Limpiamos y mapeamos la tabla de aforo si está activada
            const tablaAforoFinal = values.usarAforoManual 
                ? values.tablaAforo
                    .filter(item => item.cm !== '' && item.litros !== '') // Filtramos filas vacías
                    .map(item => ({ cm: parseFloat(item.cm), litros: parseFloat(item.litros) }))
                    .sort((a, b) => a.cm - b.cm) // Ordenamos de menor a mayor altura
                : [];

            const configuracionTanque = {
                tipoForma: values.tipoForma,
                dimensiones: {
                    cantidadTanques: parseInt(values.cantidadTanques),
                    largo: parseFloat(values.largo),
                    diametro: values.tipoForma === 'cilindrico' ? parseFloat(values.diametro) : null,
                    ancho: values.tipoForma === 'rectangular' ? parseFloat(values.ancho) : null,
                    alto: values.tipoForma === 'rectangular' ? parseFloat(values.alto) : null
                },
                factorDescuento: parseFloat(values.factorDescuento) / 100, 
                tablaAforo: tablaAforoFinal
            };

            const payload = {
                activoId: activo.id,
                configuracionTanque,
                propagateToTemplate: values.propagateToTemplate,
                capacidadNeta: parseFloat(capacidadCalculada.neto)
            };

            const response = await fetch('/api/gestionMantenimiento/activos/guardar-geometria-tanque', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Error al guardar la configuración');

            notifications.show({ title: 'Geometría Guardada', message: data.message, color: 'green', icon: <IconCheck size={18} /> });
            if (onSuccess) onSuccess();
            onClose();

        } catch (error) {
            notifications.show({ title: 'Error de Configuración', message: error.message, color: 'red', icon: <IconAlertCircle size={18} /> });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            title={<Group gap="sm"><IconGeometry c="blue" /><Text fw={700} size="lg" c="blue.8">Geometría del Tanque</Text></Group>}
            size="lg"
            centered
        >
            <LoadingOverlay visible={loading} />
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    
                    {/* 🔥 SELECTOR VISUAL MEJORADO 🔥 */}
                    <Group grow>
                        <SegmentedControl
                            data={[
                                { 
                                    value: 'cilindrico', 
                                    label: <Center gap={10}><IconCylinder size={18} /><span>Cilíndrico / D-Tank</span></Center> 
                                },
                                { 
                                    value: 'rectangular', 
                                    label: <Center gap={10}><IconBox size={18} /><span>Rectangular</span></Center> 
                                }
                            ]}
                            color="blue"
                            size="md"
                            {...form.getInputProps('tipoForma')}
                        />
                    </Group>

                    <Paper withBorder p="md" bg="gray.0" radius="md">
                        <Group justify="space-between" mb="sm">
                            <Text fw={600} size="sm">Dimensiones Físicas (Por unidad)</Text>
                            <NumberInput 
                                label="Cant. Tanques Gemelos" 
                                min={1} max={4} 
                                size="xs" 
                                w={120}
                                {...form.getInputProps('cantidadTanques')} 
                            />
                        </Group>
                        
                        <Group grow align="flex-start">
                            <NumberInput label="Largo (L)" placeholder="Ej: 150" suffix=" cm" min={1} {...form.getInputProps('largo')} />
                            {form.values.tipoForma === 'cilindrico' ? (
                                <NumberInput label="Diámetro / Alto (D)" placeholder="Ej: 65" suffix=" cm" min={1} {...form.getInputProps('diametro')} />
                            ) : (
                                <>
                                    <NumberInput label="Ancho (W)" placeholder="Ej: 60" suffix=" cm" min={1} {...form.getInputProps('ancho')} />
                                    <NumberInput label="Alto (H)" placeholder="Ej: 60" suffix=" cm" min={1} {...form.getInputProps('alto')} />
                                </>
                            )}
                        </Group>
                    </Paper>

                    <Paper withBorder p="md" bg="orange.0" radius="md" style={{ borderColor: '#ffe066' }}>
                        <NumberInput
                            label="Factor de Irregularidad (Descuento)"
                            description="Porcentaje a restar por hundimientos de fajas, paredes internas o bordes redondeados (Común en Iveco/Mack)."
                            placeholder="Ej: 4"
                            suffix=" %"
                            min={0}
                            max={50}
                            decimalScale={1}
                            {...form.getInputProps('factorDescuento')}
                        />
                    </Paper>

                    <Alert variant="light" color="teal" icon={<IconMathSymbols size={24} />}>
                        <Group justify="space-between" align="center">
                            <div>
                                <Text size="sm">Volumen por 1 Tanque: <b>{capacidadCalculada.unidad} L</b></Text>
                                <Text size="sm" c="dimmed">
                                    Total bruto ({capacidadCalculada.qty} tanque/s): <b>{capacidadCalculada.brutoTotal} L</b>
                                </Text>
                                {form.values.factorDescuento > 0 && (
                                    <Text size="xs" c="orange.8" mt={4} fw={600}>
                                        * Descontando {form.values.factorDescuento}% por irregularidades
                                    </Text>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <Text size="xs" tt="uppercase" fw={700} c="teal.8">Capacidad Neta Total</Text>
                                <Text size="xl" fw={900} c="teal.9">{capacidadCalculada.netoTotal} L</Text>
                            </div>
                        </Group>
                    </Alert>

                    <Divider />

                    {/* ✨ SECCIÓN DE PUNTOS DE REFERENCIA (AFORO) ✨ */}
                    <Paper withBorder p="md" bg="blue.0" radius="md" style={{ borderColor: '#a5d8ff' }}>
                        <Group justify="space-between" mb={form.values.usarAforoManual ? "md" : 0}>
                            <div>
                                <Text fw={700} c="blue.9" size="sm" display="flex" style={{ alignItems: 'center', gap: 6 }}>
                                    <IconListNumbers size={18} /> Puntos de Referencia (Aforo Exacto)
                                </Text>
                                <Text size="xs" c="dimmed">
                                    Ideal para tanques muy irregulares. El sistema usará estos puntos en lugar de la matemática pura.
                                </Text>
                            </div>
                            <Switch 
                                checked={form.values.usarAforoManual}
                                onChange={(event) => form.setFieldValue('usarAforoManual', event.currentTarget.checked)}
                                color="blue"
                            />
                        </Group>

                        {form.values.usarAforoManual && (
                            <Stack gap="xs">
                                <Table striped highlightOnHover withRowBorders={false}>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Marca en la Vara (cm)</Table.Th>
                                            <Table.Th>Litros Equivalentes</Table.Th>
                                            <Table.Th w={40}></Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {form.values.tablaAforo.map((item, index) => (
                                            <Table.Tr key={index}>
                                                <Table.Td p={4}>
                                                    <NumberInput placeholder="Ej: 10" suffix=" cm" min={0} hideControls {...form.getInputProps(`tablaAforo.${index}.cm`)} />
                                                </Table.Td>
                                                <Table.Td p={4}>
                                                    <NumberInput placeholder="Ej: 45" suffix=" L" min={0} hideControls {...form.getInputProps(`tablaAforo.${index}.litros`)} />
                                                </Table.Td>
                                                <Table.Td p={4} ta="center">
                                                    <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem('tablaAforo', index)}>
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                                <Button 
                                    variant="light" 
                                    color="blue" 
                                    size="xs" 
                                    leftSection={<IconPlus size={14} />} 
                                    onClick={() => form.insertListItem('tablaAforo', { cm: '', litros: '' })}
                                >
                                    Agregar Punto de Medición
                                </Button>
                            </Stack>
                        )}
                    </Paper>

                    <Divider />

                    <Switch
                        label={<Text fw={600}>Propagar a la plantilla del modelo</Text>}
                        description={`Aplicar esta geometría y aforo a todos los equipos modelo '${activo?.vehiculoInstancia?.plantilla?.modelo || activo?.maquinaInstancia?.plantilla?.modelo || activo?.remolqueInstancia?.plantilla?.modelo || 'desconocido'}'. Apágalo si es aftermarket.`}
                        checked={form.values.propagateToTemplate}
                        onChange={(event) => form.setFieldValue('propagateToTemplate', event.currentTarget.checked)}
                        color="blue"
                        size="md"
                    />

                    <Group justify="right" mt="md">
                        <Button variant="default" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" color="blue" leftSection={<IconSettings size={18} />}>
                            Guardar Configuración
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}