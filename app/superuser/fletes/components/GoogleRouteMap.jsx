'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Loader, Center, Box, Button, Text, Group, Badge, Paper } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconMountain } from '@tabler/icons-react';

const containerStyle = {
    width: '100%',
    height: '400px', 
    borderRadius: '12px 12px 0 0', 
};

// Coordenadas de Base DADICA
const center = {
    lat: 10.257083,
    lng: -71.343111
};

const LIBRARIES = [];

export default function GoogleRouteMap({ onRouteCalculated }) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
        libraries: LIBRARIES
    });

    const [map, setMap] = useState(null);
    const [waypoints, setWaypoints] = useState([]); 
    const [directionsResponse, setDirectionsResponse] = useState(null);
    
    // Estados visuales locales
    const [distanciaVisual, setDistanciaVisual] = useState(0);
    const [tiempoVisual, setTiempoVisual] = useState("");
    const [desnivelTotalVisual, setDesnivelTotalVisual] = useState(0);
    
    // --- ESTADOS PARA LA ALTIMETRÍA INTERACTIVA ---
    const [perfilElevacion, setPerfilElevacion] = useState([]); 
    const [perfilCoords, setPerfilCoords] = useState([]); // Guardamos las coordenadas (lat, lng) de cada altito
    const [hoverIndex, setHoverIndex] = useState(null); // Índice del punto donde está el mouse

    const directionsServiceRef = useRef(null);
    const elevationServiceRef = useRef(null); 
    const onRouteCalculatedRef = useRef(onRouteCalculated);

    useEffect(() => {
        onRouteCalculatedRef.current = onRouteCalculated;
    }, [onRouteCalculated]);

    const onLoad = useCallback(function callback(map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map) {
        setMap(null);
    }, []);

    const handleMapClick = (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setWaypoints(prev => [...prev, { lat, lng }]);
    };

    const limpiarRuta = () => {
        setWaypoints([]);
        setPerfilElevacion([]); 
        setPerfilCoords([]);
        setHoverIndex(null);
    };

    // --- CÁLCULO DE ELEVACIÓN Y EXTRACCIÓN DE COORDENADAS ---
    const getElevationForLeg = (path) => {
        return new Promise((resolve) => {
            if (!elevationServiceRef.current) {
                elevationServiceRef.current = new window.google.maps.ElevationService();
            }

            const maxPuntos = 100;
            const paso = Math.max(1, Math.ceil(path.length / maxPuntos));
            const pathSimplificado = path.filter((_, index) => index % paso === 0);
            
            const sampleSize = Math.max(2, pathSimplificado.length);

            elevationServiceRef.current.getElevationAlongPath({
                path: pathSimplificado,
                samples: sampleSize
            }, (results, status) => {
                if (status === window.google.maps.ElevationStatus.OK && results) {
                    let desnivel = 0;
                    const puntosElevacion = []; 
                    const puntosCoordenadas = []; // <--- NUEVO: Capturamos la geolocalización de cada altura

                    for (let i = 0; i < results.length; i++) {
                        puntosElevacion.push(Math.max(0, results[i].elevation)); 
                        puntosCoordenadas.push(results[i].location); // Guardamos la Lat/Lng
                        
                        if (i > 0) {
                            const diff = results[i].elevation - results[i - 1].elevation;
                            if (diff > 0) desnivel += diff; 
                        }
                    }
                    resolve({ desnivel: Math.round(desnivel), puntosPerfil: puntosElevacion, puntosCoordenadas });
                } else {
                    console.error("❌ Elevation API falló:", status);
                    resolve({ desnivel: 0, puntosPerfil: Array(sampleSize).fill(0), puntosCoordenadas: [] });
                }
            });
        });
    };

    useEffect(() => {
        if (isLoaded && map) {
            if (waypoints.length === 0) {
                setDirectionsResponse(null);
                setDistanciaVisual(0);
                setDesnivelTotalVisual(0);
                setPerfilElevacion([]);
                setPerfilCoords([]);
                if (onRouteCalculatedRef.current) {
                    onRouteCalculatedRef.current({ distanciaTotal: 0, tiempoEstimado: "0h", waypoints: [], tramos: [] });
                }
                return;
            }

            if (!directionsServiceRef.current) {
                directionsServiceRef.current = new window.google.maps.DirectionsService();
            }

            const googleWaypoints = waypoints.map(wp => ({ location: wp, stopover: true }));

            const calcularRutaCompleta = async () => {
                directionsServiceRef.current.route(
                    {
                        origin: center,
                        destination: center,
                        waypoints: googleWaypoints,
                        travelMode: window.google.maps.TravelMode.DRIVING,
                    },
                    async (result, status) => {
                        if (status === window.google.maps.DirectionsStatus.OK) {
                            setDirectionsResponse(result);
                            
                            let totalMeters = 0;
                            let totalSeconds = 0; // Segundos base que calcula Google para un carro liviano
                            let perfilCompleto = []; 
                            let coordsCompletas = []; // Acumulador de geolocalizaciones
                            const route = result.routes[0];

                            const tramosPromises = route.legs.map(async (leg, index) => {
                                totalMeters += leg.distance.value;
                                totalSeconds += leg.duration.value;
                                
                                const legPath = leg.steps.flatMap(step => step.path);
                                const elevacionData = await getElevationForLeg(legPath);

                                perfilCompleto = [...perfilCompleto, ...elevacionData.puntosPerfil];
                                coordsCompletas = [...coordsCompletas, ...elevacionData.puntosCoordenadas];

                                const isFirst = index === 0;
                                const isLast = index === route.legs.length - 1;
                                const origenNombre = isFirst ? "Base DADICA" : leg.start_address.split(',')[0];
                                const destinoNombre = isLast ? "Base DADICA" : leg.end_address.split(',')[0];

                                return {
                                    tramoId: index + 1,
                                    origen: origenNombre,
                                    destino: destinoNombre,
                                    distanciaKm: parseFloat((leg.distance.value / 1000).toFixed(2)),
                                    desnivelMetros: elevacionData.desnivel,
                                    tonelaje: 0 
                                };
                            });

                            const tramosProcesados = await Promise.all(tramosPromises);
                            
                            const kmTotal = (totalMeters / 1000).toFixed(2);
                            const desnivelTotal = tramosProcesados.reduce((acc, tramo) => acc + tramo.desnivelMetros, 0);

                            // === LA FÍSICA DEL TIEMPO (CORRECCIÓN POR CARGA Y MONTAÑA) ===
                            // 1. Un camión pesado es ~40% más lento que un carro normal (Google asume carros).
                            let segundosCorregidos = totalSeconds * 1.4; 
                            
                            // 2. Penalidad de montaña: Sumamos ~3 minutos (180 segundos) por cada 100m subidos.
                            // Esto significa que si sube a Mérida (1800m), le suma casi 1 hora de viaje solo por la subida.
                            const penalidadMontañaSegundos = (desnivelTotal / 100) * 180;
                            segundosCorregidos += penalidadMontañaSegundos;

                            const rawDurationHours = segundosCorregidos / 3600; 
                            const hours = Math.floor(rawDurationHours);
                            const minutes = Math.round((rawDurationHours - hours) * 60);
                            const tiempoFormat = `${hours}h ${minutes}m`;

                            setDistanciaVisual(kmTotal);
                            setTiempoVisual(tiempoFormat);
                            setDesnivelTotalVisual(desnivelTotal);
                            setPerfilElevacion(perfilCompleto); 
                            setPerfilCoords(coordsCompletas); 

                            if (onRouteCalculatedRef.current) {
                                onRouteCalculatedRef.current({
                                    distanciaTotal: kmTotal,
                                    desnivelTotal: desnivelTotal, 
                                    tiempoEstimado: tiempoFormat,
                                    waypoints: waypoints,
                                    direccionDestino: "Circuito DADICA",
                                    tramos: tramosProcesados 
                                });
                            }
                        } else {
                            notifications.show({ title: 'Ruta no encontrada', message: 'No se pudo calcular la ruta.', color: 'red' });
                            setWaypoints(prev => prev.slice(0, -1)); 
                        }
                    }
                );
            };

            calcularRutaCompleta();
        }
    }, [isLoaded, waypoints]); 

    // --- EVENTOS DEL RATÓN PARA LA INTERACTIVIDAD ---
    const handleSvgMouseMove = (e) => {
        if (perfilCoords.length === 0) return;
        const svgRect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - svgRect.left; // Posición X del ratón dentro del gráfico
        const porcentaje = Math.max(0, Math.min(1, mouseX / svgRect.width)); // En qué % del viaje estamos
        
        // Buscamos qué punto del arreglo corresponde a ese porcentaje
        const indice = Math.round(porcentaje * (perfilCoords.length - 1));
        setHoverIndex(indice);
    };

    const handleSvgMouseLeave = () => {
        setHoverIndex(null); // Borramos el punto al salir del gráfico
    };

    if (!isLoaded) return <Center h={450}><Loader size="xl" /></Center>;

    const maxElev = perfilElevacion.length > 0 ? Math.max(...perfilElevacion, 100) : 100; 
    const svgPolygonPoints = perfilElevacion.length > 0 
        ? `0,100 ` + perfilElevacion.map((elev, i) => `${(i / (perfilElevacion.length - 1)) * 100},${100 - ((elev / maxElev) * 100)}`).join(' ') + ` 100,100`
        : '';

    return (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            <Box style={{ position: 'relative' }}>
                {waypoints.length > 0 && (
                    <Box style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
                        <Button color="red" size="xs" onClick={limpiarRuta} leftSection={<IconTrash size={14}/>}>
                            Limpiar ({waypoints.length}) Paradas
                        </Button>
                    </Box>
                )}

                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={center}
                    zoom={10}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    onClick={handleMapClick}
                    options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
                >
                    <Marker position={center} label={{ text: "BASE", color: "white", fontWeight: "bold", fontSize: "10px" }} />
                    
                    {waypoints.map((wp, i) => (
                        !directionsResponse && <Marker key={i} position={wp} label={`${i + 1}`} />
                    ))}

                    {directionsResponse && (
                        <DirectionsRenderer
                            directions={directionsResponse}
                            options={{ suppressMarkers: false, polylineOptions: { strokeColor: "#1971C2", strokeWeight: 5 } }}
                        />
                    )}

                    {/* NUEVO: EL PUNTO INTERACTIVO EN EL MAPA */}
                    {hoverIndex !== null && perfilCoords[hoverIndex] && (
                        <Marker
                            position={perfilCoords[hoverIndex]}
                            icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 7,
                                fillColor: "#4dabf7", // Azul brillante
                                fillOpacity: 1,
                                strokeColor: "#ffffff",
                                strokeWeight: 2,
                            }}
                            zIndex={999}
                        />
                    )}
                </GoogleMap>

                {perfilElevacion.length > 0 && (
                    <Box bg="gray.1" style={{ height: '60px', position: 'relative', borderTop: '2px solid #e9ecef', cursor: 'crosshair' }}>
                        {/* Eventos onMouseMove y onMouseLeave agregados al SVG */}
                        <svg 
                            viewBox="0 0 100 100" 
                            preserveAspectRatio="none" 
                            style={{ width: '100%', height: '100%', display: 'block' }}
                            onMouseMove={handleSvgMouseMove}
                            onMouseLeave={handleSvgMouseLeave}
                        >
                            <defs>
                                <linearGradient id="montanaGradiente" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#845ef7" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#845ef7" stopOpacity="0.05" />
                                </linearGradient>
                            </defs>
                            <polygon points={svgPolygonPoints} fill="url(#montanaGradiente)" stroke="#845ef7" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                            
                            {/* NUEVO: LA LÍNEA VERTICAL GUÍA EN EL GRÁFICO */}
                            {hoverIndex !== null && (
                                <line
                                    x1={`${(hoverIndex / (perfilElevacion.length - 1)) * 100}%`}
                                    y1="0"
                                    x2={`${(hoverIndex / (perfilElevacion.length - 1)) * 100}%`}
                                    y2="100%"
                                    stroke="#4dabf7"
                                    strokeWidth="2"
                                    vectorEffect="non-scaling-stroke"
                                />
                            )}
                        </svg>
                        
                        {/* Tooltip flotante con los metros exactos de altura */}
                        {hoverIndex !== null && (
                            <Box style={{ position: 'absolute', top: -25, left: `${(hoverIndex / (perfilElevacion.length - 1)) * 100}%`, transform: 'translateX(-50%)', background: '#343a40', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', pointerEvents: 'none' }}>
                                {Math.round(perfilElevacion[hoverIndex])}m
                            </Box>
                        )}

                        <Box style={{ position: 'absolute', top: 5, left: 10, pointerEvents: 'none' }}>
                            <Group gap={4}>
                                <IconMountain size={14} color="#845ef7" />
                                <Text size="xs" fw={700} c="violet.9">Perfil de Elevación (Max: {Math.round(maxElev)}m)</Text>
                            </Group>
                        </Box>
                    </Box>
                )}
            </Box>

            {distanciaVisual > 0 && (
                <Box p="xs" bg="white">
                    <Group justify="space-between">
                        <Text size="xs" fw={700}>Circuito Cerrado ({waypoints.length + 1} tramos)</Text>
                        <Group gap="xs">
                            <Badge color="blue" variant="light">{distanciaVisual} Km</Badge>
                            <Badge color="violet" variant="light">⛰️ +{desnivelTotalVisual}m</Badge>
                            <Tooltip label="Incluye 40% demora por peso + 3 mins extra por cada 100m de subida">
                                <Badge color="orange" variant="light" style={{ cursor: 'help' }}>⏳ {tiempoVisual}</Badge>
                            </Tooltip>
                        </Group>
                    </Group>
                </Box>
            )}
        </Paper>
    );
}