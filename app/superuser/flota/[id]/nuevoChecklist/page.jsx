'use client';

import {
    Paper,
    Title,
    Group,
    Button,
    NumberInput,
    Checkbox,
    SimpleGrid,
    Divider,
    Text,
    Stack,
    Radio,
    Box,
} from '@mantine/core';
import { DatePicker, DatePickerInput } from '@mantine/dates';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { useForm } from '@mantine/form';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import GrupoCondicional from './GrupoCondicional';
import { notifications } from '@mantine/notifications';
import BackButton from '../../../../components/BackButton';

export default function NuevoChecklistPage() {
    const [ultimoChecklist, setUltimoChecklist] = useState(null);
    const router = useRouter();
    const { id } = useParams();
    const [vehiculo, setVehiculo] = useState(null);

    useEffect(() => {
        try {
            fetch(`/api/vehiculos/${id}`)
                .then((res) => res.json())
                .then((data1) => {
                    fetch(`/api/checklists?vehiculoId=${id}`)
                        .then((res) => res.json())
                        .then((data2) => {
                            if (Array.isArray(data2) && data2.length > 0) {
                                setUltimoChecklist(data2[0]); // el más reciente
                                setVehiculo(data1)
                                console.log('datos cargados');
                            }
                            else {
                                setUltimoChecklist(data2); // el más reciente
                                setVehiculo(data1);
                                notifications.show({ title: 'Cargados los datos actuales del vehiculo' });

                            }
                        })
                }
                )



        } catch (error) {
            console.error(`No se pudo cargar la informacion: ${error.message}`)
            notifications.show({ title: `No se pudo cargar la informacion: ${error.message}` })
        }

    }, [id]);

    const form = useForm({
        initialValues: {
            fechaModo: 'hoy',
            fecha: new Date(),
            kilometraje: 0,
            horometro: 0,
            aceiteUltimoCambioKm: 0,

            luces: {
                necesitaReemplazo: false,
                bombilloDelBaja: false,
                bombilloDelAlta: false,
                intermitenteDelFrizq: false,
                intermitenteDelFder: false,
                intermitenteLateral: false,
                bombilloTrasero: false,
                reemplazoProgramado: 'futuro', // 'hoy' o 'futuro'
            },


            filtroAireOk: true,
            filtroAceiteOk: true,
            filtroCombustibleOk: true,
            correaOk: true,
            neumaticoOk: true,
            inyectoresOk: true,
            aceite: {
                cambio: false,
                fechaCambio: new Date(),
                realizadoPor: '',
                autorizadoPor: '',

            },
        }
    }
    );

    useEffect(() => {
        console.log("entre en useffect")
        console.log(vehiculo, ultimoChecklist);
        if (vehiculo && ultimoChecklist) {
            form.setValues({
                fecha: new Date(),
                kilometraje: ultimoChecklist.kilometraje,
                horometro: ultimoChecklist.horometro,
                aceiteUltimoCambioKm: ultimoChecklist.aceiteUltimoCambioKm,
                // ...otros valores si quieres precargar más
            });
        }
    }, [vehiculo, ultimoChecklist]);

    useEffect(() => {
        if (form.values.fechaModo === 'hoy') {
            form.setFieldValue('fecha', new Date());
        }
    }, [form.values.fechaModo]);

    const handleSubmit = async (vals) => {
        await fetch('/api/checklists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vehiculoId: id, ...vals }),
        });
        router.push(`/superuser/flota/${id}`);
    };

    if (!vehiculo) return <Text>Cargando ficha del vehículo...</Text>;

    return (
        <Paper withBorder p="md" radius="md" mt={90} mx={20}>
            <SimpleGrid cols={3} spacing="xs" mb="md">
                <BackButton onClick={() => router.push('/superuser/flota')}/>
                <Title order={2} mb="md">
                    Revisión {vehiculo.marca} {vehiculo.modelo}
                </Title>
                <Box></Box>
            </SimpleGrid>


            <form onSubmit={form.onSubmit(handleSubmit)}>
                <SimpleGrid cols={3} spacing="md" mb="md">
                    <Stack spacing="sm" mb="md">
                        <Radio.Group
                            label="¿Cuál es la fecha de revisión?"
                            {...form.getInputProps('fechaModo')}
                        >
                            <Group>
                                <Radio value="hoy" label="Fecha actual" />
                                <Radio value="personalizada" label="Personalizada" />
                            </Group>
                        </Radio.Group>

                        {form.values.fechaModo === 'personalizada' && (
                            <DatePickerInput
                                label="Seleccione la fecha"
                                {...form.getInputProps('fecha')}
                            />
                        )}

                    </Stack>

                    <NumberInput
                        label="Kilometraje"
                        {...form.getInputProps('kilometraje')}
                        min={ultimoChecklist?.kilometraje || 0}
                        onBlur={(e) => {
                            const valor = Number(e.target.value);
                            if (ultimoChecklist && valor < ultimoChecklist.kilometraje) {
                                form.setFieldError(
                                    'kilometraje',
                                    `Debe ser mayor al kilometraje actual`
                                );
                                notifications.show({
                                    title: 'Kilometraje inválido',
                                    message: `El valor ingresado es menor que el último registrado (${ultimoChecklist.kilometraje} km).`,
                                    color: 'red',
                                });
                            } else {
                                form.clearFieldError('kilometraje');
                            }
                        }}
                    />

                    <NumberInput
                        label="Horómetro"
                        {...form.getInputProps('horometro')}
                        min={ultimoChecklist?.horometro || 0}
                        onBlur={(e) => {
                            const valor = Number(e.target.value);
                            if (ultimoChecklist && valor < ultimoChecklist.horometro) {
                                form.setFieldError(
                                    'horometro',
                                    `Debe ser mayor que las horas de uso actuales`
                                );
                                notifications.show({
                                    title: 'Horómetro inválido',
                                    message: `El valor ingresado es menor que el último registrado (${ultimoChecklist.horometro} h).`,
                                    color: 'red',
                                });
                            } else {
                                form.clearFieldError('horometro');
                            }
                        }}
                    />
                </SimpleGrid>

                <GrupoCondicional
                    label="Aceite"
                    pregunta="¿Se hará cambio de aceite?"
                    instruccion="Complete los siguientes campos:"
                    clave="aceite"
                    tipo="especialAceite"
                    campos={[
                        ['Fecha del cambio', 'aceite.fechaCambio', 'date'],
                        ['Realizado por', 'aceite.realizadoPor', 'text'],
                        ['Autorizado por', 'aceite.autorizadoPor', 'text'],
                    ]}
                    form={form}
                />


                <GrupoCondicional
                    label="Luces / Bombillos"
                    pregunta="¿Algún bombillo necesita reemplazo?"
                    instruccion="Marca los bombillos afectados y si serán reemplazados hoy o después:"
                    clave="luces"
                    tipo="especialLuces"
                    campos={[
                        ['Luz baja', 'luces.bombilloDelBaja'],
                        ['Luz alta', 'luces.bombilloDelAlta'],
                        ['Intermitente izq.', 'luces.intermitenteDelFrizq'],
                        ['Intermitente der.', 'luces.intermitenteDelFder'],
                        ['Intermitente lateral', 'luces.intermitenteLateral'],
                        ['Luz trasera', 'luces.bombilloTrasero'],
                    ]}
                    form={form}
                />


                <Divider label="Componentes mecánicos" labelPosition="center" my="md" />
                <SimpleGrid cols={3} spacing="xs">
                    <Checkbox label="Filtro de aire OK" {...form.getInputProps('filtroAireOk', { type: 'checkbox' })} />
                    <Checkbox label="Filtro de aceite OK" {...form.getInputProps('filtroAceiteOk', { type: 'checkbox' })} />
                    <Checkbox label="Filtro de combustible OK" {...form.getInputProps('filtroCombustibleOk', { type: 'checkbox' })} />
                    <Checkbox label="Correa OK" {...form.getInputProps('correaOk', { type: 'checkbox' })} />
                    <Checkbox label="Neumático OK" {...form.getInputProps('neumaticoOk', { type: 'checkbox' })} />
                    <Checkbox label="Inyectores OK" {...form.getInputProps('inyectoresOk', { type: 'checkbox' })} />
                </SimpleGrid>

                <Group position="right" mt="xl">
                    <Button type="submit" variant="filled">
                        Guardar checklist
                    </Button>
                </Group>
            </form>
        </Paper>
    );
}