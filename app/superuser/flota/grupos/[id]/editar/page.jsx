// app/superuser/flota/grupos/[id]/editar/page.jsx
'use client';
import { useState, useEffect, use } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, Button, Box, Title, Paper, LoadingOverlay, Alert } from '@mantine/core';
import { useRouter, useParams } from 'next/navigation';
import { IconAlertCircle, IconDeviceFloppy } from '@tabler/icons-react';

// --- Función Helper para transformar el JSON de la API al estado del formulario ---
export function transformPayloadToFormValues(payload) {
    if (!payload) return null;
    console.log("datos de payload: ", payload);

    function processDefinition(definicion) {
        if (!definicion || Object.keys(definicion).length === 0) return [];
        
        return Object.values(definicion).map(attr => {
            const newAttr = { ...attr, key: `attr_${Math.random()}` }; // Clave aleatoria para Mantine
            
            if(attr.dataType === 'grupo' && attr.subGrupo) {
                newAttr.mode = 'define';
                const subGrupoFormValues = transformPayloadToFormValues(attr.subGrupo);
                newAttr.subGrupo = {
                    key: `sub_${Math.random()}`,
                    nombre: subGrupoFormValues.nombre,
                    definicion: subGrupoFormValues.definicion,
                };
            } else if (attr.dataType === 'grupo' && attr.refId) {
                newAttr.mode = 'select';
            }

            if(attr.dataType === 'object' && attr.definicion) {
                newAttr.definicion = processDefinition(attr.definicion);
            }

            return newAttr;
        });
    }

    return {
        id: payload.id,
        nombre: payload.nombre,
        definicion: processDefinition(payload.definicion),
    };
}


export default function EditarGrupoPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [availableGroups, setAvailableGroups] = useState([]);
    
    const form = useForm({
        initialValues: {
            nombre: '',
            definicion: [], 
        },
    });

    useEffect(() => {
        const fetchGrupoData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                // Obtener grupos para el selector de existentes
                const groupsRes = await fetch('/api/gestionMantenimiento/grupos');
                const groupsData = await groupsRes.json();
                if(groupsRes.ok) setAvailableGroups(groupsData);

                // Obtener los datos del grupo específico a editar
                const grupoRes = await fetch(`/api/gestionMantenimiento/grupos/${id}`);
                const grupoData = await grupoRes.json();
                if (!grupoRes.ok) throw new Error(grupoData.error || 'No se pudo cargar el grupo');
                console.log("GrupoData: ", grupoData);
                
                // Transformar y poblar el formulario
                const formValues = transformPayloadToFormValues(grupoData);
                form.setValues(formValues);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchGrupoData();
    }, [id]);

    useEffect(() => {
        console.log(form.values);
        console.log(availableGroups);
    }, [form.values, availableGroups]); // Para depurar los valores del formulario y grupos disponibles

    // Usamos la misma función de transformación que en la página de creación
    function transformFormValuesToPayload(values) {
        function processDefinicion(defArray) {
            if (!defArray || defArray.length === 0) return { definicion: {}, subGrupos: [] };
            const result = { definicion: {}, subGrupos: [] };
            for (const attr of defArray) {
                const { key, mode, subGrupo, ...restOfAttr } = attr;
                if (attr.dataType === 'object' && attr.definicion) {
                    const nestedResult = processDefinicion(attr.definicion);
                    restOfAttr.definicion = nestedResult.definicion;
                    if(nestedResult.subGrupos.length > 0) result.subGrupos.push(...nestedResult.subGrupos);
                }
                result.definicion[attr.id] = restOfAttr;
                if (mode === 'define' && subGrupo) {
                    const subGrupoProcessed = processDefinicion(subGrupo.definicion);
                    const subGrupoPayload = { tempKey: subGrupo.key, nombre: subGrupo.nombre, ...subGrupoProcessed };
                    result.definicion[attr.id].tempKey = subGrupo.key;
                    result.subGrupos.push(subGrupoPayload);
                }
            }
            return result;
        }
        const processed = processDefinicion(values.definicion);
        return { id: values.id, nombre: values.nombre, ...processed };
    }

    const handleSubmit = async (values) => {
        setLoading(true);
        setError(null);
        
        const payload = transformFormValuesToPayload(values);

        console.log("Payload de actualización:", JSON.stringify(payload, null, 2));
        // setLoading(false);
        // return; // Quitar esta línea para habilitar el envío real

        try {
            const response = await fetch(`/api/gestionMantenimiento/grupos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Algo salió mal');
            router.push('/superuser/flota/grupos');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper   shadow="md" p={30} mt={30} radius="md">
            <Title order={2} mb="xl">Editando Grupo: {form.values.nombre}</Title>
            <LoadingOverlay visible={loading} />
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <TextInput
                    label="Nombre del Grupo Principal"
                    required
                    {...form.getInputProps('nombre')}
                />
                {error && (<Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" mt="xl">{error}</Alert>)}
                <Button type="submit" fullWidth mt="xl" leftSection={<IconDeviceFloppy size={14}/>}>
                    Guardar Cambios
                </Button>
            </form>
        </Paper>
    );
}