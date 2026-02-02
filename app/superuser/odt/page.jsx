"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Button, Group, Loader, Paper, Title, TextInput, 
  Container, Center 
} from "@mantine/core";
import { IconPlus, IconSearch, IconArrowLeft } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale"; // Importar local español
import ODTList from "./ODTList";

export default function ODTPage() {
  const router = useRouter();
  const [odts, setOdts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchODTs = async () => {
      try {
        const res = await fetch("/api/odts", { cache: "no-store" });
        const data = await res.json();

        setOdts(data);
      } catch (error) {
        console.error("Error cargando ODTs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchODTs();
  }, []);

  // Filtro Cliente-Side para búsqueda rápida
  const filteredOdts = useMemo(() => {
    return odts.filter(odt => {
        const term = search.toLowerCase();
        return (
            odt.nroODT.toLowerCase().includes(term) ||
            odt.cliente?.nombre?.toLowerCase().includes(term) ||
            odt.chofer?.nombre?.toLowerCase().includes(term) ||
            odt.vehiculoPrincipal?.codigoInterno?.toLowerCase().includes(term) ||
            odt.fecha?.toLowerCase().includes(term) // Permitir buscar por fecha formateada
        );
    });
  }, [odts, search]);

  if (loading) return (
    <Center h="50vh"><Loader size="lg" /></Center>
  );

  return (
    <Container size="xl" mt={20}>
      <Paper p="md" radius="md" withBorder>
        {/* Cabecera y Acciones */}
        <Group justify="space-between" mb="lg">
          <Group gap="xs">
            <Button variant="default" size="xs" onClick={() => router.back()}>
                <IconArrowLeft size={16} />
            </Button>
            <Title order={3}>Ordenes de trabajo (ODT)</Title>
          </Group>
          
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => router.push("/superuser/odt/nuevo")}
            size="sm"
          >
            Nueva ODT
          </Button>
        </Group>

        {/* Barra de Búsqueda */}
        <TextInput
          placeholder="Buscar por Nro, Cliente, Chofer, Fecha..."
          mb="md"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />

        {/* Lista Responsiva */}
        <ODTList odts={filteredOdts} />
        
      </Paper>
    </Container>
  );
}