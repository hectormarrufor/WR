'use client';

import { useState, useMemo } from 'react';
import { 
    Modal, Grid, Stack, Title, Text, Paper, 
    Badge, Group, ThemeIcon, Box, Alert, 
    Select, Center, Card, Divider, ActionIcon, RingProgress, ScrollArea
} from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { 
    IconTruck, IconMoonStars, IconFlagCheck, 
    IconSteeringWheel, IconInfoCircle, IconReceipt2, 
    IconDashboard, IconRoute, IconCalendar, IconMapPin
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import GoogleRouteMap from '../../fletes/components/GoogleRouteMap';

// --- Función Matemática de Haversine ---
const calcularDistanciaKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export default function SimuladorRutaFleteModal({ opened, onClose, tickets = [], peajesMaster = [] }) {
    const [destinoManual, setDestinoManual] = useState(null);
    const [controlActivo, setControlActivo] = useState(0); 
    
    const [fechaDescarga, setFechaDescarga] = useState('');
    const [horaLlegadaDestino, setHoraLlegadaDestino] = useState('12:00');
    const [horaSalidaDestino, setHoraSalidaDestino] = useState('14:00');

    const fechasDisponibles = useMemo(() => {
        const fechas = tickets.map(t => t.fecha);
        return [...new Set(fechas)].sort().map(f => ({ value: f, label: dayjs(f).format('DD/MM/YYYY') }));
    }, [tickets]);

    // 🔥 LÓGICA REFACTORIZADA: NODOS UNIFICADOS 🔥
    const { puntosDeControl, estadisticas } = useMemo(() => {
        if (!tickets.length) return { puntosDeControl: [], estadisticas: null };

        const ticketsOrdenados = [...tickets].sort((a, b) => 
            dayjs(`${a.fecha} ${a.hora}`).diff(dayjs(`${b.fecha} ${b.hora}`))
        );

        let controles = [];
        const baseCoords = { lat: 10.257083, lng: -71.343111 };
        
        controles.push({
            timestamp: dayjs(`${ticketsOrdenados[0].fecha} 05:00`).valueOf(),
            lat: baseCoords.lat, lng: baseCoords.lng,
            label: 'Salida Base', 
            subLabel: '05:00',
            tipo: 'base', color: 'blue'
        });

        ticketsOrdenados.forEach((t, index) => {
            const peajeInfo = peajesMaster.find(p => p.id === t.peajeId);
            if (!peajeInfo) return;

            // Fusión de Pernocta y Reinicio en un solo Nodo
            if (index > 0 && t.fecha !== ticketsOrdenados[index - 1].fecha) {
                controles.push({
                    timestamp: dayjs(`${ticketsOrdenados[index - 1].fecha} 20:00`).valueOf(),
                    lat: parseFloat(peajeInfo.latitud), lng: parseFloat(peajeInfo.longitud),
                    label: 'Descanso Nocturno', 
                    subLabel: '20:00 - 05:30', // Rango visual unificado
                    tipo: 'pernocta', color: 'dark'
                });
            }

            const nombreLimpio = peajeInfo.nombre ? peajeInfo.nombre.replace(/peaje\s*/i, '').trim() : 'Punto de Control';

            controles.push({
                timestamp: dayjs(`${t.fecha} ${t.hora}`).valueOf(),
                lat: parseFloat(peajeInfo.latitud), lng: parseFloat(peajeInfo.longitud),
                label: nombreLimpio, 
                subLabel: dayjs(`${t.fecha} ${t.hora}`).format('HH:mm'),
                tipo: 'peaje', color: 'indigo'
            });
        });

        // Fusión de Llegada y Salida del Cliente en un solo Nodo
        if (destinoManual && fechaDescarga) {
            controles.push({
                timestamp: dayjs(`${fechaDescarga} ${horaLlegadaDestino}`).valueOf(),
                lat: destinoManual.lat, lng: destinoManual.lng,
                label: 'Visita Cliente', 
                subLabel: `${horaLlegadaDestino} - ${horaSalidaDestino}`,
                tipo: 'destino', color: 'teal'
            });
        }

        const ultimoTicket = ticketsOrdenados[ticketsOrdenados.length - 1];
        controles.push({
            timestamp: dayjs(`${ultimoTicket.fecha} ${ultimoTicket.hora}`).add(4, 'hour').valueOf(),
            lat: baseCoords.lat, lng: baseCoords.lng,
            label: 'Retorno Base', 
            subLabel: dayjs(`${ultimoTicket.fecha} ${ultimoTicket.hora}`).add(4, 'hour').format('HH:mm'),
            tipo: 'base', color: 'blue'
        });

        controles.sort((a, b) => a.timestamp - b.timestamp);

        // Cálculo Matemático Ajustado para Nodos Unificados
        let distanciaTotalEstimada = 0;
        let horasDescanso = 0;
        
        for (let i = 1; i < controles.length; i++) {
            distanciaTotalEstimada += calcularDistanciaKm(controles[i - 1].lat, controles[i - 1].lng, controles[i].lat, controles[i].lng);
        }

        controles.forEach(c => {
            if (c.tipo === 'pernocta') horasDescanso += 9.5; // 20:00 a 05:30 son 9.5 horas fijas
            if (c.tipo === 'destino' && horaLlegadaDestino && horaSalidaDestino) {
                const arrLlegada = horaLlegadaDestino.split(':');
                const arrSalida = horaSalidaDestino.split(':');
                const hLlegada = parseInt(arrLlegada[0]) + (parseInt(arrLlegada[1]) / 60);
                const hSalida = parseInt(arrSalida[0]) + (parseInt(arrSalida[1]) / 60);
                horasDescanso += (hSalida >= hLlegada) ? (hSalida - hLlegada) : 0;
            }
        });

        const totalHorasViaje = (controles[controles.length - 1].timestamp - controles[0].timestamp) / (1000 * 60 * 60);
        let horasConduccionReal = totalHorasViaje - horasDescanso;
        if (horasConduccionReal < 0) horasConduccionReal = 0.1; // Fallback de seguridad

        distanciaTotalEstimada = distanciaTotalEstimada * 1.20; 
        const velocidadPromedio = horasConduccionReal > 0 ? (distanciaTotalEstimada / horasConduccionReal) : 0;

        return { 
            puntosDeControl: controles, 
            estadisticas: {
                distancia: distanciaTotalEstimada,
                horasConduccion: horasConduccionReal,
                horasDescanso,
                horasTotal: totalHorasViaje,
                velocidad: velocidadPromedio
            }
        };
    }, [tickets, peajesMaster, destinoManual, fechaDescarga, horaLlegadaDestino, horaSalidaDestino]);

    const posicionActual = useMemo(() => puntosDeControl[controlActivo] || null, [controlActivo, puntosDeControl]);

    // Ancho dinámico para que los puntos no se aplasten si son demasiados
    const timelineMinWidth = Math.max(100, puntosDeControl.length * 85); 

    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            fullScreen 
            padding="lg"
            title={
                <Group gap="sm">
                    <ThemeIcon size="lg" radius="md" variant="light" color="blue"><IconRoute size={22} /></ThemeIcon>
                    <Title order={3} c="dark.8">Auditoría Operativa de Flete</Title>
                    <Badge color="blue" variant="dot">Visión Panorámica</Badge>
                </Group>
            } 
        >
            <Stack gap="md" h="calc(100vh - 100px)">
                
                {/* 🔥 TIMELINE ZIG-ZAG ARRIBA Y SIN APLASTARSE 🔥 */}
                <Card withBorder radius="md" shadow="sm" p="sm" bg="gray.0" style={{ height: 130, flexShrink: 0 }}>
                    <ScrollArea w="100%" h="100%" type="auto" offsetScrollbars>
                        <Box style={{ position: 'relative', minWidth: `${timelineMinWidth}px`, height: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
                            <Box style={{ position: 'absolute', top: '50%', left: 20, right: 20, height: 4, backgroundColor: 'var(--mantine-color-gray-4)', transform: 'translateY(-50%)', zIndex: 1 }} />

                            {puntosDeControl.map((p, idx) => {
                                const isTop = idx % 2 === 0;
                                const isActivo = idx === controlActivo;
                                return (
                                    <Box 
                                        key={idx} 
                                        onMouseEnter={() => setControlActivo(idx)}
                                        style={{ 
                                            position: 'relative', 
                                            zIndex: 2, 
                                            flex: 1, 
                                            height: '100%', 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center', 
                                            justifyContent: isTop ? 'flex-start' : 'flex-end', 
                                            cursor: 'pointer' 
                                        }} 
                                    >
                                        {isTop && (
                                            <Box style={{ paddingBottom: 6, textAlign: 'center' }}>
                                                <Text size="11px" fw={isActivo ? 800 : 700} lineClamp={2} c={isActivo ? 'blue.9' : 'dark'}>{p.label}</Text>
                                                <Text size="10px" fw={600} c={isActivo ? 'blue.7' : 'dimmed'}>{p.subLabel}</Text>
                                            </Box>
                                        )}
                                        
                                        <ActionIcon 
                                            size={isActivo ? 'lg' : 'md'} 
                                            radius="xl" 
                                            color={isActivo ? 'red' : p.color} 
                                            variant="filled" 
                                            style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', transition: 'all 0.2s', border: '2px solid white', boxShadow: isActivo ? '0 0 10px rgba(224, 49, 49, 0.6)' : 'none' }}
                                        >
                                            {isActivo ? <IconTruck size={14}/> : <Box w={6} h={6} bg="white" style={{ borderRadius: '50%' }}/>}
                                        </ActionIcon>

                                        {!isTop && (
                                            <Box style={{ paddingTop: 6, textAlign: 'center' }}>
                                                <Text size="11px" fw={isActivo ? 800 : 700} lineClamp={2} c={isActivo ? 'blue.9' : 'dark'}>{p.label}</Text>
                                                <Text size="10px" fw={600} c={isActivo ? 'blue.7' : 'dimmed'}>{p.subLabel}</Text>
                                            </Box>
                                        )}
                                    </Box>
                                )
                            })}
                        </Box>
                    </ScrollArea>
                </Card>

                <Grid gutter="lg" style={{ flex: 1, minHeight: 0 }}>
                    {/* COLUMNA MAPA */}
                    <Grid.Col span={9} h="100%">
                        <Card withBorder radius="md" p={0} h="100%" shadow="sm" style={{ overflow: 'hidden', position: 'relative' }}>
                            {(!destinoManual || !fechaDescarga) && (
                                <Alert color="red" variant="filled" radius={0} icon={<IconInfoCircle size={16} />}>
                                    Haz clic en el mapa para ubicar el cliente y define la fecha de descarga en el panel. Pasa el mouse sobre el mapa para interpolar tiempos.
                                </Alert>
                            )}
                            <GoogleRouteMap 
                                peajes={peajesMaster}
                                initialWaypoints={destinoManual ? [{ lat: destinoManual.lat, lng: destinoManual.lng, isDestino: true }] : []}
                                vehiculoAsignado={true}
                                onMapClick={(e) => setDestinoManual({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
                                currentPosition={posicionActual} 
                                puntosDeControl={puntosDeControl} 
                            />
                        </Card>
                    </Grid.Col>

                    {/* COLUMNA PANEL */}
                    <Grid.Col span={3} h="100%" style={{ overflowY: 'auto' }}>
                        <Stack h="100%">
                            <Card withBorder radius="md" shadow="sm">
                                <Title order={5} mb="md" display="flex" style={{ alignItems: 'center', gap: 8 }}>
                                    <IconFlagCheck size={18} color="var(--mantine-color-teal-6)" /> Visita a Cliente
                                </Title>
                                <Stack gap="sm">
                                    <Select 
                                        label="Día de Llegada"
                                        placeholder="Seleccione"
                                        data={fechasDisponibles}
                                        value={fechaDescarga}
                                        onChange={setFechaDescarga}
                                        leftSection={<IconCalendar size={16} color="gray"/>}
                                    />
                                    <Group grow>
                                        <TimeInput label="Inicio Descarga" value={horaLlegadaDestino} onChange={(e) => setHoraLlegadaDestino(e.target.value)} />
                                        <TimeInput label="Salida Retorno" value={horaSalidaDestino} onChange={(e) => setHoraSalidaDestino(e.target.value)} />
                                    </Group>
                                </Stack>
                            </Card>

                            {estadisticas && (
                                <Card withBorder radius="md" shadow="sm" bg="gray.0" style={{ flexGrow: 1 }}>
                                    <Title order={5} mb="sm" display="flex" style={{ alignItems: 'center', gap: 8 }}>
                                        <IconDashboard size={18} color="var(--mantine-color-blue-6)" /> Rendimiento Dinámico
                                    </Title>
                                    <Divider mb="md" />
                                    
                                    <Stack gap="md">
                                        <Group justify="space-between" align="center" wrap="nowrap">
                                            <Box>
                                                <Text size="xs" c="dimmed" fw={700} tt="uppercase">Velocidad Promedio</Text>
                                                <Text size="h2" fw={900} c={estadisticas.velocidad > 75 ? 'red.7' : 'blue.8'}>
                                                    {estadisticas.velocidad.toFixed(0)} <Text span size="sm" c="dimmed">km/h</Text>
                                                </Text>
                                            </Box>
                                            <RingProgress 
                                                size={70} thickness={8} roundCaps 
                                                sections={[{ value: (estadisticas.velocidad / 100) * 100, color: estadisticas.velocidad > 75 ? 'red' : 'blue' }]} 
                                                label={<Center><IconDashboard size={20} color={estadisticas.velocidad > 75 ? 'red' : 'gray'} /></Center>}
                                            />
                                        </Group>

                                        <Box>
                                            <Group justify="space-between" mb={4}>
                                                <Group gap={6}><IconSteeringWheel size={14} color="gray"/><Text size="sm" fw={600}>Conducción Neta</Text></Group>
                                                <Text size="sm" fw={800}>{estadisticas.horasConduccion.toFixed(1)} h</Text>
                                            </Group>
                                            <Group justify="space-between" mb={4}>
                                                <Group gap={6}><IconMoonStars size={14} color="gray"/><Text size="sm" fw={600}>Descanso/Espera</Text></Group>
                                                <Text size="sm" fw={800} c="dimmed">{estadisticas.horasDescanso.toFixed(1)} h</Text>
                                            </Group>
                                            <Group justify="space-between" mt="md">
                                                <Group gap={6}><IconRoute size={14} color="gray"/><Text size="sm" fw={700} c="blue.9">Distancia Aproximada</Text></Group>
                                                <Text size="sm" fw={900} c="blue.9">~{estadisticas.distancia.toFixed(0)} km</Text>
                                            </Group>
                                        </Box>
                                    </Stack>
                                </Card>
                            )}
                        </Stack>
                    </Grid.Col>
                </Grid>
            </Stack>
        </Modal>
    );
}