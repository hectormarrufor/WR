'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Button, 
  Paper, 
  TextInput, 
  Table, 
  Group, 
  Badge, 
  ActionIcon, 
  Select, 
  Loader, 
  Text,
  Center,
  Pagination,
  Avatar,
  Title
} from '@mantine/core';
import { IconSearch, IconEdit, IconEye, IconPlus } from '@tabler/icons-react';
export default function GestionModelosPage() {
  const [loading, setLoading] = useState(true);
  const [masterData, setMasterData] = useState([]); // Lista unificada
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('Todos'); // Filtro por Origen (Vehiculo, Remolque, Máquina)
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAllModelos();
  }, []);

  const fetchAllModelos = async () => {
    setLoading(true);
    try {
      // 1. Ejecutamos los 3 llamados en paralelo para mayor velocidad
      const [resVehiculos, resRemolques, resMaquinas] = await Promise.all([
        fetch('/api/gestionMantenimiento/vehiculo'),
        fetch('/api/gestionMantenimiento/remolque'),
        fetch('/api/gestionMantenimiento/maquina')
      ]);

      // 2. Convertimos a JSON (Manejar errores si alguno falla es recomendable)
      const vehiculosRaw = await resVehiculos.json() || []  ;
      const remolquesRaw = await resRemolques.json() || [];
      const maquinasRaw = await resMaquinas.json() || [];

      // Helper para extraer array seguro
      const getArray = (res) => (Array.isArray(res) ? res : (res.data || []));

      // 3. NORMALIZACIÓN: "Marcamos" cada objeto con su origen
      // Esto cumple tu requerimiento de categorizar por el fetch, no por el objeto.
      
      const vList = getArray(vehiculosRaw).map(item => ({
        ...item,
        _origen: 'Vehiculo', // Etiqueta interna
        _tipoEspecifico: item.tipoVehiculo, // Normalizamos el subtipo
        _identificador: item.modelo // Normalizamos el nombre principal
      }));

      const rList = getArray(remolquesRaw).map(item => ({
        ...item,
        _origen: 'Remolque',
        _tipoEspecifico: item.tipoRemolque, // ej: Batea, Lowboy
        _identificador: item.marca + ' ' + (item.anio || '') // A veces remolques no tienen "modelo" nombre
      }));

      const mList = getArray(maquinasRaw).map(item => ({
        ...item,
        _origen: 'Máquina',
        _tipoEspecifico: item.tipoMaquina, // ej: Retroexcavadora
        _identificador: item.modelo
      }));

      // 4. Unificamos todo en un solo estado maestro
      // Ordenamos alfabéticamente por marca para que se vea ordenado
      const unificados = [...vList, ...rList, ...mList].sort((a, b) => 
        (a.marca || '').localeCompare(b.marca || '')
      );
      console.log("Modelos unificados cargados:", unificados);
      setMasterData(unificados);

    } catch (error) {
      console.error("Error cargando inventario de modelos:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- FILTRADO ---
  const filteredData = masterData.filter((item) => {
    const term = search.toLowerCase();
    
    // Búsqueda en campos comunes
    const matchesSearch = 
      (item.marca || '').toLowerCase().includes(term) ||
      (item._identificador || '').toLowerCase().includes(term) ||
      (item._tipoEspecifico || '').toLowerCase().includes(term);

    // Filtro por la categoría que asignamos manualmente en el fetch
    const matchesType = tipoFilter === 'Todos' 
      ? true 
      : item._origen === tipoFilter;

    return matchesSearch && matchesType;
  });

  // --- PAGINACIÓN ---
  const paginatedData = filteredData.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Helper visual
  const getBadgeColor = (origen) => {
    switch (origen) {
      case 'Vehiculo': return 'blue';
      case 'Remolque': return 'green';
      case 'Máquina': return 'orange';
      default: return 'gray';
    }
  };

  const rows = paginatedData.map((element, index) => (
    <Table.Tr key={`${element.id}-${element._origen}-${index}`}>
      <Table.Td>
        <Group gap="sm">
            {element.imagen ? (
                <Avatar src={`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}/${element.imagen}`} radius="sm" size="20vmin" />
            ) : <Avatar radius="xl" size="sm" color="initials">{element.marca?.charAt(0)}</Avatar>}
            <div>
                <Text fw={500}>{element._identificador || 'S/N'}</Text>
                <Text size="xs" c="dimmed">Año {element.anio}</Text>
            </div>
        </Group>
      </Table.Td>
      
      <Table.Td>
        <Text fw={500}>{element.marca}</Text>
      </Table.Td>
      
      <Table.Td>
        <Group gap={5}>
            {/* Badge Principal: Origen del Fetch */}
            <Badge color={getBadgeColor(element._origen)} variant="filled" size="sm">
                {element._origen.toUpperCase()}
            </Badge>
            {/* Badge Secundario: Subtipo específico (Chuto, Batea, etc) */}
            <Badge variant="outline" color="gray" size="sm">
                {element._tipoEspecifico || 'Estándar'}
            </Badge>
        </Group>
      </Table.Td>
      
      <Table.Td>
        <Group gap={4}>
           <Badge variant="light" color="gray" size="sm">
             {element.numeroEjes ? `${element.numeroEjes} Ejes` : 'N/A'}
           </Badge>
           {/* Aquí puedes agregar más specs condicionales según el origen */}
           {element._origen === 'Vehiculo' && element.tipoCombustible && (
               <Badge variant="dot" size="sm" color="red">{element.tipoCombustible}</Badge>
           )}
        </Group>
      </Table.Td>
      
      <Table.Td>
        <Group gap="xs">
          <ActionIcon variant="subtle" color="blue" title="Ver detalles">
            <IconEye size={16} />
          </ActionIcon>
          <ActionIcon 
            variant="subtle" 
            color="orange" 
            component={Link} 
            // Cuidado aquí: quizás necesites rutas distintas para editar según el tipo
            // Ej: /editar-vehiculo/1 vs /editar-remolque/1
            href={`/superuser/flota/modelos/${element.id}/${element._origen}/editar/`}
            title="Editar"
          >
            <IconEdit size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper p="md">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Title title="Gestión de Modelos de Activos" />
        {/* Aquí quizás necesites un menú desplegable para crear, o una página intermedia */}
        <Button 
          component={Link} 
          href="/superuser/flota/modelos/crear" 
          leftSection={<IconPlus size={18} />}
        >
          Crear Nuevo Modelo
        </Button>
      </div>

      <Text size="sm" c="dimmed" mb="xl" mt="-xs">
        Inventario unificado de plantillas de Vehiculos, Remolques y Maquinaria Pesada.
      </Text>

      <Group mb="md" justify="space-between">
        <Group>
          <TextInput
            placeholder="Buscar..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={300}
          />
          <Select
            placeholder="Filtrar por Categoría"
            data={['Todos', 'Vehiculo', 'Remolque', 'Máquina']}
            value={tipoFilter}
            onChange={(val) => {
                setTipoFilter(val);
                setPage(1); // Resetear paginación al filtrar
            }}
            w={180}
            allowDeselect={false}
          />
        </Group>
      </Group>

      <Table.ScrollContainer minWidth={800}>
        <Table verticalSpacing="sm" striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Modelo / Año</Table.Th>
              <Table.Th>Marca</Table.Th>
              <Table.Th>Categoría / Tipo</Table.Th>
              <Table.Th>Specs</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Center p="xl"><Loader /></Center>
                </Table.Td>
              </Table.Tr>
            ) : rows.length > 0 ? (
              rows
            ) : (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Center p="xl">
                    <Text c="dimmed">No se encontraron modelos con los filtros actuales.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {filteredData.length > itemsPerPage && (
        <Center mt="xl">
          <Pagination 
            total={Math.ceil(filteredData.length / itemsPerPage)} 
            value={page} 
            onChange={setPage} 
          />
        </Center>
      )}
    </Paper>
  );
}