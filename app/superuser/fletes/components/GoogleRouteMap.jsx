'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Loader, Center } from '@mantine/core';
import { notifications } from '@mantine/notifications';

const containerStyle = {
    width: '100%',
    height: '450px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};

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
    const [destination, setDestination] = useState(null);
    const [directionsResponse, setDirectionsResponse] = useState(null);
    const [routeIndex, setRouteIndex] = useState(0);
    
    const directionsServiceRef = useRef(null);

    // --- BLINDAJE ANTI-BUCLE ---
    // 1. Guardamos la función del padre en una referencia.
    // Esto permite llamarla sin que el useEffect principal dependa de ella.
    const onRouteCalculatedRef = useRef(onRouteCalculated);

    // 2. Actualizamos la referencia si el padre cambia la función
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
        
        // Pequeña validación para no setear el mismo destino dos veces
        setDestination(prev => {
            if (prev && prev.lat === lat && prev.lng === lng) return prev;
            return { lat, lng };
        });
    };

    // --- EFECTO PRINCIPAL (EL QUE GASTA DINERO) ---
    useEffect(() => {
        // CANDADO DE SEGURIDAD:
        // Solo entramos si hay mapa, está cargado y hay destino.
        if (isLoaded && destination && map) {
            
            if (!directionsServiceRef.current) {
                directionsServiceRef.current = new window.google.maps.DirectionsService();
            }

            directionsServiceRef.current.route(
                {
                    origin: center,
                    destination: destination,
                    travelMode: window.google.maps.TravelMode.DRIVING,
                    provideRouteAlternatives: true,
                },
                (result, status) => {
                    if (status === window.google.maps.DirectionsStatus.OK) {
                        setDirectionsResponse(result);
                        setRouteIndex(0);
                        
                        const selectedRoute = result.routes[0];
                        const leg = selectedRoute.legs[0];
                        const kmIda = (leg.distance.value / 1000).toFixed(2);
                        const kmTotal = (parseFloat(kmIda) * 2).toFixed(2);

                        // LLAMADA SEGURA AL PADRE USANDO LA REFERENCIA
                        if (onRouteCalculatedRef.current) {
                            const rawDurationHours = (leg.duration.value / 3600) * 1.4 * 2; // Factor carga pesada
                            const hours = Math.floor(rawDurationHours);
                            const minutes = Math.round((rawDurationHours - hours) * 60);

                            onRouteCalculatedRef.current({
                                distanciaIda: kmIda,
                                distanciaTotal: kmTotal,
                                tiempoEstimado: `${hours}h ${minutes}m`, // Formato legible
                                coordenadas: destination,
                                direccionDestino: leg.end_address
                            });
                        }
                    } else {
                        console.error(`Error fetching directions ${result}`);
                        notifications.show({
                            title: 'Ruta no encontrada',
                            message: 'No se pudo calcular la ruta.',
                            color: 'red'
                        });
                    }
                }
            );
        }
        // OJO AQUÍ: Quitamos 'onRouteCalculated' y 'map' de las dependencias.
        // Solo re-calculamos si cambia 'isLoaded' o 'destination'.
        // Esto previene que el scroll (que afecta propiedades internas del mapa) dispare esto.
    }, [isLoaded, destination]); 

    if (!isLoaded) return <Center h={450}><Loader size="xl" /></Center>;

    return (
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
            {destination && !directionsResponse && <Marker position={destination} />}
            {directionsResponse && (
                <DirectionsRenderer
                    directions={directionsResponse}
                    routeIndex={routeIndex}
                    options={{ suppressMarkers: false, polylineOptions: { strokeColor: "#1971C2", strokeWeight: 6 } }}
                    onRouteIndexChanged={(index) => {
                        setRouteIndex(index);
                        const newRoute = directionsResponse.routes[index];
                        const leg = newRoute.legs[0];
                        const kmIda = (leg.distance.value / 1000).toFixed(2);
                        const kmTotal = (parseFloat(kmIda) * 2).toFixed(2);
                        
                        if (onRouteCalculatedRef.current) {
                            onRouteCalculatedRef.current({
                                distanciaIda: kmIda,
                                distanciaTotal: kmTotal,
                                tiempoEstimado: (leg.duration.value / 60 ).toFixed(0), // Factor Camion carga pesada
                                coordenadas: destination,
                                direccionDestino: leg.end_address
                            });
                        }
                    }}
                />
            )}
        </GoogleMap>
    );
}