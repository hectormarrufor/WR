'use client';

import {
  Paper,
  Title,
  SimpleGrid,
  Text,
  Divider,
  Group,
  Image,
  Flex,
  Badge,
  Button,
  Box,
} from '@mantine/core';
import { use, useEffect, useRef, useState } from 'react';
import { useRouter, notFound } from 'next/navigation';
import * as html2pdf from 'html2pdf.js';
import BackButton from '../../../components/BackButton';
import { useMediaQuery } from '@mantine/hooks';
import { httpGet } from '../../../ApiFunctions/httpServices';

export default function VehiculoPage({ params }) {
  const router = useRouter();
  const pdfRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const { id } = use(params);
  const [v, setV] = useState({});
  const [checklist, setChecklist] = useState(null);

  useEffect(() => {
    const fetchVehiculo = async () => {
      const vehiculo = await httpGet(`/api/vehiculos/${id}`);
      if (!vehiculo) throw notFound();
      setV(vehiculo);
    };
    fetchVehiculo();
  }, []);

  useEffect(() => {
    const fetchChecklist = async () => {
      const res = await httpGet(`/api/checklists?vehiculoId=${id}`);
      if (Array.isArray(res) && res.length > 0) {
        setChecklist(res[0]);
      }
    };
    fetchChecklist();
  }, [id]);

  const exportToPDF = () => {
    const opt = {
      margin: 0.3,
      filename: `Reporte_${v.placa}_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 1.5, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
    };
    html2pdf().set(opt).from(pdfRef.current).save();
  };

  if (!v.imagen) {
    return <Paper p="md" mt={90} mx={20}>Cargando…</Paper>;
  }

  return (
    <Paper p="md" mt={90} mx={isMobile ? 10 : 20}>
      <Group position="right" mb="sm">
        <Flex justify="space-between" wrap="wrap" w="100%" gap="sm">
          <BackButton onClick={() => router.push('/superuser/flota')} />
          <Button color="blue" onClick={() => router.push(`/superuser/flota/${id}/nuevoChecklist`)}>
            Realizar revisión diaria
          </Button>
          {!isMobile && <Button color="blue" onClick={exportToPDF}>Generar reporte PDF</Button>}
        </Flex>
      </Group>

      <Box ref={pdfRef}>
        <Title order={2} mb="md">Ficha técnica: {v.marca} {v.modelo}</Title>

        {/* Datos Generales */}
        <Title order={3} align="center" mb="md">Datos Generales</Title>
        <Flex direction={isMobile ? 'column' : 'row'} gap="lg" align="center">
          <SimpleGrid
            cols={isMobile ? 2 : 3}
            spacing="sm"
            breakpoints={[{ maxWidth: 'sm', cols: 1 }]}
            style={{ flex: 1 }}
          >
            <Text><strong>Marca:</strong> {v.marca}</Text>
            <Text><strong>Modelo:</strong> {v.modelo}</Text>
            <Text><strong>Placa:</strong> {v.placa}</Text>
            <Text><strong>Año:</strong> {v.ano}</Text>
            <Text><strong>Color:</strong> {v.color}</Text>
            <Text><strong>Tipo:</strong> {v.tipo}</Text>
            <Text><strong>Peso:</strong> {v.tipoPeso}</Text>
            <Text><strong>Ejes:</strong> {v.ejes}</Text>
            <Text><strong>Neumático:</strong> {v.neumatico}</Text>
            <Text><strong>Kilometraje:</strong> {v.kilometraje}</Text>
            <Text><strong>Horómetro:</strong> {v.horometro}</Text>
            <Text><strong>Correa:</strong> {v.correa}</Text>
          </SimpleGrid>

          <Image
            src={v.imagen}
            fit="contain"
            alt={`Imagen del vehículo ${v.modelo}`}
            height={isMobile ? 200 : 250}
            w={isMobile ? '100%' : 250}
            mt={isMobile ? 'md' : 0}
            crossOrigin="anonymous"
          />
        </Flex>

        {/* Combustible */}
        <Divider my="md" />
        <Title order={3} align="center" mb="md">Combustible</Title>
        <SimpleGrid cols={isMobile ? 2 : 3} spacing="sm">
          <Text><strong>Tipo:</strong> {v.combustible?.tipo}</Text>
          <Text><strong>Capacidad:</strong> {v.combustible?.capacidadCombustible} L</Text>
          <Text><strong>Inyectores:</strong> {v.combustible?.inyectores}</Text>
          <Text><strong>Filtro:</strong> {v.combustible?.filtroCombustible}</Text>
        </SimpleGrid>

        {/* Transmisión */}
        <Divider my="md" />
        <Title order={3} align="center" mb="md">Transmisión</Title>
        <SimpleGrid cols={isMobile ? 2 : 3} spacing="sm">
          <Text><strong># Velocidades:</strong> {v.transmision?.nroVelocidades}</Text>
          <Text><strong>Aceite:</strong> {v.transmision?.tipoAceite}</Text>
          <Text><strong>Cantidad:</strong> {v.transmision?.cantidad} L</Text>
          <Text><strong>Intervalo cambio:</strong> {v.transmision?.intervaloCambioKm} km</Text>
          <Text><strong>Último cambio:</strong> {v.transmision?.ultimoCambioKm} km</Text>
          <Text><strong>Status:</strong> {v.transmision?.status}</Text>
        </SimpleGrid>

        {/* Motor */}
        <Divider my="md" />
        <Title order={3} align="center" mb="md">Motor</Title>
        <SimpleGrid cols={isMobile ? 2 : 3} spacing="sm">
          <Text><strong>Serial:</strong> {v.motor?.serialMotor}</Text>
          <Text><strong>Potencia:</strong> {v.motor?.potencia}</Text>
          <Text><strong>Cilindros:</strong> {v.motor?.nroCilindros}</Text>
          <Text><strong>Filtro aceite:</strong> {v.motor?.filtroAceite}</Text>
          <Text><strong>Filtro aire:</strong> {v.motor?.filtroAire}</Text>
          <Text><strong>Viscosidad:</strong> {v.motor?.aceite?.viscosidad}</Text>
          <Text><strong>Litros:</strong> {v.motor?.aceite?.litros}</Text>
          <Text><strong>Intervalo cambio:</strong> {v.motor?.aceite?.intervaloCambioKm} km</Text>
          <Text><strong>Último cambio:</strong> {v.motor?.aceite?.ultimoCambioKm} km</Text>
        </SimpleGrid>

        {/* Carrocería */}
        <Divider my="md" />
        <Title order={3} align="center" mb="md">Carrocería</Title>
        <SimpleGrid cols={isMobile ? 2 : 3} spacing="sm">
          <Text><strong>Serial:</strong> {v.carroceria?.serialCarroceria}</Text>
          <Text><strong>Luz baja:</strong> {v.carroceria?.tipoLuzDelanteraBaja}</Text>
          <Text><strong>Luz alta:</strong> {v.carroceria?.tipoLuzDelanteraAlta}</Text>
          <Text><strong>Intermitente delantera:</strong> {v.carroceria?.tipoLuzIntermitenteDelantera}</Text>
          <Text><strong>Intermitente lateral:</strong> {v.carroceria?.tipoLuzIntermitenteLateral}</Text>
          <Text><strong>Luz trasera:</strong> {v.carroceria?.tipoLuzTrasera}</Text>
        </SimpleGrid>

        {/* Estado operativo */}
        {checklist && (
          <>
            <Divider my="xl" />
            <Title order={3} align="center" mb="md">Estado operativo</Title>
            <SimpleGrid cols={isMobile ? 2 : 2} spacing="md">
              <Text><strong>Kilometraje:</strong> {checklist.kilometraje}</Text>
              <Text><strong>Horómetro:</strong> {checklist.horometro}</Text>
              <Text>
                <strong>Cambio de aceite:</strong>{' '}
                <span
                  style={{
                    color:
                      checklist.aceiteEstado === 'Cambio requerido'
                        ? 'red'
                        : checklist.aceiteEstado === 'Próximo a cambio'
                          ? 'orange'
                          : 'green',
                  }}
                >
                  {checklist.aceiteEstado}
                </span>
              </Text>
            </SimpleGrid>

            <Title order={4} mt="md" mb="sm">Bombillos rotos</Title>
            <Group spacing="xs" mb="lg" wrap="wrap">
              {[
                ['Luz baja', 'bombilloDelBaja'],
                ['Luz alta', 'bombilloDelAlta'],
                ['Intermitente frontal izq.', 'intermitenteDelFrizq'],
                ['Intermitente frontal der.', 'intermitenteDelFder'],
                ['Intermitente lateral', 'intermitenteLateral'],
                ['Luz trasera', 'bombilloTrasero'],
              ]
                .filter(([_, key]) => checklist[key] === false)
                .map(([label], idx) => (
                  <Badge color="red" key={idx}>{label}</Badge>
                ))}
              {[
                'bombilloDelBaja',
                'bombilloDelAlta',
                'intermitenteDelFrizq',
                'intermitenteDelFder',
                'intermitenteLateral',
                'bombilloTrasero',
              ].every((key) => checklist[key] !== false) && (
                  <Text>Todas las luces están operativas</Text>
                )}
            </Group>

            <Title order={4} mt="md" mb="sm">Componentes críticos</Title>
            <Group spacing="xs" wrap="wrap">
              {[
                ['Filtro de aire', 'filtroAireOk'],
                ['Filtro de aceite', 'filtroAceiteOk'],
                ['Filtro de combustible', 'filtroCombustibleOk'],
                ['Correa', 'correaOk'],
                ['Neumático', 'neumaticoOk'],
                ['Inyectores', 'inyectoresOk'],
              ]
                .filter(([_, key]) => checklist[key] === false)
                .map(([label], idx) => (
                  <Badge color="orange" key={idx}>{label}</Badge>
                ))}
              {[
                'filtroAireOk',
                'filtroAceiteOk',
                'filtroCombustibleOk',
                'correaOk',
                'neumaticoOk',
                'inyectoresOk',
              ].every((key) => checklist[key] !== false) && (
                  <Text>Todos los componentes están operativos</Text>
                )}
            </Group>
          </>
        )}
      </Box>
    </Paper>
  );
}