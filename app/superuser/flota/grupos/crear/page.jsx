// app/superuser/flota/grupos/crear/page.js
'use client';
import { useState, useEffect } from 'react';
import { useForm } from '@mantine/form';
import { TextInput, Button, Box, Title, Paper, LoadingOverlay, Alert } from '@mantine/core';
import { useRouter } from 'next/navigation';
import AtributoConstructor from '../../components/AtributoConstructor';
import { IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

function transformFormValuesToPayload(values) {
    function processDefinicion(defArray) {
        if (!defArray || defArray.length === 0) return { definicion: {}, subGrupos: [] };

        const result = { definicion: {}, subGrupos: [] };

        for (const attr of defArray) {
            // Limpiar el atributo para el payload
            const { key, mode, subGrupo, ...restOfAttr } = attr;

            // Si es un objeto, procesar su propia definición recursivamente
            if (attr.dataType === 'object' && attr.definicion) {
                const nestedResult = processDefinicion(attr.definicion);
                restOfAttr.definicion = nestedResult.definicion;
                // Los subgrupos de un objeto anidado se elevan al nivel del padre
                if (nestedResult.subGrupos.length > 0) {
                    result.subGrupos.push(...nestedResult.subGrupos);
                }
            }

            result.definicion[attr.id] = restOfAttr;

            // Si es un grupo anidado definido inline
            if (mode === 'define' && subGrupo) {
                const subGrupoProcessed = processDefinicion(subGrupo.definicion);
                const subGrupoPayload = {
                    tempKey: subGrupo.key,
                    nombre: subGrupo.nombre,
                    ...subGrupoProcessed
                };

                result.definicion[attr.id].tempKey = subGrupo.key;
                result.subGrupos.push(subGrupoPayload);
            }
        }
        return result;
    }

    const processed = processDefinicion(values.definicion);

    return {
        nombre: values.nombre,
        ...processed
    };
}


export default function CrearGrupoPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [availableGroups, setAvailableGroups] = useState([]);

    useEffect(() => {
        const fetchGroups = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/gestionMantenimiento/grupos');
                const data = await res.json();
                if (res.ok) {
                    setAvailableGroups(data);
                } else {
                    throw new Error(data.error || 'No se pudieron cargar los grupos');
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchGroups();
    }, []);

    const form = useForm({
        initialValues: {
            nombre: '',
            definicion: [],
        },
        validate: {
            nombre: (value) => (value.trim().length > 2 ? null : 'El nombre debe tener al menos 3 caracteres'),
        },
    });

    useEffect(() => {
        console.log(form.values);
    }, [form.values]);

    const handleSubmit = async (values) => {
        setLoading(true);
        setError(null);

        const payload = transformFormValuesToPayload(values);
        // const payload = {
        //     "nombre": "VEHICULO",
        //     "definicion": {
        //         "motor": {
        //             "id": "motor",
        //             "label": "Motor",
        //             "dataType": "grupo",
        //             "inputType": "text",
        //             "selectOptions": [],
        //             "defaultValue": "",
        //             "refId": null,
        //             "definicion": [],
        //             "tempKey": "sub_1753538301260"
        //         },
        //         "marca": {
        //             "id": "marca",
        //             "label": "Marca",
        //             "dataType": "string",
        //             "inputType": "text",
        //             "selectOptions": [],
        //             "defaultValue": "",
        //             "refId": null,
        //             "definicion": []
        //         },
        //         "modelo": {
        //             "id": "modelo",
        //             "label": "Modelo",
        //             "dataType": "string",
        //             "inputType": "text",
        //             "selectOptions": [],
        //             "defaultValue": "",
        //             "refId": null,
        //             "definicion": []
        //         },
        //         "placa": {
        //             "id": "placa",
        //             "label": "Placa",
        //             "dataType": "string",
        //             "inputType": "text",
        //             "selectOptions": [],
        //             "defaultValue": "",
        //             "refId": null,
        //             "definicion": []
        //         },
        //         "color": {
        //             "id": "color",
        //             "label": "Color",
        //             "dataType": "string",
        //             "inputType": "select",
        //             "selectOptions": [
        //                 "verde",
        //                 "gris",
        //                 "negro",
        //                 "blanco",
        //                 "naranja",
        //                 "amarillo",
        //                 "azul",
        //                 "rojo",
        //                 "beige"
        //             ],
        //             "defaultValue": "",
        //             "refId": null,
        //             "definicion": []
        //         },
        //         "transmision": {
        //             "id": "transmision",
        //             "label": "Transmision",
        //             "dataType": "grupo",
        //             "inputType": "text",
        //             "selectOptions": [],
        //             "defaultValue": "",
        //             "refId": null,
        //             "definicion": [],
        //             "tempKey": "sub_1753538790995"
        //         }
        //     },
        //     "subGrupos": [
        //         {
        //             "tempKey": "sub_1753538301260",
        //             "nombre": "MOTOR_VEHICULO",
        //             "definicion": {
        //                 "aceite": {
        //                     "id": "aceite",
        //                     "label": "Propiedades de aceite",
        //                     "dataType": "object",
        //                     "inputType": "text",
        //                     "selectOptions": [],
        //                     "defaultValue": "",
        //                     "refId": null,
        //                     "definicion": {
        //                         "litros": {
        //                             "id": "litros",
        //                             "label": "Cantidad de litros",
        //                             "dataType": "number",
        //                             "inputType": "text",
        //                             "selectOptions": [],
        //                             "defaultValue": "",
        //                             "min": "",
        //                             "max": "",
        //                             "refId": null,
        //                             "definicion": []
        //                         },
        //                         "tipo": {
        //                             "id": "tipo",
        //                             "label": "Tipo de aceite",
        //                             "dataType": "string",
        //                             "inputType": "select",
        //                             "selectOptions": [
        //                                 "mineral",
        //                                 "semi-sintetico",
        //                                 "sintetico"
        //                             ],
        //                             "defaultValue": "",
        //                             "refId": null,
        //                             "definicion": []
        //                         },
        //                         "viscosidad": {
        //                             "id": "viscosidad",
        //                             "label": "Viscosidad del aceite",
        //                             "dataType": "string",
        //                             "inputType": "select",
        //                             "selectOptions": [
        //                                 "15w40",
        //                                 "20w50",
        //                                 "10w30",
        //                                 "5w40",
        //                                 "10w40"
        //                             ],
        //                             "defaultValue": "",
        //                             "refId": null,
        //                             "definicion": []
        //                         },
        //                         "cantidadFiltros": {
        //                             "id": "cantidadFiltros",
        //                             "label": "Cantidad de filtros de aceite",
        //                             "dataType": "number",
        //                             "inputType": "text",
        //                             "selectOptions": [],
        //                             "defaultValue": "",
        //                             "min": 1,
        //                             "max": 2,
        //                             "refId": null,
        //                             "definicion": []
        //                         }
        //                     }
        //                 },
        //                 "cantidadCorreas": {
        //                     "id": "cantidadCorreas",
        //                     "label": "Cantidad de correas",
        //                     "dataType": "number",
        //                     "inputType": "text",
        //                     "selectOptions": [],
        //                     "defaultValue": "",
        //                     "refId": null,
        //                     "definicion": []
        //                 }
        //             },
        //             "subGrupos": []
        //         },
        //         {
        //             "tempKey": "sub_1753538790995",
        //             "nombre": "TRANSMISION_VEHICULO",
        //             "definicion": {
        //                 "nroMarchas": {
        //                     "id": "nroMarchas",
        //                     "label": "Numero de marchas",
        //                     "dataType": "number",
        //                     "inputType": "text",
        //                     "selectOptions": [],
        //                     "defaultValue": "",
        //                     "refId": null,
        //                     "definicion": []
        //                 },
        //                 "tipo": {
        //                     "id": "tipo",
        //                     "label": "Tipo",
        //                     "dataType": "string",
        //                     "inputType": "select",
        //                     "selectOptions": [
        //                         "sincronica",
        //                         "automatica"
        //                     ],
        //                     "defaultValue": "",
        //                     "refId": null,
        //                     "definicion": []
        //                 }
        //             },
        //             "subGrupos": []
        //         }
        //     ]

        // }
        console.log("Payload a enviar:", JSON.stringify(payload, null, 2));

        try {
            const response = await fetch('/api/gestionMantenimiento/grupos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Algo salió mal');
            notifications.show({
                title: 'Grupo creado'
            });
            router.push('/superuser/flota/grupos');
        } catch (err) {
            setError(err.message);
            notifications.show({ title: 'Error al crear grupo', message: err.message, color: 'red' });
            console.error('Error al crear el grupo:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
            <LoadingOverlay visible={loading} />
            <Title order={2} mb="xl">Crear Nuevo Grupo</Title>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <TextInput
                    label="Nombre del Grupo Principal"
                    placeholder="Ej: VEHICULO"
                    value={form.values.nombre}
                    onChange={(event) =>
                        form.setFieldValue('nombre', event.currentTarget.value.toUpperCase())
                    }

                />
                <AtributoConstructor form={form} availableGroups={availableGroups} from="Grupo" />
                {error && (<Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" mt="xl">{error}</Alert>)}
                <Button type="submit" fullWidth mt="xl">
                    Crear Grupo
                </Button>
            </form>
        </Paper>
    );
}