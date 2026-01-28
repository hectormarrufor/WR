'use client';
import { GoogleMap, Polyline, Marker } from '@react-google-maps/api';

export default function FleteRealMap({ rutaReal }) {
    // rutaReal es el array [{lat, lng}, {lat, lng}...] que nos dio la API

    return (
        <GoogleMap zoom={10} center={rutaReal[rutaReal.length - 1]}>
            
            {/* RUTA REAL (HISTORIAL) */}
            <Polyline
                path={rutaReal}
                options={{
                    strokeColor: "#2ecc71", // Verde Neón
                    strokeOpacity: 1.0,
                    strokeWeight: 5,
                    geodesic: true,
                }}
            />

            {/* Íconos de Inicio y Fin */}
            {rutaReal.length > 0 && (
                <>
                    <Marker label="A" position={rutaReal[0]} />
                    <Marker 
                        icon={{ url: "/icons/camion_real.png", scaledSize: new window.google.maps.Size(40,40) }}
                        position={rutaReal[rutaReal.length - 1]} 
                    />
                </>
            )}
        </GoogleMap>
    );
}