'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Loader, Center, Box, Button, Text, Group, Badge, Paper, Tooltip, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconMountain, IconClock, IconAlertTriangle } from '@tabler/icons-react';

const containerStyle = {
    width: '100%',
    height: '400px', 
    borderRadius: '12px 12px 0 0', 
};

const center = { lat: 10.257083, lng: -71.343111 };
const LIBRARIES = [];

export default function GoogleRouteMap({ onRouteCalculated, vehiculoAsignado, tramosFormulario = [], taraBase = 13, capacidadMax = 30 }) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
        libraries: LIBRARIES
    });

    const [map, setMap] = useState(null);
    const [waypoints, setWaypoints] = useState([]); 
    const [directionsResponse, setDirectionsResponse] = useState(null);
    
    const [distanciaVisual, setDistanciaVisual] = useState(0);
    const [tiempoVisual, setTiempoVisual] = useState("");
    const [desnivelTotalVisual, setDesnivelTotalVisual] = useState(0);
    
    // --- ESTADO PARA EL BANNER DE PENALIDAD ---
    const [penalidadVisual, setPenalidadVisual] = useState(null);
    
    const [perfilElevacion, setPerfilElevacion] = useState([]); 
    const [perfilCoords, setPerfilCoords] = useState([]); 
    const [hoverIndex, setHoverIndex] = useState(null); 

    const directionsServiceRef = useRef(null);
    const elevationServiceRef = useRef(null); 
    const onRouteCalculatedRef = useRef(onRouteCalculated);

    useEffect(() => {
        onRouteCalculatedRef.current = onRouteCalculated;
    }, [onRouteCalculated]);

    const onLoad = useCallback(function callback(map) { setMap(map); }, []);
    const onUnmount = useCallback(function callback(map) { setMap(null); }, []);

    const handleMapClick = (e) => {
        setWaypoints(prev => [...prev, { lat: e.latLng.lat(), lng: e.latLng.lng() }]);
    };

    const limpiarRuta = () => {
        setWaypoints([]);
        setPerfilElevacion([]); 
        setPerfilCoords([]);
        setHoverIndex(null);
        setPenalidadVisual(null);
    };

    const getElevationForLeg = (path) => {
        return new Promise((resolve) => {
            if (!elevationServiceRef.current) elevationServiceRef.current = new window.google.maps.ElevationService();
            const maxPuntos = 100;
            const paso = Math.max(1, Math.ceil(path.length / maxPuntos));
            const pathSimplificado = path.filter((_, index) => index % paso === 0);
            const sampleSize = Math.max(2, pathSimplificado.length);

            elevationServiceRef.current.getElevationAlongPath({ path: pathSimplificado, samples: sampleSize }, (results, status) => {
                if (status === window.google.maps.ElevationStatus.OK && results) {
                    let desnivel = 0;
                    const puntosElevacion = []; 
                    const puntosCoordenadas = []; 
                    for (let i = 0; i < results.length; i++) {
                        puntosElevacion.push(Math.max(0, results[i].elevation)); 
                        puntosCoordenadas.push(results[i].location); 
                        if (i > 0) {
                            const diff = results[i].elevation - results[i - 1].elevation;
                            if (diff > 0) desnivel += diff; 
                        }
                    }
                    resolve({ desnivel: Math.round(desnivel), puntosPerfil: puntosElevacion, puntosCoordenadas });
                } else {
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
                setTiempoVisual("");
                setPerfilElevacion([]);
                setPerfilCoords([]);
                setPenalidadVisual(null);
                if (onRouteCalculatedRef.current) onRouteCalculatedRef.current({ distanciaTotal: 0, waypoints: [], tramos: [] });
                return;
            }

            if (!directionsServiceRef.current) directionsServiceRef.current = new window.google.maps.DirectionsService();
            const googleWaypoints = waypoints.map(wp => ({ location: wp, stopover: true }));

            const calcularRutaCompleta = async () => {
                directionsServiceRef.current.route(
                    { origin: center, destination: center, waypoints: googleWaypoints, travelMode: window.google.maps.TravelMode.DRIVING },
                    async (result, status) => {
                        if (status === window.google.maps.DirectionsStatus.OK) {
                            setDirectionsResponse(result);
                            let totalMeters = 0;
                            const route = result.routes[0];

                            const tramosPromises = route.legs.map(async (leg, index) => {
                                totalMeters += leg.distance.value;
                                const legPath = leg.steps.flatMap(step => step.path);
                                
                                // Pedimos la elevación
                                const elevacionData = await getElevationForLeg(legPath);
                                
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
                                    tiempoBaseSegundos: leg.duration.value, 
                                    tonelaje: 0,
                                    // LA CLAVE: Guardamos el pedazo de montaña dentro de su propio tramo temporalmente
                                    puntosPerfil: elevacionData.puntosPerfil,
                                    puntosCoordenadas: elevacionData.puntosCoordenadas
                                };
                            });

                            // Esperamos a que TODOS los tramos terminen de calcularse
                            const tramosProcesados = await Promise.all(tramosPromises);
                            
                            // AHORA SÍ: Los unimos en orden estricto (1, 2, 3...)
                            let perfilCompletoOrdenado = []; 
                            let coordsCompletasOrdenadas = [];
                            let desnivelTotal = 0;

                            tramosProcesados.forEach(tramo => {
                                perfilCompletoOrdenado = [...perfilCompletoOrdenado, ...tramo.puntosPerfil];
                                coordsCompletasOrdenadas = [...coordsCompletasOrdenadas, ...tramo.puntosCoordenadas];
                                desnivelTotal += tramo.desnivelMetros;
                            });

                            const kmTotal = (totalMeters / 1000).toFixed(2);

                            setDistanciaVisual(kmTotal);
                            setDesnivelTotalVisual(desnivelTotal);
                            
                            // Pasamos el arreglo ya ordenado lógicamente
                            setPerfilElevacion(perfilCompletoOrdenado); 
                            setPerfilCoords(coordsCompletasOrdenadas); 

                            if (onRouteCalculatedRef.current) {
                                onRouteCalculatedRef.current({
                                    distanciaTotal: kmTotal,
                                    desnivelTotal: desnivelTotal, 
                                    waypoints: waypoints,
                                    direccionDestino: "Circuito DADICA",
                                    tramos: tramosProcesados 
                                });
                            }
                        } else {
                            notifications.show({ title: 'Error', message: 'No se pudo calcular la ruta.', color: 'red' });
                            setWaypoints(prev => prev.slice(0, -1)); 
                        }
                    }
                );
            };
            calcularRutaCompleta();
        }
    }, [isLoaded, waypoints]); 

// --- NUEVO CÁLCULO DE TIEMPO DINÁMICO (CORRECCIÓN Y ESPERA) ---
    useEffect(() => {
        if (!directionsResponse || tramosFormulario.length === 0) return;

        let tiempoFinalTotal = 0;
        let tiempoBaseGoogleTotal = 0;
        let demoraVerticalTotalSegundos = 0;
        let demoraPorRegulacionYPeso = 0;

        const pesoBrutoMaximo = taraBase + capacidadMax;

        tramosFormulario.forEach(tramo => {
            // 1. CORRECCIÓN GOOGLE: Google asume vehículos ligeros. Multiplicamos su tiempo base por 1.4 para simular un camión.
            const tiempoBaseRealista = (tramo.tiempoBaseSegundos * 1.4); 
            tiempoBaseGoogleTotal += tiempoBaseRealista;

            let segundosTramo = tiempoBaseRealista;

            if (vehiculoAsignado) {
                const pesoBrutoTramo = taraBase + tramo.tonelaje;
                const factorCarga = Math.min(pesoBrutoTramo / pesoBrutoMaximo, 1); 

                // Física Horizontal (Peso)
                const demoraHorizontal = 0.10 + (0.30 * factorCarga); 
                const extraPorPeso = tiempoBaseRealista * demoraHorizontal;
                demoraPorRegulacionYPeso += extraPorPeso;
                segundosTramo += extraPorPeso;

                // Física Montaña
                if (tramo.desnivelMetros > 0) {
                    const segundosExtraPor100m = 90 + (120 * factorCarga); 
                    const penalidadMontaña = (tramo.desnivelMetros / 100) * segundosExtraPor100m;
                    demoraVerticalTotalSegundos += penalidadMontaña;
                    segundosTramo += penalidadMontaña;
                }
            }
            
            // 2. AGREGAMOS EL TIEMPO DE ESPERA DEL USUARIO EN ESE TRAMO
            const esperaSegundos = (parseFloat(tramo.tiempoEspera || 0)) * 3600;
            segundosTramo += esperaSegundos;

            tiempoFinalTotal += segundosTramo;
        });

        // Formatear Tiempo Total
        const rawHours = tiempoFinalTotal / 3600;
        const hours = Math.floor(rawHours);
        const mins = Math.round((rawHours - hours) * 60);
        setTiempoVisual(`${hours}h ${mins}m`);

        // Preparar el Banner Visual
        if (vehiculoAsignado && (demoraPorRegulacionYPeso > 0 || demoraVerticalTotalSegundos > 0)) {
            const totalExtra = demoraPorRegulacionYPeso + demoraVerticalTotalSegundos;
            const extH = Math.floor(totalExtra / 3600);
            const extM = Math.round((totalExtra % 3600) / 60);
            const extraFormat = extH > 0 ? `${extH}h ${extM}m` : `${extM} mins`;
            
            const txtMontaña = demoraVerticalTotalSegundos > 0 ? " y elevación de montaña" : "";

            setPenalidadVisual({
                tiempoExtra: extraFormat,
                txtMontaña: txtMontaña,
            });
        } else {
            setPenalidadVisual(null);
        }
    }, [directionsResponse, tramosFormulario, taraBase, capacidadMax, vehiculoAsignado]);


    const handleSvgMouseMove = (e) => {
        if (perfilCoords.length === 0) return;
        const svgRect = e.currentTarget.getBoundingClientRect();
        const porcentaje = Math.max(0, Math.min(1, (e.clientX - svgRect.left) / svgRect.width)); 
        setHoverIndex(Math.round(porcentaje * (perfilCoords.length - 1)));
    };

    if (!isLoaded) return <Center h={450}><Loader size="xl" /></Center>;

    const maxElev = perfilElevacion.length > 0 ? Math.max(...perfilElevacion, 100) : 100; 
    const svgPolygonPoints = perfilElevacion.length > 0 ? `0,100 ` + perfilElevacion.map((elev, i) => `${(i / (perfilElevacion.length - 1)) * 100},${100 - ((elev / maxElev) * 100)}`).join(' ') + ` 100,100` : '';

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

                <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={10} onLoad={onLoad} onUnmount={onUnmount} onClick={handleMapClick} options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}>
                    <Marker position={center} label={{ text: "BASE", color: "white", fontWeight: "bold", fontSize: "10px" }} />
                    {waypoints.map((wp, i) => (!directionsResponse && <Marker key={i} position={wp} label={`${i + 1}`} />))}
                    {directionsResponse && <DirectionsRenderer directions={directionsResponse} options={{ suppressMarkers: false, polylineOptions: { strokeColor: "#1971C2", strokeWeight: 5 } }} />}
                    {hoverIndex !== null && perfilCoords[hoverIndex] && (
                        <Marker position={perfilCoords[hoverIndex]} icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#4dabf7", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 }} zIndex={999} />
                    )}
                </GoogleMap>

                {perfilElevacion.length > 0 && (
                    <Box bg="gray.1" style={{ height: '60px', position: 'relative', borderTop: '2px solid #e9ecef', cursor: 'crosshair' }}>
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} onMouseMove={handleSvgMouseMove} onMouseLeave={() => setHoverIndex(null)}>
                            <defs>
                                <linearGradient id="montanaGradiente" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#845ef7" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#845ef7" stopOpacity="0.05" />
                                </linearGradient>
                            </defs>
                            <polygon points={svgPolygonPoints} fill="url(#montanaGradiente)" stroke="#845ef7" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                            {hoverIndex !== null && <line x1={`${(hoverIndex / (perfilElevacion.length - 1)) * 100}%`} y1="0" x2={`${(hoverIndex / (perfilElevacion.length - 1)) * 100}%`} y2="100%" stroke="#4dabf7" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
                        </svg>
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
                    <Group justify="space-between" mb={penalidadVisual ? 'xs' : 0}>
                        <Text size="xs" fw={700}>Circuito Cerrado ({waypoints.length + 1} tramos)</Text>
                        <Group gap="xs">
                            <Badge color="blue" variant="light">{distanciaVisual} Km</Badge>
                            <Badge color="violet" variant="light">⛰️ +{desnivelTotalVisual}m</Badge>
                            <Badge color="orange" variant="light">
                                <Group gap={3}><IconClock size={12}/> {tiempoVisual}</Group>
                            </Badge>
                        </Group>
                    </Group>
                    
                    {/* EL BANNER DE TRANSPARENCIA FÍSICA */}
                    {penalidadVisual && (
                        <Alert variant="light" color="red" p="xs" icon={<IconAlertTriangle size={16} />}>
                            <Text size="xs" fw={500}>
                                Dinámica de vehículo pesado activa. Se han añadido <b>+{penalidadVisual.tiempoExtra}</b> al tiempo ideal por inercia de la carga{penalidadVisual.txtMontaña}.
                            </Text>
                        </Alert>
                    )}
                </Box>
            )}
        </Paper>
    );
}