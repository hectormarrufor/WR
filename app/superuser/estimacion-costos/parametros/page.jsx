'use client';

import { useEffect, useState } from 'react';
import {
    Container, Title, Divider, NumberInput, Stack, Button, Card
} from '@mantine/core';

export default function ParametrosPage() {
    const [form, setForm] = useState({
        // RESGUARDO
        tarifaHoraVigilante: 3.5,
        vigilantesPorTurno: 2,
        turnosDiarios: 2,
        diasOperativosMes: 30,
        rateResguardo: 0,

        // POSESIÓN
        valorActivo: 50000,
        vidaUtilMeses: 60,
        coeficientePosesion: 2,
        ratePosesion: 0,

        // MANO DE OBRA FIJA
        sueldoBase: 400,
        cargasSocialesFija: 30,
        bonificaciones: 50,
        rateManoObraFija: 0,

        // MANO DE OBRA VARIABLE
        tarifaHoraVariable: 5,
        cargasSocialesVariable: 20,
        rateManoObraVariable: 0,

        // OPERACIÓN Y MANTENIMIENTO
        frecuenciaMensual: 2,
        costoRepuestos: 150,
        costoManoTecnica: 100,
        rateMantenimiento: 0,

        // ADMINISTRATIVOS
        cantidadPersonal: 2,
        softwareServicios: 80,
        costosIndirectos: 120,
        rateAdministrativos: 0,
    });

    useEffect(() => {
        // Cálculo automático de tarifas basadas en los inputs
        const resguardo = form.tarifaHoraVigilante * form.vigilantesPorTurno * form.turnosDiarios * form.diasOperativosMes;
        const posesion = (form.valorActivo * (form.coeficientePosesion / 100)) / form.vidaUtilMeses;
        const manoObraFija = form.sueldoBase * (1 + form.cargasSocialesFija / 100) + form.bonificaciones;
        const manoObraVariable = form.tarifaHoraVariable * (1 + form.cargasSocialesVariable / 100);
        const mantenimiento = form.frecuenciaMensual * (form.costoRepuestos + form.costoManoTecnica);
        const administrativos = (form.softwareServicios + form.costosIndirectos) + (form.cantidadPersonal * 300); // Asumiendo $300 por persona

        setForm((prev) => ({
            ...prev,
            rateResguardo: resguardo,
            ratePosesion: posesion,
            rateManoObraFija: manoObraFija,
            rateManoObraVariable: manoObraVariable,
            rateMantenimiento: mantenimiento,
            rateAdministrativos: administrativos
        }));
    }, [
        form.tarifaHoraVigilante, form.vigilantesPorTurno, form.turnosDiarios, form.diasOperativosMes,
        form.valorActivo, form.vidaUtilMeses, form.coeficientePosesion,
        form.sueldoBase, form.cargasSocialesFija, form.bonificaciones,
        form.tarifaHoraVariable, form.cargasSocialesVariable,
        form.frecuenciaMensual, form.costoRepuestos, form.costoManoTecnica,
        form.cantidadPersonal, form.softwareServicios, form.costosIndirectos
    ]);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleGuardar = async () => {
        await fetch('/api/cost-parameters', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        alert('Parámetros guardados exitosamente');
    };

    return (
        <Container size="md" py="xl">
            <Title order={2} mb="lg">Configuración de parámetros de estimación</Title>
            <Card   shadow="sm" padding="lg">

                {/* RESGUARDO */}
                <Title order={4}>🧯 Resguardo</Title>
                <Divider mb="sm" />
                <Stack>
                    <NumberInput label="Tarifa por hora del vigilante ($)" value={form.tarifaHoraVigilante} onChange={(val) => handleChange('tarifaHoraVigilante', val)} />
                    <NumberInput label="Vigilantes por turno" value={form.vigilantesPorTurno} onChange={(val) => handleChange('vigilantesPorTurno', val)} />
                    <NumberInput label="Turnos diarios" value={form.turnosDiarios} onChange={(val) => handleChange('turnosDiarios', val)} />
                    <NumberInput label="Días operativos al mes" value={form.diasOperativosMes} onChange={(val) => handleChange('diasOperativosMes', val)} />
                    <NumberInput
                        label="Costo mensual estimado de resguardo ($)"
                        value={form.rateResguardo}
                        disabled
                        description="Calculado automáticamente"
                    />
                </Stack>

                {/* POSESIÓN */}
                <Title order={4} mt="xl">🏗️ Posesión</Title>
                <Divider mb="sm" />
                <Stack>
                    <NumberInput label="Valor del activo ($)" value={form.valorActivo} onChange={(val) => handleChange('valorActivo', val)} />
                    <NumberInput label="Vida útil (meses)" value={form.vidaUtilMeses} onChange={(val) => handleChange('vidaUtilMeses', val)} />
                    <NumberInput label="Coeficiente de posesión (%)" value={form.coeficientePosesion} onChange={(val) => handleChange('coeficientePosesion', val)} />
                    <NumberInput
                        label="Costo mensual estimado de posesión ($)"
                        value={form.ratePosesion}
                        disabled
                        description="Calculado automáticamente"
                    />
                </Stack>

                {/* MANO DE OBRA FIJA */}
                <Title order={4} mt="xl">👷 Mano de obra fija</Title>
                <Divider mb="sm" />
                <Stack>
                    <NumberInput label="Sueldo base ($)" value={form.sueldoBase} onChange={(val) => handleChange('sueldoBase', val)} />
                    <NumberInput label="Cargas sociales (%)" value={form.cargasSocialesFija} onChange={(val) => handleChange('cargasSocialesFija', val)} />
                    <NumberInput label="Bonificaciones ($)" value={form.bonificaciones} onChange={(val) => handleChange('bonificaciones', val)} />
                    <NumberInput
                        label="Costo mensual estimado de mano de obra fija ($)"
                        value={form.rateManoObraFija}
                        disabled
                        description="Calculado automáticamente"
                    />
                </Stack>

                {/* MANO DE OBRA VARIABLE */}
                <Title order={4} mt="xl">⏱️ Mano de obra variable</Title>
                <Divider mb="sm" />
                <Stack>
                    <NumberInput label="Tarifa por hora ($)" value={form.tarifaHoraVariable} onChange={(val) => handleChange('tarifaHoraVariable', val)} />
                    <NumberInput label="Cargas sociales (%)" value={form.cargasSocialesVariable} onChange={(val) => handleChange('cargasSocialesVariable', val)} />
                    <NumberInput
                        label="Costo por hora estimado de mano de obra variable ($)"
                        value={form.rateManoObraVariable}
                        disabled
                        description="Calculado automáticamente"
                    />
                </Stack>

                {/* OPERACIÓN Y MANTENIMIENTO */}
                <Title order={4} mt="xl">🔧 Operación y mantenimiento</Title>
                <Divider mb="sm" />
                <Stack>
                    <NumberInput label="Frecuencia mensual" value={form.frecuenciaMensual} onChange={(val) => handleChange('frecuenciaMensual', val)} />
                    <NumberInput label="Costo de repuestos ($)" value={form.costoRepuestos} onChange={(val) => handleChange('costoRepuestos', val)} />
                    <NumberInput label="Mano técnica ($)" value={form.costoManoTecnica} onChange={(val) => handleChange('costoManoTecnica', val)} />
                    <NumberInput
                        label="Costo mensual estimado de operación y mantenimiento ($)"
                        value={form.rateMantenimiento}
                        disabled
                        description="Calculado automáticamente"
                    />
                </Stack>

                {/* ADMINISTRATIVOS */}
                <Title order={4} mt="xl">📋 Costos administrativos</Title>
                <Divider mb="sm" />
                <Stack>
                    <NumberInput label="Cantidad de personal" value={form.cantidadPersonal} onChange={(val) => handleChange('cantidadPersonal', val)} />
                    <NumberInput label="Software y servicios ($)" value={form.softwareServicios} onChange={(val) => handleChange('softwareServicios', val)} />
                    <NumberInput label="Costos indirectos ($)" value={form.costosIndirectos} onChange={(val) => handleChange('costosIndirectos', val)} />
                    <NumberInput
                        label="Costo mensual estimado de administrativos ($)"
                        value={form.rateAdministrativos}
                        disabled
                        description="Calculado automáticamente"
                    />

                </Stack>

                <Button fullWidth mt="xl" onClick={handleGuardar}>Guardar parámetros</Button>
            </Card>
        </Container>
    );
}