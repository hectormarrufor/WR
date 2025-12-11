'use client';
import { Flex, Paper, Select, Stack, Title } from '@mantine/core';
import BackButton from '@/app/components/BackButton';
import { useState } from 'react';
import FiltroForm from './FiltroForm';


export default function NuevoConsumiblePage() {
    const [tipo, setTipo] = useState(null);

    return (
        <Paper p="xl" mt={30}>
            <Stack justify="space-between" mb="xl">
                <Flex>
                    <Title order={2}>Crear Nuevo Consumible</Title>
                    <BackButton />
                </Flex>
                <Select
                    data={[
                        { value: 'aceiteMotor', label: 'Aceite de Motor' },
                        { value: 'aceiteHidraulico', label: 'Aceite Hidráulico' },
                        { value: 'neumatico', label: 'Neumático' },
                        { value: 'bateria', label: 'Batería' },
                        { value: 'filtro', label: 'Filtro' },
                        { value: 'sensor', label: 'Sensor' },
                    ]}
                    placeholder="Selecciona tipo de consumible"
                    value={tipo}
                    onChange={(v) => setTipo(v || '')}
                    clearable
                    searchable
                    size="sm"
                    style={{ minWidth: 220 }}
                />

                {(tipo === "aceiteMotor") ?
                    <AceiteMotorForm /> :
                    (tipo === "aceiteHidraulico") ?
                        <AceiteHidraulicoForm /> :
                        (tipo === "neumatico") ?
                            <NeumaticoForm /> :
                            (tipo === "bateria") ?
                                <BateriaForm /> :
                                (tipo === "filtro") ?
                                    <FiltroForm /> :
                                    (tipo === "sensor") ?
                                        <SensorForm />
                                        : null
                }
            </Stack>
        </Paper>
    );
}