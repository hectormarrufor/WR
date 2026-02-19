'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Loader, Center, Box, Button, Text, Group, Badge } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';

const containerStyle = {
    width: '100%',
    height: '450px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
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
    const [waypoints, setWaypoints] = useState([]); // AHORA ES UN ARRAY DE PUNTOS
    const [directionsResponse, setDirectionsResponse] = useState(null);
    
    // Estados visuales locales para mostrar abajo del mapa
    const [distanciaVisual, setDistanciaVisual] = useState(0);
    const [tiempoVisual, setTiempoVisual] = useState("");

    const directionsServiceRef = useRef(null);

    // --- BLINDAJE ANTI-BUCLE ORIGINAL RESTAURADO ---
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
    };

    // --- EFECTO PRINCIPAL (EL QUE GASTA DINERO) ---
    useEffect(() => {
        // CANDADO DE SEGURIDAD
        if (isLoaded && map) {
            
            // Si limpiaron los puntos, reseteamos todo
            if (waypoints.length === 0) {
                setDirectionsResponse(null);
                setDistanciaVisual(0);
                if (onRouteCalculatedRef.current) {
                    onRouteCalculatedRef.current({ distanciaTotal: 0, tiempoEstimado: "0h", waypoints: [], direccionDestino: "" });
                }
                return;
            }

            if (!directionsServiceRef.current) {
                directionsServiceRef.current = new window.google.maps.DirectionsService();
            }

            // Formatear los puntos para Google
            const googleWaypoints = waypoints.map(wp => ({
                location: wp,
                stopover: true
            }));

            directionsServiceRef.current.route(
                {
                    origin: center,       // SALE DE LA BASE
                    destination: center,  // REGRESA A LA BASE (Circuito cerrado)
                    waypoints: googleWaypoints, // PARADAS INTERMEDIAS
                    travelMode: window.google.maps.TravelMode.DRIVING,
                    // optimizeWaypoints: true, // Descomenta esto si quieres que Google reordene los puntos para hacer la ruta más corta
                },
                (result, status) => {
                    if (status === window.google.maps.DirectionsStatus.OK) {
                        setDirectionsResponse(result);
                        
                        // Sumar distancias de todos los tramos (Legs)
                        let totalMeters = 0;
                        let totalSeconds = 0;
                        const route = result.routes[0];

                        route.legs.forEach(leg => {
                            totalMeters += leg.distance.value;
                            totalSeconds += leg.duration.value;
                        });

                        const kmTotal = (totalMeters / 1000).toFixed(2);
                        
                        // Tu factor de carga pesada original (x 1.4)
                        const rawDurationHours = (totalSeconds / 3600) * 1.4; 
                        const hours = Math.floor(rawDurationHours);
                        const minutes = Math.round((rawDurationHours - hours) * 60);
                        const tiempoFormat = `${hours}h ${minutes}m`;

                        setDistanciaVisual(kmTotal);
                        setTiempoVisual(tiempoFormat);

                        // LLAMADA SEGURA AL PADRE
                        if (onRouteCalculatedRef.current) {
                            
                            // Extraer nombres de las direcciones, excluyendo el último tramo que es "retorno a base"
                            const direcciones = route.legs
                                .map(l => l.end_address)
                                .slice(0, -1) // Quitamos el último porque es la Base de nuevo
                                .join(" | ");

                            onRouteCalculatedRef.current({
                                distanciaTotal: kmTotal,
                                tiempoEstimado: tiempoFormat,
                                waypoints: waypoints,
                                direccionDestino: direcciones || "Ruta Local"
                            });
                        }
                    } else {
                        console.error(`Error fetching directions: ${status}`);
                        notifications.show({
                            title: 'Ruta no encontrada',
                            message: 'No se pudo calcular la ruta entre estos puntos.',
                            color: 'red'
                        });
                        // Si un punto cae en el mar, lo sacamos del array para no trancar el mapa
                        setWaypoints(prev => prev.slice(0, -1)); 
                    }
                }
            );
        }
        // Solo dependemos de waypoints y de que cargue, evitando llamados infinitos
    }, [isLoaded, waypoints]); 

    if (!isLoaded) return <Center h={450}><Loader size="xl" /></Center>;

    return (
        <Box h="100%" style={{ position: 'relative' }}>
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
                
                {/* Mostramos marcadores simples mientras carga la ruta, luego el Renderer los dibuja */}
                {waypoints.map((wp, i) => (
                    !directionsResponse && <Marker key={i} position={wp} label={`${i + 1}`} />
                ))}

                {directionsResponse && (
                    <DirectionsRenderer
                        directions={directionsResponse}
                        options={{ 
                            suppressMarkers: false, 
                            polylineOptions: { strokeColor: "#1971C2", strokeWeight: 5 } 
                        }}
                    />
                )}
            </GoogleMap>

            {/* Cuadro de resumen visual dentro del mapa */}
            {distanciaVisual > 0 && (
                <Box p="xs" bg="white" style={{ position: 'absolute', bottom: 10, left: 10, right: 10, borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                    <Group justify="space-between">
                        <Text size="xs" fw={700}>Circuito Cerrado ({waypoints.length} paradas)</Text>
                        <Group gap="xs">
                            <Badge color="blue" variant="light">{distanciaVisual} Km</Badge>
                            <Badge color="orange" variant="light">{tiempoVisual}</Badge>
                        </Group>
                    </Group>
                </Box>
            )}
        </Box>
    );
}