"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Button, Group, Loader, Paper, Title, TextInput, 
  Container, Center 
} from "@mantine/core";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import ODTList from "./ODTList"; // Importamos el componente de arriba

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
        setOdts(Array.isArray(data) ? data : []);
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
            odt.vehiculoPrincipal?.codigoInterno?.toLowerCase().includes(term)
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
          <Title order={3}>Ordenes de trabajo (ODT)</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => router.push("/superuser/odt/nuevo")}
          >
            Nueva ODT
          </Button>
        </Group>

        {/* Barra de Búsqueda */}
        <TextInput
          placeholder="Buscar por Nro, Cliente, Chofer..."
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