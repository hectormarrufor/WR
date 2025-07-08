"use client"
import { notFound } from 'next/navigation';
import { Paper, Title, SimpleGrid, Text, Divider, Button, Group, Image, Flex } from '@mantine/core';
import { useEffect, useRef, useState, use } from 'react';
import html2pdf from 'html2pdf.js';
import { httpGet } from '../../../ApiFunctions/httpServices';



export default function VehiculoPage({ params }) {
  const { id } = use(params);
  const [v, setV] = useState({})
  useEffect(() => {
    const fetch = async() => {
        console.log('entrando en fetch');
        
        const vehiculo = await httpGet(`/api/vehiculos/${id}`);
        if (!vehiculo) throw notFound();
        console.log(vehiculo);
        
        setV(vehiculo);
    }
    fetch();
  }, [])
  useEffect(() => {
    console.log(v);
    
  }, [v])
  
  
  if (!v.imagen) return( 
    <Paper withBorder radius="md" p="md" mt={90} mx={20}>
        Loading        
    </Paper>)
  else return (
    <Paper withBorder radius="md" p="md" mt={90} mx={20}>
      <Title order={2} mb="md">
        Ficha técnica: {v?.marca} {v?.modelo}
      </Title>

      <Title order={3} mt="md"  align="center" mb={30}>Datos Generales</Title>
      <Flex justify="center">
          <SimpleGrid cols={6} spacing="sm">
            <Text><strong>Marca:</strong> {v?.marca}</Text>
            <Text><strong>Modelo:</strong> {v?.modelo}</Text>
            <Text><strong>Placa:</strong> {v?.placa}</Text>
            <Text><strong>Año:</strong> {v?.ano}</Text>
            <Text><strong>Color:</strong> {v?.color}</Text>
            <Text><strong>Tipo:</strong> {v?.tipo}</Text>
            <Text><strong>Peso:</strong> {v?.tipoPeso}</Text>
            <Text><strong>Ejes:</strong> {v?.ejes}</Text>
            <Text><strong>Neumático:</strong> {v?.neumatico}</Text>
            <Text><strong>Kilometraje:</strong> {v?.kilometraje}</Text>
            <Text><strong>Horómetro:</strong> {v?.horometro}</Text>
            <Text><strong>Filtro Aire:</strong> {v?.filtroAire}</Text>
            <Text><strong>Correa:</strong> {v?.correa}</Text>
          </SimpleGrid>
          {v && <Image src={v.imagen} h={200} fit='contain'/>}
      </Flex>

      <Divider my="md" />

      <Title order={3} mt="md" align="center" mb={30}>Combustible</Title>
      <SimpleGrid cols={4} spacing="sm" mb="md">
        <Text><strong>Tipo:</strong> {v?.combustible?.tipo}</Text>
        <Text><strong>Capacidad (L):</strong> {v?.combustible?.capacidadCombustible}</Text>
        <Text><strong>Inyectores:</strong> {v?.combustible?.inyectores}</Text>
        <Text><strong>Filtro combustible:</strong> {v?.combustible?.filtroCombustible}</Text>
      </SimpleGrid>

      <Divider my="md" />

      <Title order={3} mt="md" align="center" mb={30}>Transmisión</Title>
      <SimpleGrid cols={6} spacing="sm" mb="md">
        <Text><strong># Velocidades:</strong> {v?.transmision?.nroVelocidades}</Text>
        <Text><strong>Tipo aceite:</strong> {v?.transmision?.tipoAceite}</Text>
        <Text><strong>Cantidad (L):</strong> {v?.transmision?.cantidad}</Text>
        <Text><strong>Intervalo cambio (km):</strong> {v?.transmision?.intervaloCambioKm}</Text>
        <Text><strong>Último cambio (km):</strong> {v?.transmision?.ultimoCambioKm}</Text>
        <Text><strong>Status:</strong> {v?.transmision?.status}</Text>
      </SimpleGrid>

      <Divider my="md" />

      <Title order={3} mt="md" align="center" mb={30}>Motor</Title>
      <SimpleGrid cols={5} spacing="sm" mb="md">
        <Text><strong>Serial:</strong> {v?.motor?.serialMotor}</Text>
        <Text><strong>Potencia:</strong> {v?.motor?.potencia}</Text>
        <Text><strong># Cilindros:</strong> {v?.motor?.nroCilindros}</Text>
        <Text><strong>Filtro aceite:</strong> {v?.motor?.filtroAceite}</Text>
        <Text><strong>Filtro aire:</strong> {v?.motor?.filtroAire}</Text>
      </SimpleGrid>
      <SimpleGrid cols={5} spacing="sm">
        <Text><strong>Viscosidad:</strong> {v?.motor?.aceite?.viscosidad}</Text>
        <Text><strong>Litros:</strong> {v?.motor?.aceite?.litros}</Text>
        <Text><strong>Intervalo cambio (km):</strong> {v?.motor?.aceite?.intervaloCambioKm}</Text>
        <Text><strong>Último cambio (km):</strong> {v?.motor?.aceite?.ultimoCambioKm}</Text>
        <Text><strong>Status:</strong> {v?.motor?.aceite?.status}</Text>
      </SimpleGrid>

      <Divider my="md" />

      <Title order={3} mt="md" align="center" mb={30}>Carrocería</Title>
      <SimpleGrid cols={6} spacing="sm">
        <Text><strong>Serial:</strong> {v?.carroceria?.serialCarroceria}</Text>
        <Text><strong>Luz baja:</strong> {v?.carroceria?.tipoLuzDelanteraBaja}</Text>
        <Text><strong>Luz alta:</strong> {v?.carroceria?.tipoLuzDelanteraAlta}</Text>
        <Text><strong>Intermitente delantera:</strong> {v?.carroceria?.tipoLuzIntermitenteDelantera}</Text>
        <Text><strong>Intermitente lateral:</strong> {v?.carroceria?.tipoLuzIntermitenteLateral}</Text>
        <Text><strong>Luz trasera:</strong> {v?.carroceria?.tipoLuzTrasera}</Text>
      </SimpleGrid>
    </Paper>
  );
}