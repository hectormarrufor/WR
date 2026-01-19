'use client';
import { useEffect, useState } from 'react';
import { 
  Container, Title, Timeline, Text, Paper, Group, Badge, Loader, Center, ThemeIcon 
} from '@mantine/core';
import { 
  IconInfoCircle, IconAlertTriangle, IconAlertOctagon, IconBell 
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/notificaciones')
      .then(res => res.json())
      .then(data => {
        if(data.success) setNotificaciones(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const getIcon = (tipo) => {
    if (tipo === 'Critico') return <IconAlertOctagon size={18} />;
    if (tipo === 'Alerta') return <IconAlertTriangle size={18} />;
    return <IconInfoCircle size={18} />;
  };

  const getColor = (tipo) => {
    if (tipo === 'Critico') return 'red';
    if (tipo === 'Alerta') return 'orange';
    return 'blue';
  };

  if (loading) return <Center h="50vh"><Loader /></Center>;

  return (
    <Container size="md" py="xl">
      <Group mb="xl">
        <ThemeIcon size="xl" radius="md" variant="light">
          <IconBell />
        </ThemeIcon>
        <div>
          <Title order={2}>Centro de Notificaciones</Title>
          <Text c="dimmed">Historial completo de alertas y avisos</Text>
        </div>
      </Group>

      <Paper shadow="sm" radius="md" p="xl" withBorder>
        {notificaciones.length === 0 ? (
          <Text ta="center" c="dimmed">No tienes notificaciones registradas.</Text>
        ) : (
          <Timeline active={-1} bulletSize={30} lineWidth={2}>
            {notificaciones.map((notif) => (
              <Timeline.Item 
                key={notif.id} 
                bullet={getIcon(notif.tipo)}
                color={getColor(notif.tipo)}
                title={
                  <Group>
                    <Text fw={500}>{notif.titulo}</Text>
                    {notif.tipo !== 'Info' && (
                        <Badge color={getColor(notif.tipo)} size="xs">{notif.tipo}</Badge>
                    )}
                  </Group>
                }
              >
                <Text c="dimmed" size="sm">{notif.mensaje}</Text>
                
                <Group justify="space-between" mt="xs">
                  <Text size="xs" c="dimmed">
                     {notif.fechaHoraCaracas || new Date(notif.createdAt).toLocaleString()}
                  </Text>
                  
                  {notif.url && (
                    <Text 
                      size="xs" 
                      c="blue" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(notif.url)}
                    >
                      Ir al detalle →
                    </Text>
                  )}
                </Group>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Paper>
    </Container>
  );
}