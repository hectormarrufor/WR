'use client';
import { Paper, Flex, Title } from '@mantine/core';
import BackButton from '@/app/components/BackButton';
import { useRouter } from 'next/navigation';
import ConsumibleFormManager from '../../components/ConsumibleFormManager'; // Importa el Manager

export default function NuevoConsumiblePage() {
    const router = useRouter();

    return (
        <Paper p="xl" mt={30}>
            <Flex justify="space-between" mb="xl" align="center">
                <Title order={2}>Crear Nuevo Consumible</Title>
                <BackButton />
            </Flex>

            {/* Usamos el Manager. Cuando termine, redirigimos. */}
            <ConsumibleFormManager 
                onSuccess={(newItem) => {
                    // Lógica específica de la PÁGINA: Redirigir al listado
                    router.push('/superuser/inventario/consumibles');
                }}
                onCancel={() => router.back()}
            />
        </Paper>
    );
}