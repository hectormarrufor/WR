import { Image, Title } from '@mantine/core';
import React from 'react';
import { Fade } from 'react-slideshow-image';
import 'react-slideshow-image/dist/styles.css';

const slideImages = [
    '/carrusel1.jpg',
    '/carrusel2.jpg',
    '/carrusel3.jpg'
];

const Slideshow = () => {
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="slide-container" style={{

            //   overflow: 'hidden',
            // clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            clipPath: 'polygon(0% 70%, 50% 94%, 100% 70%, 100% 0%, 0% 0%)',
            zIndex: 99,
            position: 'relative',
        }}>
            <div
                style={{
                    position: 'absolute',
                    top: isMobile ? 15 : 40,
                    left: isMobile ? 12 : 40,
                    zIndex: 200,
                    color: '#fff',
                    padding: isMobile ? '8px 10px' : '14px 20px',
                    borderRadius: 8,
                    maxWidth: isMobile ? '50%' : '30%',
                    fontWeight: 700,
                    fontSize: isMobile ? 16 : 28,
                    lineHeight: 1.05,
                }}
                aria-hidden={false}
            >
                <Title order={isMobile ? 4 : 1} align="left" style={{ color: '#fff', fontStyle: 'italic', lineHeight: 1.1, textShadow: '2px 2px 5px rgba(0, 0, 0, 1)' }}>
                    Movemos tu industria con fuerza y precisión.
                </Title>
            </div>

            {/* Overlay: sombra en gradiente desde la esquina superior izquierda */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    top: -20,
                    left: -20,
                    width: '60%',
                    height: '80%',
                    zIndex: 150, // debajo del título (200) pero encima de las imágenes
                    pointerEvents: 'none',
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.63) 30%, rgba(0, 0, 0, 0.18) 70%)',
                    filter: 'blur(20px)',
                    transform: 'translateZ(0)',
                }}
            />

            <Fade duration={6000} transitionDuration={1000} arrows={false}>
                {slideImages.map((image, index) => (
                    <Image
                        key={image + index}
                        src={image}
                        alt={`Slide ${index + 1}`}
                        radius={0}
                        fit="cover"
                        height={isMobile ? 200 : 450}
                        width="100%"
                        style={{ aspectRatio: '2 / 1', objectFit: 'cover', objectPosition: 'center 70%', }}
                        mb={isMobile ? 0 : 20}
                        p={0}
                    />

                ))}
            </Fade>
        </div>
    );
};

export default Slideshow;