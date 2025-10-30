'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from '@mantine/form';
import {
    Paper, Title, TextInput, MultiSelect, Box, Button,
    LoadingOverlay, Alert, Group, Text, Collapse
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import AtributoConstructor from '../../components/AtributoConstructor';
import BackButton from '@/app/components/BackButton';
import { transformPayloadToFormValues } from '../../grupos/[id]/editar/page';

/**
 * Genera acrónimo de 3 letras en mayúsculas a partir del nombre.
 */
function generarAcronimo(nombre = '') {
    const letters = (nombre || '')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 3);
    return (letters + 'XXX').slice(0, 3);
}

/**
 * Convierte la respuesta de la API (objeto definicion) al formato que AtributoConstructor espera:
 * un array de atributos con campos temporales (key, id, dataType, etc).
 * Esta transformación reutiliza la lógica que usas para Grupos.
 */
function transformDefinitionObjectToFormArray(defObj = {}) {
    if (!defObj || Object.keys(defObj).length === 0) return [];
    return Object.keys(defObj).map((k) => {
        const attr = defObj[k];
        const out = {
            id: k,
            key: `attr_${Math.random().toString(36).slice(2, 9)}`,
            nombre: attr.nombre ?? '',
            dataType: attr.dataType ?? 'string',
            required: !!attr.required,
            // copia otras props que uses en tus atributos
            ...attr
        };
        // si es objeto con definicion anidada
        if (attr.definicion && typeof attr.definicion === 'object') {
            out.definicion = transformDefinitionObjectToFormArray(attr.definicion);
        }
        // si define un subgrupo (modo define), mantenemos la estructura esperada por tu backend
        if (attr.mode === 'define' && attr.subGrupo) {
            // subGrupo en payload de grupo viene dentro del atributo; mantenemos la referencia tempKey
            out.mode = 'define';
            out.subGrupo = {
                key: `sub_${Math.random().toString(36).slice(2, 9)}`,
                nombre: attr.subGrupo.nombre ?? '',
                definicion: transformDefinitionObjectToFormArray(attr.subGrupo.definicion ?? {})
            };
        } else if (attr.refId) {
            out.mode = 'select';
        }
        return out;
    });
}

/**
 * Fusiona varias definiciones (objetos) en un único objeto.
 * Último en la lista sobrescribe claves en conflicto (misma semántica que ya tenías).
 */
function mergeDefinitionObjects(listOfDefs = []) {
    return listOfDefs.reduce((acc, d) => ({ ...acc, ...(d || {}) }), {});
}

/**
 * Transforma los valores del form (definicion como array) al objeto que espera el backend:
 * { nombre, acronimo, definicion: { id: attrObj, ... }, gruposBaseIds: [...] , subCategorias: [...] }
 *
 * Mantiene la lógica de tempKey/refId para subcategorias inline.
 */
function transformFormValuesToPayload(values) {
    const result = {
        nombre: values.nombre,
        acronimo: values.acronimo,
        definicion: {},
        subCategorias: [],
        gruposBaseIds: (values.gruposBaseIds || []).map((v) => parseInt(v, 10))
    };

    function processArray(arr) {
        if (!Array.isArray(arr)) return {};
        const obj = {};
        for (const item of arr) {
            const id = item.id || `k_${Math.random().toString(36).slice(2, 9)}`;
            const copy = { ...item };
            // quitar props UI que no deben ir al backend
            delete copy.key;
            delete copy.id;
            // si tiene definicion anidada, procesarla recursivamente
            if (Array.isArray(item.definicion)) {
                copy.definicion = processArray(item.definicion);
            }
            // si es subGrupo definido inline, convertir a subCategoria payload y marcar tempKey
            if (item.mode === 'define' && item.subGrupo) {
                const sub = {
                    nombre: item.subGrupo.nombre || '',
                    definicion: processArray(item.subGrupo.definicion || [])
                };
                // tempKey para relacionar en backend como en el flujo de grupos
                const tempKey = item.subGrupo.key || `temp_${Math.random().toString(36).slice(2, 9)}`;
                copy.tempKey = tempKey;
                result.subCategorias.push({ tempKey, nombre: sub.nombre, definicion: sub.definicion });
            }
            obj[id] = copy;
        }
        return obj;
    }

    result.definicion = processArray(values.definicion || []);
    return result;
}

export default function CrearCategoriaPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [availableGroups, setAvailableGroups] = useState([]); // { value, label, definicion }

    const form = useForm({
        initialValues: {
            nombre: '',
            acronimo: '',
            definicion: [], // AtributoConstructor trabaja con array
            gruposBaseIds: [] // array de strings por MultiSelect
        },
        validate: {
            nombre: (v) => (v && v.trim().length > 2 ? null : 'El nombre debe tener al menos 3 caracteres'),
            acronimo: (v) => (v && v.length === 3 ? null : 'Acrónimo inválido')
        }
    });

    useEffect(() => {
        // Cargar lista de grupos para MultiSelect
        async function loadGroups() {
            setLoading(true);
            try {
                const res = await fetch('/api/gestionMantenimiento/grupos');
                if (!res.ok) throw new Error('No se pudieron cargar los grupos');
                const data = await res.json();
                // Guardamos la definicion original en cada opción para poder fusionarlas luego
                const opts = (data || []).map(g => ({
                    value: String(g.id),
                    label: g.nombre,
                    definicion: g.definicion || {}
                }));
                setAvailableGroups(opts);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        loadGroups();
    }, []);

    // Sincronizar acrónimo con el nombre
    useEffect(() => {
        const nombre = form.values.nombre || '';
        const acr = generarAcronimo(nombre);
        if (form.values.acronimo !== acr) form.setFieldValue('acronimo', acr);
    }, [form.values.nombre]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        let mounted = true;
        const ids = form.values.gruposBaseIds || [];

        if (!ids || ids.length === 0) {
            if ((form.values.definicion || []).length > 0) form.setFieldValue('definicion', []);
            return;
        }

        (async () => {
            try {
                // 1) Fetch detallado de cada grupo seleccionado
                const fetched = await Promise.all(ids.map(async (gid) => {
                    try {
                        const res = await fetch(`/api/gestionMantenimiento/grupos/${gid}`);
                        if (!res.ok) return { id: gid, definicion: {}, nombre: '' };
                        const json = await res.json();
                        // ajustar si tu API devuelve envelope (ej.: json.grupo)
                        return { id: gid, definicion: json.definicion || {}, nombre: json.nombre || '' };
                    } catch (err) {
                        console.error('Error fetching group', gid, err);
                        return { id: gid, definicion: {}, nombre: '' };
                    }
                }));

                if (!mounted) return;

                // 2) Obtener lista de objetos definicion para fusionar
                const defs = fetched.map(f => f.definicion || {});

                // 3) Fusionar objetos de definicion (clave -> atributo)
                const mergedObj = mergeDefinitionObjects(defs);

                // 4) Detectar refId que necesiten expandirse (atributos tipo grupo sin subGrupo)
                const refIdsToFetch = [];
                for (const [, attr] of Object.entries(mergedObj)) {
                    if (attr && attr.dataType === 'grupo' && attr.refId && !attr.subGrupo) {
                        if (!refIdsToFetch.includes(attr.refId)) refIdsToFetch.push(attr.refId);
                    }
                }

                // 5) Fetchear grupos referenciados (si hay)
                const fetchedByRefId = {};
                if (refIdsToFetch.length) {
                    const refs = await Promise.all(refIdsToFetch.map(async (rid) => {
                        try {
                            const r = await fetch(`/api/gestionMantenimiento/grupos/${rid}`);
                            if (!r.ok) return { id: rid, definicion: {}, nombre: '' };
                            const j = await r.json();
                            return { id: rid, definicion: j.definicion || {}, nombre: j.nombre || '' };
                        } catch (err) {
                            console.error('Error fetching ref group', rid, err);
                            return { id: rid, definicion: {}, nombre: '' };
                        }
                    }));
                    refs.forEach(r => { fetchedByRefId[r.id] = r; });
                }

                if (!mounted) return;

                // 6) Inyectar subGrupo en mergedObj cuando falte, usando las definiciones fetcheadas
                for (const [k, a] of Object.entries(mergedObj)) {
                    if (a && a.dataType === 'grupo' && a.refId && !a.subGrupo) {
                        const ref = fetchedByRefId[a.refId];
                        if (ref) {
                            mergedObj[k] = {
                                ...a,
                                subGrupo: {
                                    // dejamos la estructura tipo payload que espera transformPayloadToFormValues
                                    id: ref.id ?? a.refId,
                                    nombre: ref.nombre || (`GRUPO_${a.refId}`),
                                    definicion: ref.definicion || {}
                                },
                                mode: 'define'
                            };
                        }
                    }
                }

                if (!mounted) return;

                // 7) Normalizar/finalizar: usar transformPayloadToFormValues para obtener la forma exacta
                //    que usa la edición de grupo (retorna { id, nombre, definicion: [ ... ] })
                const payloadLike = { definicion: mergedObj };
                const transformed = transformPayloadToFormValues(payloadLike);
                const arrayForForm = (transformed && transformed.definicion) ? transformed.definicion : [];

                // 8) Comparar y setear sólo si cambió (evita loops)
                const cur = form.values.definicion || [];
                if (JSON.stringify(cur) !== JSON.stringify(arrayForForm)) {
                    form.setFieldValue('definicion', arrayForForm);
                }
            } catch (err) {
                console.error('Error procesando definiciones de grupos seleccionados:', err);
                notifications.show({ title: 'Error', message: 'No se pudieron combinar las definiciones de los grupos', color: 'red' });
            }
        })();

        return () => { mounted = false; };
    }, [JSON.stringify(form.values.gruposBaseIds)]);



    const handleSubmit = async () => {
        setError(null);
        if (!form.values.nombre || (form.values.gruposBaseIds || []).length === 0) {
            notifications.show({ title: 'Campos incompletos', message: 'Nombre y al menos un grupo base son requeridos', color: 'yellow' });
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = transformFormValuesToPayload(form.values);
            const res = await fetch('/api/gestionMantenimiento/categorias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Error creando categoría');
            notifications.show({ title: 'Categoría creada', message: `Categoría "${json.categoria?.nombre ?? form.values.nombre}" creada`, color: 'green' });
            router.push('/superuser/flota/categorias');
        } catch (err) {
            console.error('Error creando categoría:', err);
            setError(err.message);
            notifications.show({ title: 'Error', message: err.message, color: 'red' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Paper p={30} mt={30} radius="md" style={{ position: 'relative' }}>
            <LoadingOverlay visible={loading || isSubmitting} overlayProps={{ blur: 2 }} />
            <Group position="apart" mb="xl">
                <Title order={2}>Crear Nueva Categoría</Title>
                <BackButton />
            </Group>

            {error && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" mb="md">
                    {error}
                </Alert>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                <TextInput
                    label="Nombre de la Categoría"
                    placeholder="Ej: CAMIONETA"
                    mb="sm"
                    value={form.values.nombre}
                    onChange={(evt) => form.setFieldValue('nombre', evt.currentTarget.value.toUpperCase())}
                    required
                />

                <TextInput
                    label="Acrónimo (generado)"
                    placeholder="Acrónimo"
                    mb="sm"
                    value={form.values.acronimo}
                    disabled
                />

                <MultiSelect
                    label="Grupos base (selecciona uno o más)"
                    placeholder="Selecciona grupos"
                    data={availableGroups}
                    value={form.values.gruposBaseIds}
                    onChange={(vals) => form.setFieldValue('gruposBaseIds', vals)}
                    searchable
                    mb="md"
                />


                <Collapse in={(form.values.gruposBaseIds || []).length > 0}>
                    <Box mt="md">
                        <Text size="sm" color="dimmed" mb="md">
                            Se han cargado las propiedades de los grupos seleccionados. Puedes modificarlas o agregar nuevas.
                        </Text>

                        <AtributoConstructor form={form} availableGroups={availableGroups} from="Categoria" />
                    </Box>
                </Collapse>

                <Box mt="xl">
                    <Button fullWidth type="submit">Crear Categoría</Button>
                </Box>
            </form>
        </Paper>
    );
}