import { Image } from '@mantine/core';
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
            <Fade duration={6000} transitionDuration={1000} arrows={false}>
                {slideImages.map((image, index) => (
                    <Image
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