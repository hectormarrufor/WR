'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer, InfoWindow } from '@react-google-maps/api';
import { Loader, Center, Box, Button, Text, Group, Badge, Paper, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconMountain, IconClock, IconAlertTriangle, IconReceipt2 } from '@tabler/icons-react';
import dayjs from 'dayjs';

const containerStyle = {
    width: '100%',
    height: '100%', 
    minHeight: '400px',
    borderRadius: '12px 12px 0 0', 
};

const center = { lat: 10.257083, lng: -71.343111 };
const LIBRARIES = ['geometry'];

export default function GoogleRouteMap({ 
    onRouteCalculated, 
    vehiculoAsignado, 
    tramosFormulario = [], 
    taraBase = 13, 
    capacidadMax = 30, 
    initialWaypoints = [],
    peajes = [],
    currentPosition, 
    onMapClick,      
    puntosDeControl  
}) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
        libraries: LIBRARIES
    });

    const [map, setMap] = useState(null);
    const [waypoints, setWaypoints] = useState([]); 
    const [directionsResponse, setDirectionsResponse] = useState(null);
    
    const [mapHoverInfo, setMapHoverInfo] = useState(null);

    const [distanciaVisual, setDistanciaVisual] = useState(0);
    const [tiempoVisual, setTiempoVisual] = useState("");
    const [desnivelTotalVisual, setDesnivelTotalVisual] = useState(0);
    
    const [penalidadVisual, setPenalidadVisual] = useState(null);
    const [peajesCruzados, setPeajesCruzados] = useState([]);
    
    const [perfilElevacion, setPerfilElevacion] = useState([]); 
    const [perfilCoords, setPerfilCoords] = useState([]); 
    const [hoverIndex, setHoverIndex] = useState(null); 

    const directionsServiceRef = useRef(null);
    const elevationServiceRef = useRef(null); 
    const onRouteCalculatedRef = useRef(onRouteCalculated);

    const tramosGuardadosRef = useRef(tramosFormulario);
    const prevWaypointsStr = useRef("[]");

    useEffect(() => {
        onRouteCalculatedRef.current = onRouteCalculated;
    }, [onRouteCalculated]);

    useEffect(() => {
        tramosGuardadosRef.current = tramosFormulario;
    }, [tramosFormulario]);

    useEffect(() => {
        if (initialWaypoints && initialWaypoints.length > 0 && waypoints.length === 0) {
            setWaypoints(initialWaypoints);
        }
    }, [initialWaypoints]);

    const onLoad = useCallback(function callback(map) { setMap(map); }, []);
    const onUnmount = useCallback(function callback(map) { setMap(null); }, []);

    const handleMapClickInner = (e) => {
        if (onMapClick) {
            onMapClick(e);
        } else {
            setWaypoints(prev => [...prev, { lat: e.latLng.lat(), lng: e.latLng.lng() }]);
        }
    };

    // 🔥 DETECCIÓN DUAL DE IDA Y RETORNO MEJORADA 🔥
    const handleMapMouseMove = (e) => {
        if (!puntosDeControl || puntosDeControl.length === 0) return;

        const mouseLat = e.latLng.lat();
        const mouseLng = e.latLng.lng();

        const destIdx = puntosDeControl.findIndex(p => p.tipo === 'destino');
        const reversedPuntos = [...puntosDeControl].reverse();
        const lastDestIdxRev = reversedPuntos.findIndex(p => p.tipo === 'destino');
        const lastDestIdx = lastDestIdxRev !== -1 ? puntosDeControl.length - 1 - lastDestIdxRev : -1;

        const idaNodes = destIdx > 0 ? puntosDeControl.slice(0, destIdx + 1) : puntosDeControl;
        const vueltaNodes = lastDestIdx > 0 ? puntosDeControl.slice(lastDestIdx) : [];

        const calcTime = (nodes) => {
            let bestTime = null;
            let minDist = Infinity;
            for (let i = 0; i < nodes.length - 1; i++) {
                const A = nodes[i];
                const B = nodes[i+1];
                if (A.lat === B.lat && A.lng === B.lng) continue; 

                const dAB = Math.hypot(B.lat - A.lat, B.lng - A.lng);
                let t = 0;
                if (dAB > 0) {
                    const dot = ((mouseLat - A.lat) * (B.lat - A.lat) + (mouseLng - A.lng) * (B.lng - A.lng)) / (dAB * dAB);
                    t = Math.max(0, Math.min(1, dot));
                }
                const projLat = A.lat + t * (B.lat - A.lat);
                const projLng = A.lng + t * (B.lng - A.lng);
                const dist = Math.hypot(mouseLat - projLat, mouseLng - projLng);

                if (dist < minDist) {
                    minDist = dist;
                    bestTime = A.timestamp + t * (B.timestamp - A.timestamp);
                }
            }
            return { time: bestTime, dist: minDist };
        };

        const resIda = calcTime(idaNodes);
        const resVuelta = calcTime(vueltaNodes);
        
        // Threshold ajustado para mayor comodidad al pasar el ratón
        const threshold = 0.08; 

        if (resIda.dist < threshold || (resVuelta && resVuelta.dist < threshold)) {
            setMapHoverInfo({
                lat: mouseLat,
                lng: mouseLng,
                timeIda: resIda.dist < threshold ? resIda.time : null,
                timeVuelta: resVuelta && resVuelta.dist < threshold ? resVuelta.time : null
            });
        } else {
            setMapHoverInfo(null);
        }
    };

    const limpiarRuta = () => {
        setWaypoints([]);
        setPerfilElevacion([]); 
        setPerfilCoords([]);
        setHoverIndex(null);
        setPenalidadVisual(null);
        setPeajesCruzados([]); 
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
        if (!isLoaded || !map) return;

        const currentWpStr = JSON.stringify(waypoints);

        if (waypoints.length === 0) {
            setDirectionsResponse(null);
            setDistanciaVisual(0);
            setDesnivelTotalVisual(0);
            setTiempoVisual("");
            setPerfilElevacion([]);
            setPerfilCoords([]);
            setPenalidadVisual(null);
            setPeajesCruzados([]);
            prevWaypointsStr.current = currentWpStr;
            
            if (onRouteCalculatedRef.current) {
                onRouteCalculatedRef.current({ distanciaTotal: 0, waypoints: [], tramos: [], peajesEnRuta: [] });
            }
            return;
        }

        if (prevWaypointsStr.current === currentWpStr) {
            return; 
        }
        
        prevWaypointsStr.current = currentWpStr;

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

                        let peajesDetectados = [];
                        if (window.google.maps.geometry && peajes.length > 0) {
                            const polylineRuta = new window.google.maps.Polyline({ path: route.overview_path });
                            
                            peajes.forEach(peaje => {
                                if (peaje.latitud && peaje.longitud) {
                                    const loc = new window.google.maps.LatLng(parseFloat(peaje.latitud), parseFloat(peaje.longitud));
                                    if (window.google.maps.geometry.poly.isLocationOnEdge(loc, polylineRuta, 0.005)) {
                                        peajesDetectados.push(peaje);
                                    }
                                }
                            });
                        }
                        setPeajesCruzados(peajesDetectados);

                        const tramosPromises = route.legs.map(async (leg, index) => {
                            totalMeters += leg.distance.value;
                            const legPath = leg.steps.flatMap(step => step.path);
                            
                            const elevacionData = await getElevationForLeg(legPath);
                            
                            const isFirst = index === 0;
                            const isLast = index === route.legs.length - 1;
                            const origenNombre = isFirst ? "Base DADICA" : leg.start_address.split(',')[0];
                            const destinoNombre = isLast ? "Base DADICA" : leg.end_address.split(',')[0];

                            const tonelajeGuardado = tramosGuardadosRef.current[index]?.tonelaje || 0;
                            const tiempoEsperaGuardado = tramosGuardadosRef.current[index]?.tiempoEspera || 0;

                            return {
                                tramoId: index + 1,
                                origen: origenNombre,
                                destino: destinoNombre,
                                distanciaKm: parseFloat((leg.distance.value / 1000).toFixed(2)),
                                desnivelMetros: elevacionData.desnivel,
                                tiempoBaseSegundos: leg.duration.value, 
                                tonelaje: tonelajeGuardado, 
                                tiempoEspera: tiempoEsperaGuardado, 
                                puntosPerfil: elevacionData.puntosPerfil,
                                puntosCoordenadas: elevacionData.puntosCoordenadas
                            };
                        });

                        const tramosProcesados = await Promise.all(tramosPromises);
                        
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
                        
                        setPerfilElevacion(perfilCompletoOrdenado); 
                        setPerfilCoords(coordsCompletasOrdenadas); 

                        if (onRouteCalculatedRef.current) {
                            onRouteCalculatedRef.current({
                                distanciaTotal: kmTotal,
                                desnivelTotal: desnivelTotal, 
                                waypoints: waypoints,
                                direccionDestino: "Circuito DADICA",
                                tramos: tramosProcesados,
                                peajesEnRuta: peajesDetectados
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
    }, [isLoaded, waypoints]); 

    useEffect(() => {
        if (!directionsResponse || tramosFormulario.length === 0) return;

        let tiempoFinalTotal = 0;
        let demoraVerticalTotalSegundos = 0;
        let demoraPorRegulacionYPeso = 0;

        const pesoBrutoMaximo = taraBase + capacidadMax;

        tramosFormulario.forEach(tramo => {
            const tiempoBaseRealista = (tramo.tiempoBaseSegundos * 1.4); 
            let segundosTramo = tiempoBaseRealista;

            if (vehiculoAsignado) {
                const pesoBrutoTramo = taraBase + tramo.tonelaje;
                const factorCarga = Math.min(pesoBrutoTramo / pesoBrutoMaximo, 1); 

                const demoraHorizontal = 0.10 + (0.30 * factorCarga); 
                const extraPorPeso = tiempoBaseRealista * demoraHorizontal;
                demoraPorRegulacionYPeso += extraPorPeso;
                segundosTramo += extraPorPeso;

                if (tramo.desnivelMetros > 0) {
                    const segundosExtraPor100m = 90 + (120 * factorCarga); 
                    const penalidadMontaña = (tramo.desnivelMetros / 100) * segundosExtraPor100m;
                    demoraVerticalTotalSegundos += penalidadMontaña;
                    segundosTramo += penalidadMontaña;
                }
            }
            
            const esperaSegundos = (parseFloat(tramo.tiempoEspera || 0)) * 3600;
            segundosTramo += esperaSegundos;

            tiempoFinalTotal += segundosTramo;
        });

        const rawHours = tiempoFinalTotal / 3600;
        const hours = Math.floor(rawHours);
        const mins = Math.round((rawHours - hours) * 60);
        setTiempoVisual(`${hours}h ${mins}m`);

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
        <Paper withBorder radius="md" style={{ overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box style={{ position: 'relative', flexGrow: 1 }}>
                {waypoints.length > 0 && !onMapClick && (
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
                    onClick={handleMapClickInner} 
                    onMouseMove={handleMapMouseMove} 
                    onMouseOut={() => setMapHoverInfo(null)} 
                    options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
                >
                    <Marker position={center} label={{ text: "BASE", color: "white", fontWeight: "bold", fontSize: "10px" }} />
                    
                    {!onMapClick && waypoints.map((wp, i) => (!directionsResponse && <Marker key={i} position={wp} label={`${i + 1}`} />))}
                    
                    {currentPosition && (
                        <Marker 
                            position={{ lat: currentPosition.lat, lng: currentPosition.lng }}
                            zIndex={9999}
                            icon={{
                                path: "M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
                                fillColor: "#e03131", 
                                fillOpacity: 1,
                                strokeColor: "#ffffff",
                                strokeWeight: 2,
                                scale: 1.5,
                                anchor: new window.google.maps.Point(12, 12)
                            }}
                        />
                    )}

                    {mapHoverInfo && (
                        <InfoWindow position={{ lat: mapHoverInfo.lat, lng: mapHoverInfo.lng }} options={{ disableAutoPan: true }}>
                            <Box p={4} ta="center" miw={180}>
                                <Text size="xs" fw={900} c="dark.8" mb={6} display="flex" style={{ justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                                    <IconClock size={14} /> Tiempo Estimado
                                </Text>
                                {mapHoverInfo.timeIda && (
                                    <Badge color="blue" variant="light" size="md" w="100%" mb={mapHoverInfo.timeVuelta ? 4 : 0} radius="sm">
                                        IDA: {dayjs(mapHoverInfo.timeIda).format('DD/MM HH:mm')}
                                    </Badge>
                                )}
                                {mapHoverInfo.timeVuelta && (
                                    <Badge color="teal" variant="light" size="md" w="100%" radius="sm">
                                        RETORNO: {dayjs(mapHoverInfo.timeVuelta).format('DD/MM HH:mm')}
                                    </Badge>
                                )}
                                {(!mapHoverInfo.timeIda && !mapHoverInfo.timeVuelta) && (
                                    <Text size="xs" c="dimmed">Buscando coincidencia...</Text>
                                )}
                            </Box>
                        </InfoWindow>
                    )}

                    {initialWaypoints.length > 0 && initialWaypoints.some(wp => wp.isDestino) && (
                        <Marker 
                            position={{ lat: initialWaypoints.find(wp => wp.isDestino).lat, lng: initialWaypoints.find(wp => wp.isDestino).lng }}
                            icon={{ url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" }}
                        />
                    )}
                    
                    {peajes.map(p => {
                        if(p.latitud && p.longitud) {
                            const nombreLimpio = p.nombre ? p.nombre.replace(/peaje\s*/i, '').trim() : 'Punto de Control';
                            return (
                                <Marker 
                                    key={`peaje-${p.id}`} 
                                    position={{ lat: parseFloat(p.latitud), lng: parseFloat(p.longitud) }} 
                                    icon={{ url: "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png" }}
                                    title={nombreLimpio}
                                />
                            )
                        }
                        return null;
                    })}

                    {directionsResponse && <DirectionsRenderer directions={directionsResponse} options={{ suppressMarkers: false, polylineOptions: { strokeColor: "#1971C2", strokeWeight: 5 } }} />}
                    
                    {hoverIndex !== null && perfilCoords[hoverIndex] && (
                        <Marker position={perfilCoords[hoverIndex]} icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#4dabf7", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 }} zIndex={999} />
                    )}
                </GoogleMap>
            </Box>

            {perfilElevacion.length > 0 && (
                <Box bg="gray.1" style={{ height: '60px', position: 'relative', borderTop: '2px solid #e9ecef', cursor: 'crosshair', flexShrink: 0 }}>
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

            {distanciaVisual > 0 && !onMapClick && (
                <Box p="xs" bg="white" style={{ flexShrink: 0 }}>
                    <Group justify="space-between" mb={penalidadVisual ? 'xs' : 0}>
                        <Text size="xs" fw={700}>Circuito Cerrado ({waypoints.length + 1} tramos)</Text>
                        <Group gap="xs">
                            <Badge color="blue" variant="light">{distanciaVisual} Km</Badge>
                            <Badge color="violet" variant="light">⛰️ +{desnivelTotalVisual}m</Badge>
                            <Badge color="yellow" variant="filled">
                                <Group gap={3}><IconReceipt2 size={12}/> {peajesCruzados.length} Peajes</Group>
                            </Badge>
                            <Badge color="orange" variant="light">
                                <Group gap={3}><IconClock size={12}/> {tiempoVisual}</Group>
                            </Badge>
                        </Group>
                    </Group>
                    
                    {penalidadVisual && (
                        <Alert variant="light" color="red" p="xs" mt="xs" icon={<IconAlertTriangle size={16} />}>
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