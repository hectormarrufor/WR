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
        <div className="slide-container">
            <Fade duration={3000} transitionDuration={1000} arrows={false}>
                {slideImages.map((image, index) => (
                    <Image
                        src={image}
                        alt={`Slide ${index + 1}`}
                        radius={isMobile ? 0 : "md" }
                        fit="cover"
                        height={ isMobile ? 200 : 450}
                        width="100%"
                        style={{ aspectRatio: '2 / 1', objectFit: 'cover' }}
                        mb={isMobile ? 0 : 20}
                        p={0}
                    />

                ))}
            </Fade>
        </div>
    );
};

export default Slideshow;