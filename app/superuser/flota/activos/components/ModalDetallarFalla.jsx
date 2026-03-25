'use client';
import { useState, useEffect } from 'react';
import {
    Modal, Button, TextInput, NumberInput, Select, Autocomplete,
    Stack, Group, Text, Paper, Divider, Checkbox, Box, Switch
} from '@mantine/core';
import { IconSettings, IconEngine, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function ModalDetallarFalla({ opened, onClose, hallazgo, activo, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [catalogoGlobal, setCatalogoGlobal] = useState([]);

    const [datos, setDatos] = useState({
        subsistemaId: '',          
        nuevoSubsistemaNombre: '', 
        categoriaSubsistemaNuevo: 'otros', 

        nombrePieza: '',           
        cantidadSlots: 1,          
        impacto: hallazgo?.impacto || 'Operativo',

        clasificacionPiezaNueva: 'Fungible',
        categoriaPiezaNueva: 'Repuesto General',
        serialesNuevos: [''],
        serialesFallaIndices: [0], 
        cantidadFallaFungible: 1,  

        esFaltante: false, 

        marcaPieza: '',
        codigoPieza: '',
        modeloPieza: '',
        medidaPieza: '',
        amperajePieza: '',
        diametroPieza: '',
        longitudPieza: '', 
        conectoresPieza: ''
    });

    useEffect(() => {
        if (opened) {
            fetch('/api/inventario/consumibles')
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.data) {
                        setCatalogoGlobal(data.data);
                    } else if (Array.isArray(data)) {
                        setCatalogoGlobal(data);
                    }
                })
                .catch(err => console.error("Error cargando catálogo:", err));
        }
    }, [opened]);

    const piezaSeleccionada = catalogoGlobal.find(c => c.nombre.toLowerCase() === datos.nombrePieza.toLowerCase());
    const isPiezaNueva = datos.nombrePieza.trim().length > 0 && !piezaSeleccionada;
    
    const clasificacionEfectiva = piezaSeleccionada 
        ? (piezaSeleccionada.tipo === 'serializado' ? 'Serializado' : 'Fungible') 
        : datos.clasificacionPiezaNueva;

    const handleCantidadChange = (val) => {
        const count = Math.max(1, val || 1);
        setDatos(prev => {
            const nuevosSeriales = [...prev.serialesNuevos];
            while (nuevosSeriales.length < count) nuevosSeriales.push('');
            while (nuevosSeriales.length > count) nuevosSeriales.pop();
            
            return { 
                ...prev, 
                cantidadSlots: count, 
                serialesNuevos: nuevosSeriales,
                serialesFallaIndices: prev.serialesFallaIndices.filter(idx => idx < count),
                cantidadFallaFungible: Math.min(prev.cantidadFallaFungible, count)
            };
        });
    };

    const subsistemasExistentes = activo.subsistemasInstancia?.map(sub => ({
        value: sub.id.toString(),
        label: sub.nombre
    })) || [];

    const opcionesSubsistemas = [
        { value: 'NUEVO', label: '+ CREAR NUEVO ÁREA/SUBSISTEMA' },
        ...subsistemasExistentes
    ];

    const handleSubmit = async () => {
        if (!datos.subsistemaId && !datos.nuevoSubsistemaNombre) {
            return notifications.show({ title: 'Atención', message: 'Debe seleccionar o nombrar un subsistema', color: 'orange' });
        }

        if (datos.nombrePieza && clasificacionEfectiva === 'Serializado' && !datos.esFaltante && datos.serialesFallaIndices.length === 0) {
            return notifications.show({ title: 'Atención', message: 'Debe marcar al menos un serial que presente falla', color: 'orange' });
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/gestionMantenimiento/hallazgos/${hallazgo.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activoId: activo.id,
                    vehiculoId: activo.vehiculoInstancia?.vehiculoId,
                    ...datos,
                    clasificacionPiezaNueva: clasificacionEfectiva
                })
            });

            const data = await res.json();
            if (data.success) {
                notifications.show({ title: 'Falla Caracterizada', message: 'Se ha actualizado la anatomía del activo.', color: 'green' });
                onSuccess(); 
                onClose();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            title={<Text fw={900} size="lg" tt="uppercase">Detallar Hallazgo #{hallazgo?.id}</Text>}
            size="lg" 
            centered
        >
            <Stack>
                <Paper withBorder p="md" bg="blue.0">
                    <Text size="xs" fw={700} c="blue.9" tt="uppercase">Reporte Original:</Text>
                    <Text fw={800} size="sm" c="dark.8">"{hallazgo?.descripcion}"</Text>
                </Paper>

                <Divider label="Vincular a la anatomía del equipo" labelPosition="center" />

                <Select
                    label="¿A qué área pertenece esta falla?"
                    placeholder="Seleccione área de incidencia"
                    data={opcionesSubsistemas}
                    value={datos.subsistemaId}
                    onChange={(val) => setDatos({ ...datos, subsistemaId: val })}
                    leftSection={<IconEngine size={18} />}
                />

                {datos.subsistemaId === 'NUEVO' && (
                    <Paper withBorder p="sm" bg="orange.0" style={{ borderLeft: '4px solid #f59f00' }}>
                        <Group grow align="flex-end">
                            <TextInput
                                label="Nombre del Nuevo Subsistema"
                                placeholder="Ej: Sistema Hidráulico..."
                                value={datos.nuevoSubsistemaNombre}
                                onChange={(e) => setDatos({ ...datos, nuevoSubsistemaNombre: e.target.value })}
                                autoFocus
                            />
                            <Select 
                                label="Categoría Técnica"
                                data={[
                                    { value: 'motor', label: 'Motor' },
                                    { value: 'transmision', label: 'Transmisión' },
                                    { value: 'frenos', label: 'Frenos' },
                                    { value: 'tren de rodaje', label: 'Tren de Rodaje' },
                                    { value: 'suspension', label: 'Suspensión' },
                                    { value: 'electrico', label: 'Eléctrico' },
                                    { value: 'iluminacion', label: 'Iluminación' },
                                    { value: 'sistema de escape', label: 'Sistema de Escape' },
                                    { value: 'sistema hidraulico', label: 'Sistema Hidráulico' },
                                    { value: 'sistema de direccion', label: 'Sistema de Dirección' },
                                    { value: 'sistema de combustible', label: 'Sistema de Combustible' },
                                    { value: 'otros', label: 'Otros' }
                                ]}
                                value={datos.categoriaSubsistemaNuevo}
                                onChange={(val) => setDatos({ ...datos, categoriaSubsistemaNuevo: val })}
                            />
                        </Group>
                    </Paper>
                )}

                <Paper withBorder p="md" radius="sm">
                    <Stack gap="sm">
                        <Autocomplete
                            label="Componente Específico (Catálogo Global)"
                            placeholder="Ej: Manguera de refrigerante 1 pulgada..."
                            description="Busca en el catálogo o escribe un nombre nuevo para registrarlo."
                            data={catalogoGlobal.map(c => c.nombre)}
                            value={datos.nombrePieza}
                            onChange={(val) => setDatos({ ...datos, nombrePieza: val })}
                            leftSection={<IconSettings size={18} />}
                        />

                        {/* 🔥 SWITCH MOVIDO ARRIBA PARA DEFINIR EL FLUJO */}
                        {datos.nombrePieza && (
                            <Box mt="xs" mb="xs">
                                <Switch 
                                    label={<Text fw={700} c="red.8">La pieza está FALTANTE (Extraviada o no instalada)</Text>}
                                    color="red"
                                    checked={datos.esFaltante}
                                    onChange={(e) => setDatos({ ...datos, esFaltante: e.currentTarget.checked })}
                                />
                            </Box>
                        )}

                        {piezaSeleccionada && (
                            <Box mt="xs" p="sm" bg="teal.0" style={{ borderRadius: 8, borderLeft: '4px solid #2b8a3e' }}>
                                <Text size="xs" fw={700} c="teal.9" mb="xs">PIEZA ENCONTRADA EN CATÁLOGO</Text>
                                <Group grow align="flex-end">
                                    <NumberInput
                                        label={`Cantidad (${piezaSeleccionada.unidadMedida || 'unidades'})`}
                                        description="Requerida por este equipo"
                                        min={1} size="xs"
                                        value={datos.cantidadSlots}
                                        onChange={handleCantidadChange}
                                    />
                                    <TextInput 
                                        label="Clasificación" size="xs" disabled
                                        value={clasificacionEfectiva}
                                    />
                                </Group>
                            </Box>
                        )}

                        {isPiezaNueva && (
                            <Box mt="xs" p="sm" bg="gray.0" style={{ borderRadius: 8, borderLeft: '4px solid #868e96' }}>
                                <Text size="xs" fw={700} c="dark.4" mb="xs">
                                    {datos.esFaltante ? "REQUERIMIENTO TÉCNICO DE LA PIEZA FALTANTE" : "PERFIL DE INVENTARIO PARA LA NUEVA PIEZA"}
                                </Text>
                                <Group grow align="flex-end">
                                    <NumberInput
                                        label={datos.esFaltante ? "Cant. Requerida" : "Cant. en el equipo"}
                                        min={1} size="xs"
                                        value={datos.cantidadSlots}
                                        onChange={handleCantidadChange}
                                    />
                                    <Select 
                                        label="Clasificación" size="xs"
                                        data={['Fungible', 'Serializado']}
                                        value={datos.clasificacionPiezaNueva}
                                        onChange={(val) => setDatos({ ...datos, clasificacionPiezaNueva: val })}
                                    />
                                    <Select 
                                        label="Categoría" size="xs"
                                        data={['Repuesto General', 'Filtro', 'Correa', 'Neumatico', 'Bateria', 'Aceite', 'Sensor', 'Manguera']}
                                        value={datos.categoriaPiezaNueva}
                                        onChange={(val) => setDatos({ ...datos, categoriaPiezaNueva: val })}
                                    />
                                </Group>

                                <Group grow align="flex-start" mt="sm">
                                    {['Repuesto General', 'Filtro', 'Correa', 'Sensor'].includes(datos.categoriaPiezaNueva) && !datos.esFaltante && (
                                        <>
                                            <TextInput label="Marca" size="xs" placeholder="Ej: WIX, Caterpillar" value={datos.marcaPieza} onChange={(e) => setDatos({ ...datos, marcaPieza: e.target.value })} />
                                            <TextInput label="Nro Parte / Código" size="xs" placeholder="Ej: 1R-0716" value={datos.codigoPieza} onChange={(e) => setDatos({ ...datos, codigoPieza: e.target.value })} />
                                        </>
                                    )}

                                    {datos.categoriaPiezaNueva === 'Manguera' && (
                                        <>
                                            <TextInput 
                                                label="Diámetro" size="xs" placeholder="Ej: 1/2" 
                                                rightSection={<Text size="xs" c="dimmed" mr="xs">pulg.</Text>}
                                                value={datos.diametroPieza} onChange={(e) => setDatos({ ...datos, diametroPieza: e.target.value })} 
                                            />
                                            <NumberInput 
                                                label="Longitud (Catálogo)" size="xs" placeholder="Ej: 150" suffix=" cm" min={1}
                                                value={datos.longitudPieza} onChange={(val) => setDatos({ ...datos, longitudPieza: val })} 
                                            />
                                            <TextInput 
                                                label="Conectores" size="xs" placeholder="Ej: Recto a 90°" 
                                                value={datos.conectoresPieza} onChange={(e) => setDatos({ ...datos, conectoresPieza: e.target.value })} 
                                            />
                                        </>
                                    )}

                                    {datos.categoriaPiezaNueva === 'Neumatico' && (
                                        <>
                                            {!datos.esFaltante && <TextInput label="Marca" size="xs" placeholder="Ej: Firestone" value={datos.marcaPieza} onChange={(e) => setDatos({ ...datos, marcaPieza: e.target.value })} />}
                                            {!datos.esFaltante && <TextInput label="Modelo" size="xs" placeholder="Ej: FS400" value={datos.modeloPieza} onChange={(e) => setDatos({ ...datos, modeloPieza: e.target.value })} />}
                                            <TextInput label="Medida (Requerida)" size="xs" placeholder="Ej: 295/80R22.5" value={datos.medidaPieza} onChange={(e) => setDatos({ ...datos, medidaPieza: e.target.value })} />
                                        </>
                                    )}
                                    {datos.categoriaPiezaNueva === 'Bateria' && (
                                        <>
                                            {!datos.esFaltante && <TextInput label="Marca" size="xs" placeholder="Ej: Duncan" value={datos.marcaPieza} onChange={(e) => setDatos({ ...datos, marcaPieza: e.target.value })} />}
                                            <TextInput label="Grupo / Tamaño" size="xs" placeholder="Ej: 24F, 4D, 8D" value={datos.codigoPieza} onChange={(e) => setDatos({ ...datos, codigoPieza: e.target.value })} />
                                            <NumberInput label="Amperaje (CCA)" size="xs" placeholder="Ej: 800" value={datos.amperajePieza} onChange={(val) => setDatos({ ...datos, amperajePieza: val })} />
                                        </>
                                    )}
                                    {datos.categoriaPiezaNueva === 'Aceite' && (
                                        <>
                                            {!datos.esFaltante && <TextInput label="Marca" size="xs" placeholder="Ej: Motul, PDV" value={datos.marcaPieza} onChange={(e) => setDatos({ ...datos, marcaPieza: e.target.value })} />}
                                            <TextInput label="Viscosidad" size="xs" placeholder="Ej: 15W-40" value={datos.medidaPieza} onChange={(e) => setDatos({ ...datos, medidaPieza: e.target.value })} />
                                        </>
                                    )}
                                </Group>
                            </Box>
                        )}

                        {/* SERIALES Y FUNGIBLES DAÑADOS */}
                        {datos.nombrePieza && !datos.esFaltante && clasificacionEfectiva === 'Serializado' && (
                            <Box mt="xs" p="xs" style={{ border: '1px dashed #74c0fc', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.7)' }}>
                                <Text size="xs" fw={700} mb={4} c="dark.6">
                                    Ingrese los seriales y marque (<span style={{color: 'red'}}>☑️</span>) los que presentan la falla:
                                </Text>
                                <Stack gap={4}>
                                    {datos.serialesNuevos.map((serial, idx) => (
                                        <Group key={idx} wrap="nowrap" align="center">
                                            <Checkbox 
                                                color="red" size="sm"
                                                checked={datos.serialesFallaIndices.includes(idx)}
                                                onChange={(e) => {
                                                    const isChecked = e.currentTarget.checked;
                                                    setDatos(prev => ({
                                                        ...prev,
                                                        serialesFallaIndices: isChecked 
                                                            ? [...prev.serialesFallaIndices, idx] 
                                                            : prev.serialesFallaIndices.filter(i => i !== idx)
                                                    }));
                                                }}
                                            />
                                            <TextInput 
                                                placeholder={`Serial Unidad #${idx + 1}`} size="xs" style={{ flex: 1 }}
                                                value={serial}
                                                onChange={(e) => {
                                                    const nuevos = [...datos.serialesNuevos];
                                                    nuevos[idx] = e.target.value.toUpperCase();
                                                    setDatos({...datos, serialesNuevos: nuevos});
                                                }}
                                            />
                                        </Group>
                                    ))}
                                </Stack>
                            </Box>
                        )}

                        {datos.nombrePieza && !datos.esFaltante && clasificacionEfectiva === 'Fungible' && datos.cantidadSlots > 1 && (
                            <Box mt="xs" p="xs" style={{ border: '1px dashed #74c0fc', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.7)' }}>
                                <Group justify="space-between" align="center">
                                    <Text size="xs" fw={700} c="dark.6">¿Cuántas de estas {datos.cantidadSlots} unidades están fallando?</Text>
                                    <NumberInput 
                                        size="xs" w={100} min={1} max={datos.cantidadSlots}
                                        value={datos.cantidadFallaFungible}
                                        onChange={(val) => setDatos({ ...datos, cantidadFallaFungible: val })}
                                    />
                                </Group>
                            </Box>
                        )}
                    </Stack>
                </Paper>

                <Group justify="flex-end" mt="md">
                    <Button variant="subtle" color="gray" onClick={onClose}>Cancelar</Button>
                    <Button 
                        color="blue.7" 
                        leftSection={<IconCheck size={18} />} 
                        onClick={handleSubmit}
                        loading={loading}
                    >
                        GUARDAR Y VINCULAR
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}