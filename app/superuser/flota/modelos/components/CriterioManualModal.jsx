'use client';

import { useState } from 'react';
import { Modal, Select, TextInput, NumberInput, Button, Stack, Group, Text, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconInfoCircle, IconRuler, IconDroplet, IconBolt, IconEngine } from '@tabler/icons-react';

export default function CriterioManualModal({ opened, onClose, onSuccess }) {
    
    // Categorías permitidas para definición manual (EXCLUYENDO FILTROS)
    const categoriasPermitidas = [
        { value: 'aceite', label: 'Aceite / Lubricante', icon: IconDroplet },
        { value: 'neumatico', label: 'Neumático', icon: IconRuler },
        { value: 'bateria', label: 'Batería', icon: IconBolt },
        { value: 'correa', label: 'Correa', icon: IconEngine },
        { value: 'sensor', label: 'Sensor / Eléctrico', icon: IconBolt },
        { value: 'repuesto', label: 'Repuesto General', icon: IconEngine },
    ];

    const form = useForm({
        initialValues: {
            categoria: '',
            valorCriterio: '', // Aquí va "15W40", "295/80", "6PK2000"
            cantidad: 1
        },
        validate: {
            categoria: (val) => (!val ? 'Seleccione una categoría' : null),
            valorCriterio: (val) => (val.length < 2 ? 'Especifique el criterio técnico' : null),
            cantidad: (val) => (val <= 0 ? 'Cantidad inválida' : null),
        }
    });

    const handleSubmit = (values) => {
        // Construimos el objeto de regla "virtual"
        const nuevaRegla = {
            categoria: values.categoria,
            cantidad: values.cantidad,
            
            // Lógica clave:
            tipoCriterio: 'tecnico', 
            criterioId: values.valorCriterio, // Usamos el valor texto como ID lógico
            
            // Para visualización en la tabla:
            labelOriginal: `${values.valorCriterio} (Criterio Manual)`,
            
            // Esto le dice al backend que guarde en la columna valorCriterio
            isManual: true 
        };

        onSuccess(nuevaRegla);
        form.reset();
        onClose();
    };

    // Helper para labels dinámicos
    const getLabelCriterio = (cat) => {
        switch (cat) {
            case 'aceite': return 'Viscosidad requerida (Ej: 15W-40)';
            case 'neumatico': return 'Medida exacta (Ej: 295/80R22.5)';
            case 'bateria': return 'Grupo BCI / Código (Ej: 24F)';
            case 'correa': return 'Código de Correa (Ej: 6PK2200)';
            default: return 'Especificación Técnica / Código';
        }
    };

    return (
        <Modal opened={opened} centered onClose={onClose} title="Definir Criterio Técnico Manualmente">
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <Alert icon={<IconInfoCircle size={16}/>} color="blue" variant="light">
                        Usa esto para definir reglas generales (Ej: "Este camión usa Aceite 15W40") sin seleccionar una marca específica.
                    </Alert>

                    <Select 
                        label="Categoría del Componente"
                        placeholder="Seleccionar..."
                        data={categoriasPermitidas.map(c => ({ 
                            value: c.value, 
                            label: c.label 
                        }))}
                        required
                        {...form.getInputProps('categoria')}
                    />

                    {form.values.categoria && (
                        <TextInput 
                            label={getLabelCriterio(form.values.categoria)}
                            placeholder="Escriba la especificación..."
                            required
                            {...form.getInputProps('valorCriterio')}
                        />
                    )}

                    <NumberInput 
                        label="Cantidad Requerida"
                        min={0.1}
                        precision={2}
                        step={1}
                        required
                        {...form.getInputProps('cantidad')}
                    />

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">Agregar Regla</Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}