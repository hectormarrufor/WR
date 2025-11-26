"use client";

import { useEffect, useState } from "react";
import { Button, Group, Loader, Paper, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import ODTTable from "./ODTTable";

export default function ODTPage() {
  const router = useRouter();
  const [odts, setOdts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <Loader />;

  return (
    <Paper mt={70}>
      <Group position="apart" mb="md">
        <Title order={3}>Ordenes de trabajo (ODT)</Title>
        <Button
          leftIcon={<IconPlus size={16} />}
          onClick={() => router.push("/superuser/odt/nuevo")}
        >
          Nueva ODT
        </Button>
      </Group>

      <ODTTable odts={odts} />
    </Paper>
  );
}