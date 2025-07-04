"use client"
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Carousel, CarouselSlide } from '@mantine/carousel';
import {
    Button,
    TextInput,
    Card,
    Text,
    Grid,
    Image,
    Container,
    AppShell,
    Flex,
    Title,
    Transition
} from '@mantine/core';
import '@mantine/carousel/styles.css';
import { useInterval } from '@mantine/hooks';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
require('dotenv').config();

export default function Page() {
    const [clientes, setClientes] = useState([])
    useEffect(() => {
        // async function cargarClientes() {
        //     try {
        //         const clientes = await obtenerClientes();
        //         setClientes(clientes)
        //     }
        //     catch (error) {
        //         console.log(error)
        //     }
        // }
        // cargarClientes();

    }, [])

    const [isVisible, setIsVisible] = useState(false);

    setTimeout(() => {
        setIsVisible(true)

    }
        , 1000
    )


    const router = useRouter()
    const autoplay = useRef(Autoplay({ delay: 5000 }))
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, [])


    return (


        <Fragment>

            {isClient &&

                // <Carousel
                //     slideSize="70%"
                //     height={500}
                //     slideGap="md"
                //     loop
                //     dragFree
                //     withIndicators
                //     plugins={[autoplay.current]}
                //     onMouseEnter={autoplay.current.stop}
                //     onMouseLeave={autoplay.current.reset}
                //     style={{
                //         opacity: isVisible ? 1 : 0,
                //         transition: 'opacity 1s ease-in-out',
                //     }}
                // >
                //     <CarouselSlide>
                //         <Image src="https://scontent.fmar3-1.fna.fbcdn.net/v/t39.30808-6/475046937_593334369994920_4017070930149281347_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=cc71e4&_nc_ohc=kPvbDdkZ1igQ7kNvgHjR1Pf&_nc_oc=Adld-NJItzC2WuT9EEyRrjJ4r-cCfPFJwSCPTi8Jjy0s26AXB2K2ltXNIP1PmkedFFs&_nc_zt=23&_nc_ht=scontent.fmar3-1.fna&_nc_gid=8o0bePS8J6nPNUhucptQxg&oh=00_AYEI7L1M_RylDhPQDT9f_9tdgvd0qcyShbzKP7omsNOpYQ&oe=67F08C10" alt="Imagen 1" />
                //     </CarouselSlide>

                // </Carousel>
                <Image src="https://scontent.fmar3-1.fna.fbcdn.net/v/t39.30808-6/475046937_593334369994920_4017070930149281347_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=cc71e4&_nc_ohc=kPvbDdkZ1igQ7kNvgHjR1Pf&_nc_oc=Adld-NJItzC2WuT9EEyRrjJ4r-cCfPFJwSCPTi8Jjy0s26AXB2K2ltXNIP1PmkedFFs&_nc_zt=23&_nc_ht=scontent.fmar3-1.fna&_nc_gid=8o0bePS8J6nPNUhucptQxg&oh=00_AYEI7L1M_RylDhPQDT9f_9tdgvd0qcyShbzKP7omsNOpYQ&oe=67F08C10"
                    style={{
                        opacity: isVisible ? 1 : 0,
                        transition: 'opacity 1s ease-in-out',
                    }}
                    mt={30}
                    alt="Imagen 1"
                />
            }
            {/* <Button
                variant='gradient'
                style={{

                    position: "relative",
                    bottom: 50,
                    left: 30

                }} onClick={() => router.push('/stones')}>Design your countertop now</Button> */}




            <Grid
                px={0}
                mx={0}
                style={{
                    opacity: isVisible ? 1 : 0,
                    transition: 'opacity 2s ease-in-out',
                }}
                m="xl">
                <Grid.Col span={8} h={315} px={100} pl={120}>
                    <Flex h={315} direction="column" justify="space-evenly" ><Title mt={100} align="center">Servicios de explotacion de pozos petroleros</Title>
                        <Text align="center" size="xl" weight={500} py={60}>
                            En WR Well Services nos dedicamos a la explotación y mantenimiento integral de pozos petroleros, garantizando eficiencia y seguridad en cada operación. Contamos con toda la maquinaria de vanguardia necesaria para cubrir cualquier requerimiento:
                            - Taladros móviles de alta potencia
                            - Equipos de coiled tubing y snubbing
                            - Bombas de extracción y sistemas de vacuum
                            - Unidades de control y monitoreo en sitio
                            Nuestro equipo de profesionales altamente calificados trabaja bajo estándares internacionales, asegurando resultados de primera calidad y minimizando tiempos de inactividad.

                        </Text>
                        {/* <div><Button variant='gradient' align="flex-start" >Shop Now</Button></div> */}
                    </Flex>
                </Grid.Col>

                <Grid.Col span={4} justify="center" align="center" p={50} mt={50}>
                    <Image src="https://www.mipore.polimi.it/wp-content/uploads/2022/03/01_SORBACO-scaled-1707x1707.jpg" fit='fill' height={400} width={300} alt='imagen' />
                </Grid.Col>
                <Grid.Col bg="rgba(224, 224, 224, 0.3)" span={4} justify="center" align="center" p={50} mt={50}>
                    <Image src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4vWjMrVDrkxR08Nm0Fn0V2YicqEm3eC5pTA&s" height={400} alt='imagen' />
                </Grid.Col>
                <Grid.Col span={8} mt={50} bg="rgba(224, 224, 224, 0.3)">
                    <Flex h={400} direction="column" justify="center" align="center" >
                        <Text p={100} mt={80} align="center" size="xl" weight={500} style={{ marginBottom: 20 }}>
                            Consolidarnos como la empresa lider en el mercado de transporte terrestre de cargas especiales en Venezuela y crecer de forma sostenida. Nos esforzamos por mantener siempre la calidad que nos caracteriza y por ofrecer un servicio de excelencia a nuestros clientes. Nuestro objetivo es ser la primera opción en el transporte de cargas especiales, brindando soluciones innovadoras y adaptadas a las necesidades de cada cliente.
                        </Text>
                    </Flex>
                </Grid.Col>
            </Grid>
            {/* <Title align="center" p={50}>Our Products</Title>
            <Flex
                mih={50}
                bg="rgba(224, 224, 224, 0.3)"
                gap="md"
                justify="center"
                align="center"
                direction="row"
                wrap="wrap"
                p="xl"
            >
                {stones.map((stone) => {
                    return (
                        <TypeStoneCard key={nanoid()} name={stone.name} url={stone.url} price={stone.price} />
                    )
                })}


            </Flex> */}
            <Card shadow="sm" padding="lg">
                <Title>Interested?</Title>
                <Text size="lg" weight={500} style={{ marginBottom: 20 }}>
                    Contact Us
                </Text>
                <TextInput width={200} label="Name" placeholder="Type your name" required />
                <TextInput
                    label="email"
                    placeholder="youremail@example.com"
                    required
                    style={{ marginTop: 15 }}
                />
                <TextInput
                    label="Message"
                    placeholder="Write a message"
                    required
                    style={{ marginTop: 15 }}
                    multiline
                />
                <Button style={{ marginTop: 20 }} fullWidth onClick={() => alert('Message sent')}>
                    Send
                </Button>
            </Card>
        </Fragment>


    )
}