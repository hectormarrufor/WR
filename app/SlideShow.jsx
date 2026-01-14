'use client';

import React from 'react';
import { Image, Box } from '@mantine/core';
import { Fade } from 'react-slideshow-image';
import 'react-slideshow-image/dist/styles.css';

const slideImages = [
    '/carrusel1.jpg',
    '/carrusel2.jpg',
    '/carrusel3.jpg'
];

const Slideshow = () => {
    return (
        <Box w="100%" h="100%" style={{ overflow: 'hidden' }}>
            <Fade 
                duration={5000} 
                transitionDuration={1000} 
                arrows={false} 
                pauseOnHover={false}
                infinite={true}
            >
                {slideImages.map((image, index) => (
                    // El contenedor de cada slide debe tener la altura del padre
                    <div key={index} style={{ height: '100%', width: '100%' }}>
                        <Image
                            src={image}
                            alt={`Slide ${index + 1}`}
                            radius={0}
                            // Mantine Image props para cubrir todo el fondo
                            h="100%"
                            w="100%"
                            fit="cover"
                            // Estilos CSS directos para asegurar que cubra el contenedor padre (Hero)
                            style={{ 
                                height: '100%', 
                                width: '100%', 
                                objectFit: 'cover',
                                objectPosition: 'center' 
                            }}
                        />
                    </div>
                ))}
            </Fade>
        </Box>
    );
};

export default Slideshow;