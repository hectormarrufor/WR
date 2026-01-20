import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Modal, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import calcularHoras from "@/app/helpers/calcularHoras";
import { notifications } from "@mantine/notifications";
import { DateInput, TimeInput } from "@mantine/dates";
import '@mantine/dates/styles.css';
import { useAuth } from "@/hooks/useAuth";



export default function ModalCrearHora({ opened, onClose, onCreated, empleadoId }) {
    const router = useRouter?.() ?? null;
    const { userId } = useAuth();

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const form = useForm({
        initialValues: {
            fecha: new Date(),
            horaInicio: "",
            horaFin: "",
            observaciones: "",
        },
    });





    // calcular horas en decimal (por ejemplo 1.5)
    const horas = calcularHoras(form.values.horaInicio, form.values.horaFin);



    const handleSubmit = async () => {

        const payload = {
            ...form.values,
            horas,
            origen: "manual",
            creadorId: userId
        };


        setSubmitting(true);
        try {
            // Ajusta la ruta según tu API
            const res = await fetch(`/api/rrhh/empleados/${empleadoId}/horasTrabajadas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || "Error al crear hora");
            }
            notifications.show({
                title: "Hora creada exitosamente",
                color: "green",
            });
            onCreated();
            onClose();
        } catch (err) {
            console.error(err);
            notifications.show({
                title: "Error al crear hora",
                message: err.message,
                color: "red",
            });

        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Modal
            opened={opened}
            centered
            onClose={onClose}
            title="Crear hora para empleado"
            size="lg"
        >

            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>

                    <DateInput
                        label="Fecha"
                        valueFormat="DD/MM/YYYY"
                        {...form.getInputProps("fecha")}
                    />


                    <TimeInput
                        label="Hora inicio"
                        {...form.getInputProps("horaInicio")}
                    />

                    <TimeInput
                        label="Hora fin"
                        {...form.getInputProps("horaFin")}
                    />
                <Textarea
                    label="Observaciones"
                    mt={12}
                    minRows={3}
                    {...form.getInputProps("observaciones")}
                ></Textarea>

                    <TextInput disabled label="Horas calculadas" mt={12} value={horas} />

        
                <Box mt={20} display="flex" justifyContent="flex-end">
                    <Button  onClick={onClose} disabled={submitting} style={{ marginRight: 10 }}>
                        Cancelar
                    </Button>
                    <Button type="submit" loading={submitting}>
                        {submitting ? "Creando..." : "Crear hora"}
                    </Button>
                </Box>
            </Box>
                    
                

                {error && (
                    <div style={{ marginTop: 12, color: "white", background: "#d9534f", padding: 8, borderRadius: 6 }}>
                        {error}
                    </div>
                )}
        
        </Modal>
    );
}