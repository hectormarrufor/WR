"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    TextInput, NumberInput, Button, Paper, Title, Center,
    SimpleGrid, Box, Divider, Grid, Text, Loader, Group, Badge, Select, Tooltip, Alert, Slider,
    Accordion,
    Table,
    Timeline,
    Switch,
    Stack,
    ThemeIcon,
    ActionIcon,
    Card
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
    IconCalculator, IconCoin, IconTruck, IconRoute, IconInfoCircle,
    IconMapPin, IconChartLine, IconSettings, IconSteeringWheel, IconAlertTriangle, IconDashboard,
    IconFileInvoice, IconPlus, IconTrash
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

import GoogleRouteMap from "./GoogleRouteMap";
import ODTSelectableGrid from "../../odt/ODTSelectableGrid";
import { SelectClienteConCreacion } from "../../contratos/SelectClienteConCreacion";

// 🔥 PIEZA 1: Función robusta para imágenes en PDF. 
// Convierte cualquier formato a JPEG plano para que jsPDF no lo deje en blanco.
const getBase64ImageFromUrl = (url) => {
    return new Promise((resolve) => {
        if (!url) {
            resolve(null);
            return;
        }
        const img = new Image();
        img.crossOrigin = "Anonymous"; 
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
        img.onerror = (err) => {
            console.warn("No se pudo cargar la imagen para el PDF:", url, err);
            resolve(null);
        };
        img.src = url;
    });
};

export default function FleteCreator() {
    const router = useRouter();
    const { userId } = useAuth();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [generandoPDF, setGenerandoPDF] = useState(false);

    const [empleados, setEmpleados] = useState([]);
    const [activos, setActivos] = useState([]);
    const [configPrecios, setConfigPrecios] = useState({ peaje: 1900, gasoil: 0.5 });
    const [bcv, setBcv] = useState(null);
    const [configGlobal, setConfigGlobal] = useState(null);
    const [rutaData, setRutaData] = useState(null);

    const [expandedSections, setExpandedSections] = useState({
        gasoil: false,
        nomina: false,
        viaticos: false,
        posesion: false,
        overhead: false,
        mantenimiento: false,
        riesgo: false,
        peajes: false,
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const form = useForm({
        initialValues: {
            clienteId: "",
            fechaSalida: new Date(),
            nroFlete: "",
            jornadaMaxima: 12,
            viaticosManuales: 0,
            horaSalida: "06:00",
            comidaPrimerDia: false,
            
            // 🔥 ESTRUCTURA ROBUSTA DE CONVOY 🔥
            chutos: [{ id: Date.now().toString(), activoId: "", choferId: "", ayudanteId: "" }],
            remolques: [], // Ej: { id: "123", tipo: "dadica", activoId: "", pesoTercero: 0, retorna: true }
            
            origen: "Base DADICA - Tía Juana",
            destino: "Circuito Logístico",
            distanciaKm: 0, 
            waypoints: [],
            tramos: [],
            cantidadPeajes: 0,
            calidadRepuestos: 50,
            tipoCarga: "general",
            margenGanancia: 30,
        },
        validate: {
            clienteId: (val) => (val ? null : "Seleccione un cliente"),
            fechaSalida: (val) => (val ? null : "Fecha requerida"),
            distanciaKm: (val) => (val > 0 ? null : "Debe tener una distancia válida"),
        },
    });

    const [valorVisualMargen, setValorVisualMargen] = useState(form.values.margenGanancia);
    const [valorVisualRepuestos, setValorVisualRepuestos] = useState(form.values.calidadRepuestos);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [resEmp, resAct, resPrecios, resBcv, resConfig, resFletes] = await Promise.all([
                    fetch(`/api/rrhh/empleados`).then((r) => r.json()),
                    fetch(`/api/gestionMantenimiento/activos`).then((r) => r.json()),
                    fetch(`/api/configuracion/precios`).then((r) => r.json()),
                    fetch(`/api/bcv`).then((r) => r.json()),
                    fetch(`/api/configuracion/general`).then((r) => r.json()),
                    fetch(`/api/fletes`).then((r) => r.json()).catch(() => null),
                ]);

                setEmpleados(resEmp || []);
                setActivos(resAct.success ? resAct.data : []);
                setBcv(parseFloat(resBcv?.precio || resBcv?.valor || resBcv?.tasa || 1));
                setConfigGlobal(resConfig);

                if (resConfig) {
                    setConfigPrecios({
                        peaje: parseFloat(resConfig.precioPeajePromedio || 20),
                        gasoil: parseFloat(resConfig.precioGasoil || 0.5),
                    });
                }

                if (resFletes) {
                    const fletesList = Array.isArray(resFletes) ? resFletes : (resFletes.data || []);
                    let maxNum = 0;
                    fletesList.forEach(f => {
                        if (f.nroFlete && f.nroFlete.toUpperCase().startsWith('FL-')) {
                            const num = parseInt(f.nroFlete.substring(3), 10);
                            if (!isNaN(num) && num > maxNum) maxNum = num;
                        }
                    });
                    const nextNum = String(maxNum + 1).padStart(4, '0');
                    form.setFieldValue("nroFlete", `FL-${nextNum}`);
                }

                setLoading(false);
            } catch (error) {
                notifications.show({ title: "Error", message: "No se pudieron cargar los datos", color: "red" });
                setLoading(false);
            }
        };
        cargarDatos();
    }, []);

    const activosMapeados = useMemo(() => {
        return activos.map((v) => {
            let nombreDisplay = v.codigoInterno;
            let placa = v.vehiculoInstancia?.placa || v.remolqueInstancia?.placa || "";

            return {
                id: v.id.toString(), // Forzado a String para compatibilidad exacta con ODTSelectableGrid
                nombre: `${nombreDisplay} (${placa})`,
                subtitulo: `Rendimiento BD: ${v.consumoCombustibleLPorKm || 0.35} L/Km`,
                imagen: v.imagen,
                tipo: v.tipoActivo,
                tara: v.tara || v.remolqueInstancia?.plantilla?.peso || v.vehiculoInstancia?.plantilla?.peso || null,
                capacidad: v.capacidadTonelajeMax || v.remolqueInstancia?.plantilla?.capacidadCarga || v.vehiculoInstancia?.plantilla?.capacidadArrastre || null,
                raw: v
            };
        });
    }, [activos]);

    const { data: estimacion, isLoading: calcLoading } = useQuery({
        queryKey: [
            "calcular-flete-puro",
            JSON.stringify(form.values.chutos),
            JSON.stringify(form.values.remolques),
            rutaData?.distanciaTotal,
            JSON.stringify(form.values.tramos),
            form.values.cantidadPeajes,
            form.values.calidadRepuestos,
            form.values.fechaSalida instanceof Date ? form.values.fechaSalida.toISOString() : form.values.fechaSalida,
            form.values.jornadaMaxima,
            form.values.horaSalida,
            form.values.comidaPrimerDia,
            form.values.viaticosManuales,
            form.values.margenGanancia,
            form.values.tipoCarga
        ],
        queryFn: async () => {
            if (!form.values.chutos.length || !form.values.chutos[0].activoId || !rutaData?.distanciaTotal || !configGlobal) return null;

            const tonelajePromedio = form.values.tramos.length > 0
                ? form.values.tramos.reduce((acc, t) => acc + t.tonelaje, 0) / form.values.tramos.length
                : 0;

            const response = await fetch('/api/fletes/estimar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipoCotizacion: 'flete',
                    chutos: form.values.chutos,
                    remolques: form.values.remolques,
                    distanciaKm: rutaData.distanciaTotal,
                    fechaSalida: form.values.fechaSalida,
                    jornadaMaxima: parseInt(form.values.jornadaMaxima),
                    tonelaje: tonelajePromedio, // Variable corregida para evitar error de scope estricto
                    horaSalida: form.values.horaSalida,
                    comidaPrimerDia: form.values.comidaPrimerDia,
                    viaticosManuales: form.values.viaticosManuales,
                    tramos: form.values.tramos,
                    cantidadPeajes: form.values.cantidadPeajes,
                    precioPeajeBs: configPrecios.peaje,
                    bcv: bcv || 1,
                    precioGasoilUsd: configPrecios.gasoil,
                    calidadRepuestos: form.values.calidadRepuestos,
                    porcentajeGanancia: parseFloat(form.values.margenGanancia) / 100,

                    sueldoDiarioChofer: parseFloat(configGlobal.sueldoDiarioChofer || 25),
                    sueldoDiarioAyudante: parseFloat(configGlobal.sueldoDiarioAyudante || 15),
                    viaticoAlimentacionDia: parseFloat(configGlobal.viaticoAlimentacionDia || 15),
                    viaticoHotelNoche: parseFloat(configGlobal.viaticoHotelNoche || 20),

                    valorFlotaActiva: parseFloat(configGlobal.valorFlotaActiva || 1),
                    gastosFijosAnualesTotales: parseFloat(configGlobal.gastosFijosAnualesTotales || 0),
                    horasTotalesFlota: parseInt(configGlobal.horasTotalesFlota || 1),
                    costoAdministrativoPorHora: parseFloat(configGlobal.costoAdministrativoPorHora || 0),
                    tipoCarga: form.values.tipoCarga,
                }),
            });

            if (!response.ok) throw new Error('Error calculando la estimación del Convoy');
            return response.json();
        },
        enabled: !!form.values.chutos[0]?.activoId && !!rutaData?.distanciaTotal,
    });

    // 🔥 PREVENCIÓN DE BUCLE INFINITO 🔥
    // Se extrae la reactividad directa de form.values para evitar que el render loop destruya la pila de llamadas
    const handleRouteCalculated = useCallback((data) => {
        const currentValues = form.getValues(); // Leemos el estado SIN atar el callback al render

        setRutaData((prev) => {
            // Salida temprana estricta
            if (prev?.distanciaTotal === data.distanciaTotal && JSON.stringify(prev?.waypoints) === JSON.stringify(data.waypoints)) {
                return prev;
            }
            return data;
        });

        const distanciaCalculada = parseFloat(data.distanciaTotal) || 0;
        
        if (currentValues.distanciaKm !== distanciaCalculada) {
            form.setFieldValue("distanciaKm", distanciaCalculada);
        }
        
        if (JSON.stringify(currentValues.waypoints) !== JSON.stringify(data.waypoints)) {
            form.setFieldValue("waypoints", data.waypoints);
        }
        
        if (JSON.stringify(currentValues.tramos) !== JSON.stringify(data.tramos)) {
            form.setFieldValue("tramos", data.tramos || []);
            
            if (data.tramos && data.tramos.length > 0) {
                const o = data.tramos[0].origen.split(',')[0];
                const d = data.tramos[data.tramos.length - 1].destino.split(',')[0];
                if (currentValues.origen !== o) form.setFieldValue("origen", o);
                if (currentValues.destino !== d) form.setFieldValue("destino", d);
            }
        }

        if (distanciaCalculada > 0) {
            let nuevoMargen = Math.round((2000 / (distanciaCalculada + 50)) + 28);
            if (nuevoMargen > 1000) nuevoMargen = 1000;
            if (nuevoMargen < 0) nuevoMargen = 0;

            setValorVisualMargen((prev) => prev !== nuevoMargen ? nuevoMargen : prev);
            if (currentValues.margenGanancia !== nuevoMargen) {
                form.setFieldValue("margenGanancia", nuevoMargen);
            }
        }
    }, [form]); // Solo depende de la instancia del form (que es inmutable en Mantine v7)

    const handleGenerarCotizacionPDF = async () => {
        if (!estimacion) {
            notifications.show({ title: "Atención", message: "Debe trazar la ruta para generar la cotización.", color: "yellow" });
            return;
        }

        setGenerandoPDF(true);
        notifications.show({ id: 'pdf-load', title: "Generando PDF", message: "Procesando imágenes y membrete...", loading: true, autoClose: false });

        try {
            const [{ default: jsPDF }, { default: autoTable }, { default: html2canvas }] = await Promise.all([
                import("jspdf"),
                import("jspdf-autotable"),
                import("html2canvas")
            ]);

            const doc = new jsPDF();

            const cantChutos = form.values.chutos.length;
            const cantRemolques = form.values.remolques.length;
            const cantChoferes = form.values.chutos.filter(c => c.choferId).length;
            const cantAyudantes = form.values.chutos.filter(c => c.ayudanteId).length;

            const logoBaseUrl = '/logo.png'; 
            const blobBaseUrl = (process.env.NEXT_PUBLIC_BLOB_BASE_URL || "").replace(/\/$/, '');

            const logoB64 = await getBase64ImageFromUrl(logoBaseUrl);
            
            const primerChutoId = form.values.chutos[0]?.activoId;
            const chutoData = activosMapeados.find(a => a.id.toString() === primerChutoId);
            const chutoImgUrl = chutoData?.imagen ? `${blobBaseUrl}/${chutoData.imagen}` : null;
            const chutoImgB64 = chutoImgUrl ? await getBase64ImageFromUrl(chutoImgUrl) : null;

            // --- PÁGINA 1 ---
            const headerY = 10;
            const headerHeight = 35;
            const xMembreteText = 65;
            const pageWidth = doc.internal.pageSize.getWidth();

            doc.setDrawColor(40, 40, 40); 
            doc.setLineWidth(0.5);
            doc.rect(14, headerY, pageWidth - 28, headerHeight, 'S'); 

            if (logoB64) {
                doc.addImage(logoB64, 'JPEG', 18, headerY + 5, 40, 25); 
            }

            doc.setFontSize(16);
            doc.setTextColor(40, 40, 40);
            doc.setFont("helvetica", "bold");
            doc.text("Transporte Dadica", xMembreteText, headerY + 12);

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.setFont("helvetica", "normal");
            doc.text("RIF: J-29553660-7", xMembreteText, headerY + 18);
            doc.text("Carrt. F con AV. 32, Tia Juana, Estado Zulia", xMembreteText, headerY + 23);

            doc.setFontSize(14);
            doc.setTextColor(250, 176, 5); 
            doc.setFont("helvetica", "bold");
            doc.text("COTIZACION DE FLETE CONVOY", xMembreteText, headerY + 31);

            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.setFont("helvetica", "normal");
            doc.text(`Fecha Estimada: ${new Date(form.values.fechaSalida).toLocaleDateString('es-VE')}`, 14, headerY + headerHeight + 10);

            doc.setFontSize(14);
            doc.setTextColor(250, 176, 5);
            doc.setFont("helvetica", "bold");
            doc.text("1. Itinerario Logístico del Convoy", 14, headerY + headerHeight + 25);

            doc.setFontSize(11);
            doc.setTextColor(40, 40, 40);
            doc.setFont("helvetica", "normal");
            doc.text(`Lugar de Origen: ${form.values.origen}`, 14, headerY + headerHeight + 35);
            doc.text(`Lugar de Destino: ${form.values.destino}`, 14, headerY + headerHeight + 41);
            doc.text(`Distancia Total: ${form.values.distanciaKm} Km`, 14, headerY + headerHeight + 47);
            doc.text(`Tiempo Operativo Estimado: ${estimacion.breakdown.rutinaViaje.tiempoMisionTotal} horas`, 14, headerY + headerHeight + 53);

            const mapY = headerY + headerHeight + 60;
            const mapHeight = 110; 

            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.2);
            doc.rect(14, mapY, 180, mapHeight, 'S');

            const mapElement = document.getElementById("mapa-ruta-captura");
            if (mapElement) {
                const canvas = await html2canvas(mapElement, { useCORS: true, allowTaint: false, scale: 2 }); 
                const mapImgData = canvas.toDataURL("image/jpeg", 0.9); 
                doc.addImage(mapImgData, 'JPEG', 14.2, mapY + 0.2, 179.6, mapHeight - 0.4); 
            }

            // --- PÁGINA 2 ---
            doc.addPage();

            if (logoB64) { doc.addImage(logoB64, 'JPEG', 14, 12, 35, 15); }
            doc.setFontSize(12);
            doc.setTextColor(40, 40, 40);
            doc.setFont("helvetica", "bold");
            doc.text("Transporte Dadica - COTIZACION DE FLETE", 55, 20);
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.1);
            doc.line(14, 28, 196, 28);


            doc.setFontSize(14);
            doc.setTextColor(250, 176, 5);
            doc.text("2. Despliegue de Convoy y Recursos", 14, 42);

            doc.setFontSize(11);
            doc.setTextColor(40, 40, 40);
            doc.setFont("helvetica", "normal");
            doc.text(`• Personal Especializado: ${cantChoferes} Chofer(es), ${cantAyudantes} Ayudante(s)`, 14, 52);
            doc.text(`• Unidades Motrices (Chutos): ${cantChutos}`, 14, 58);
            doc.text(`• Unidades de Arrastre (Remolques): ${cantRemolques}`, 14, 64);

            let currentYImages = 74;

            if (chutoImgB64 && chutoData) {
                doc.addImage(chutoImgB64, 'JPEG', 14, currentYImages, 50, 35);
                doc.setFontSize(10);
                doc.setTextColor(40, 40, 40);
                doc.setFont("helvetica", "bold");
                doc.text(`Vehículo Representativo:`, 14, currentYImages + 40);
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.setFont("helvetica", "normal");
                doc.text(`${chutoData.nombre}`, 14, currentYImages + 45);
            }

            const primerRemolquePropio = form.values.remolques.find(r => r.tipo === 'dadica');
            if (primerRemolquePropio) {
                const remolqueData = activosMapeados.find(a => a.id.toString() === primerRemolquePropio.activoId);
                if (remolqueData && remolqueData.imagen) {
                    const remolqueImgUrl = `${blobBaseUrl}/${remolqueData.imagen}`;
                    const remolqueImgB64 = await getBase64ImageFromUrl(remolqueImgUrl);
                    if (remolqueImgB64) {
                        doc.addImage(remolqueImgB64, 'JPEG', 80, currentYImages, 50, 35);
                        doc.setFontSize(10);
                        doc.setTextColor(40, 40, 40);
                        doc.setFont("helvetica", "bold");
                        doc.text(`Remolque Representativo:`, 80, currentYImages + 40);
                        doc.setFontSize(9);
                        doc.setTextColor(100, 100, 100);
                        doc.setFont("helvetica", "normal");
                        doc.text(`${remolqueData.nombre}`, 80, currentYImages + 45);
                    }
                }
            }

            let startTableY = currentYImages + 60;

            const costoCombustible = estimacion.breakdown.combustible;
            const costoMantenimiento = estimacion.breakdown.mantenimiento;
            const costoPosesion = estimacion.breakdown.posesion;
            const costoNomina = estimacion.breakdown.nomina;
            const costoViaticos = estimacion.breakdown.viaticos;
            const costoPeajes = estimacion.breakdown.peajes;

            const subtotalVisible = costoCombustible + costoMantenimiento + costoPosesion + costoNomina + costoViaticos + costoPeajes;
            const costoGestionYMargen = estimacion.precioSugerido - subtotalVisible;

            doc.setFontSize(14);
            doc.setTextColor(250, 176, 5);
            doc.text("3. Presupuesto Operativo Consolidado (Breakdown)", 14, startTableY - 5);

            autoTable(doc, {
                startY: startTableY,
                headStyles: { fillColor: [52, 58, 64] },
                head: [['Concepto Operativo Convoy', 'Subtotal (USD)']],
                body: [
                    ['Abastecimiento de Combustible (Toda la flota)', `$${costoCombustible.toFixed(2)}`],
                    ['Nómina Operativa de Ruta (Toda la tripulación)', `$${costoNomina.toFixed(2)}`],
                    ['Viáticos y Subsistencia (Toda la tripulación)', `$${costoViaticos.toFixed(2)}`],
                    ['Peajes y Vialidad Convoy', `$${costoPeajes.toFixed(2)}`],
                    ['Reserva Mantenimiento de Flota (Múltiple)', `$${costoMantenimiento.toFixed(2)}`],
                    ['Costo de Capital y Posesión', `$${costoPosesion.toFixed(2)}`],
                    ['Gestión Logística, Riesgo y Seguros', `$${costoGestionYMargen.toFixed(2)}`],
                ],
            });

            const finalY = doc.lastAutoTable.finalY || startTableY + 60;

            doc.setFillColor(245, 245, 245);
            doc.rect(14, finalY + 15, 182, 28, 'F');
            doc.setFontSize(16);
            doc.setTextColor(40, 40, 40);
            doc.text("TARIFA FINAL A FACTURAR:", 20, finalY + 33);

            doc.setFontSize(24);
            doc.setTextColor(47, 158, 68);
            doc.text(`$${estimacion.precioSugerido.toFixed(2)}`, 130, finalY + 35);

            doc.save(`Cotizacion_Dadica_Convoy_${form.values.destino.replace(/\s+/g, '_')}.pdf`);

            notifications.update({ id: 'pdf-load', title: "¡Listo!", message: "PDF generado correctamente.", color: "green", icon: <IconFileInvoice /> });

        } catch (error) {
            console.error("Error PDF:", error);
            notifications.update({ id: 'pdf-load', title: "Error", message: "Hubo un problema generando el PDF.", color: "red", icon: <IconAlertTriangle /> });
        } finally {
            setGenerandoPDF(false);
        }
    };

    const handleSubmit = async (values) => {
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                waypoints: JSON.stringify(values.waypoints),
                tramos: JSON.stringify(values.tramos),
                costoPeajesTotal: estimacion?.breakdown?.peajes || 0,
                montoFleteTotal: estimacion?.precioSugerido || 0,
                costoEstimado: estimacion?.costoTotal || 0,
                precioSugerido: estimacion?.precioSugerido || 0,
                breakdown: estimacion?.breakdown ? JSON.stringify(estimacion.breakdown) : null,
                creadoPor: userId,
                chutos: values.chutos,
                remolques: values.remolques
            };

            const response = await fetch("/api/fletes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Error al guardar el flete");

            notifications.show({ title: "Éxito", message: "Convoy programado", color: "green" });
            router.push("/superuser/fletes");
        } catch (error) {
            notifications.show({ title: "Error", message: error.message, color: "red" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Center h="80vh"><Loader size="xl" color="yellow.6" /></Center>;

    // 🔥 CÁLCULOS AGREGADOS PARA EL CONVOY EN EL FRONTEND 🔥
    const chutosSeleccionados = form.values.chutos.map(c => activosMapeados.find(a => a.id.toString() === c.activoId)).filter(Boolean);
    const remolquesSeleccionadosPropios = form.values.remolques.filter(r => r.tipo === 'dadica').map(r => activosMapeados.find(a => a.id.toString() === r.activoId)).filter(Boolean);
    
    const taraChutosFija = chutosSeleccionados.reduce((sum, curr) => sum + (Number(curr.tara) || 0), 0);
    const taraRemolquesPropiosFija = remolquesSeleccionadosPropios.reduce((sum, curr) => sum + (Number(curr.tara) || 0), 0);
    const taraRemolquesTercerosFija = form.values.remolques.filter(r => r.tipo === 'tercero').reduce((sum, curr) => sum + (Number(curr.pesoTercero) || 0), 0);
    
    const taraBaseVisual = taraChutosFija + taraRemolquesPropiosFija + taraRemolquesTercerosFija;
    const capacidadMaxDynamic = estimacion?.breakdown?.auditoriaPesos?.capacidad?.valor || (chutosSeleccionados.reduce((sum, curr) => sum + (Number(curr.capacidad) || 40), 0));

    const distanciaViaje = rutaData?.distanciaTotal || 0;
    const litrosTotales = estimacion?.breakdown?.litros || 0;
    const consumoPromedioDinamico = distanciaViaje > 0 ? (litrosTotales / distanciaViaje).toFixed(2) : "0.00";
    
    const tiempoMision = estimacion?.breakdown?.rutinaViaje?.tiempoMisionTotal ? Number(estimacion.breakdown.rutinaViaje.tiempoMisionTotal) : 0;

    // --- RECONSTRUCCIÓN DE MATEMÁTICA VISUAL ABC Y POSESIÓN PARA EL ACORDEÓN ---
    const valorFlota = configGlobal?.valorFlotaActiva ? Number(configGlobal.valorFlotaActiva) : 1;
    const gastosFijosAnuales = Number(configGlobal?.gastosFijosAnualesTotales || 0);
    const tasaInteres = configGlobal?.tasaInteresAnual ? Number(configGlobal.tasaInteresAnual) : 5.0;

    // 1. Mapeo Matemático Explicativo de Chutos
    const chutosMatematica = chutosSeleccionados.map((chuto) => {
        const valor = Number(chuto.raw?.valorReposicion || 0);
        const pesoDecimal = valor / valorFlota;
        const cuotaAnual = gastosFijosAnuales * pesoDecimal;
        const horasAnuales = Number(chuto.raw?.horasAnuales || 200);
        const overheadHora = horasAnuales > 0 ? cuotaAnual / horasAnuales : 0;
        const overheadTotal = overheadHora * tiempoMision;

        const posHora = Number(chuto.raw?.costoPosesionHora || 0);
        const posTotal = posHora * tiempoMision;
        const salvamento = Number(chuto.raw?.valorSalvamento || 0);
        const vida = Number(chuto.raw?.vidaUtilAnios || 1);
        const depHora = (vida * horasAnuales) > 0 ? (valor - salvamento) / (vida * horasAnuales) : 0;
        const intHora = horasAnuales > 0 ? (valor * (tasaInteres / 100)) / horasAnuales : 0;

        return {
            nombre: chuto.nombre,
            valor, pesoPorc: pesoDecimal * 100, cuotaAnual, horasAnuales, overheadHora, overheadTotal,
            posHora, posTotal, salvamento, vida, depHora, intHora,
            cuotaMensual: cuotaAnual / 12,
            viajesMes: overheadTotal > 0 ? (cuotaAnual / 12) / overheadTotal : 0
        };
    });

    // 2. Mapeo Matemático Explicativo de Bateas Propias
    const bateasMatematica = remolquesSeleccionadosPropios.map((batea) => {
        const valor = Number(batea.raw?.valorReposicion || 0);
        const pesoDecimal = valor / valorFlota;
        const cuotaAnual = gastosFijosAnuales * pesoDecimal;
        const horasAnuales = Number(batea.raw?.horasAnuales || 200);
        const overheadHora = horasAnuales > 0 ? cuotaAnual / horasAnuales : 0;
        const overheadTotal = overheadHora * tiempoMision;

        const posHora = Number(batea.raw?.costoPosesionHora || 0);
        const posTotal = posHora * tiempoMision;
        const salvamento = Number(batea.raw?.valorSalvamento || 0);
        const vida = Number(batea.raw?.vidaUtilAnios || 1);
        const depHora = (vida * horasAnuales) > 0 ? (valor - salvamento) / (vida * horasAnuales) : 0;
        const intHora = horasAnuales > 0 ? (valor * (tasaInteres / 100)) / horasAnuales : 0;

        return {
            nombre: batea.nombre,
            valor, pesoPorc: pesoDecimal * 100, cuotaAnual, horasAnuales, overheadHora, overheadTotal,
            posHora, posTotal, salvamento, vida, depHora, intHora,
            cuotaMensual: cuotaAnual / 12,
            viajesMes: overheadTotal > 0 ? (cuotaAnual / 12) / overheadTotal : 0
        };
    });

    // --- AGREGACIONES FINANCIERAS GLOBALES VISUALES ---
    const overheadChutoTotalGlobal = chutosMatematica.reduce((sum, c) => sum + c.overheadTotal, 0);
    const overheadBateaTotalGlobal = bateasMatematica.reduce((sum, b) => sum + b.overheadTotal, 0);
    const posChutoTotalGlobal = chutosMatematica.reduce((sum, c) => sum + c.posTotal, 0);
    const posBateaTotalGlobal = bateasMatematica.reduce((sum, b) => sum + b.posTotal, 0);
    
    // Mantenimiento Extraido del Breakdown
    const mttoChutoItems = estimacion?.breakdown?.itemsDetallados?.filter(i => i.descripcion.includes('[Chuto]')) || [];
    const mttoBateaItems = estimacion?.breakdown?.itemsDetallados?.filter(i => i.descripcion.includes('[Batea]')) || [];
    const mttoChutoTotalGlobal = mttoChutoItems.reduce((acc, curr) => acc + curr.monto, 0);
    const mttoBateaTotalGlobal = mttoBateaItems.reduce((acc, curr) => acc + curr.monto, 0);

    // --- METAS DE SUPERVIVENCIA MULTIPLICADAS PARA EL CONVOY ---
    const overheadRecaudadoViajeConvoy = overheadChutoTotalGlobal + overheadBateaTotalGlobal;
    const gastosFijosMensualesTotales = gastosFijosAnuales / 12;
    const viajesMesEmpresaConvoy = overheadRecaudadoViajeConvoy > 0 ? gastosFijosMensualesTotales / overheadRecaudadoViajeConvoy : 0;

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <Box w="100%" p={0} m={0} bg="#e9ecef" style={{ minHeight: '100vh', paddingBottom: '40px' }}>
                <Stack gap="xl">

                    {/* ======================================================= */}
                    {/* SECCIÓN 1: CONFIGURACIÓN OPERATIVA */}
                    {/* ======================================================= */}
                    <Paper shadow="sm" p="xl" radius={0} bg="white" style={{ borderBottom: '4px solid #fab005' }}>
                        <Group mb="lg" align="center">
                            <ThemeIcon size="xl" radius="md" variant="filled" color="dark.8">
                                <IconSettings size={28} color="#fab005" />
                            </ThemeIcon>
                            <Title order={2} c="dark.9" tt="uppercase" style={{ letterSpacing: '1px' }}>
                                Parámetros de la Misión
                            </Title>
                        </Group>

                        <Grid gutter="xl">
                            {/* COLUMNA 1: Comerciales y Variables */}
                            <Grid.Col span={{ base: 12, lg: 4 }}>
                                <Stack gap="md">
                                    <Text fw={900} c="dark.5" size="sm" tt="uppercase" style={{ borderBottom: '2px solid #fab005', display: 'inline-block', paddingBottom: '4px' }}>Datos Comerciales</Text>

                                    <SelectClienteConCreacion form={form} fieldName="clienteId" label="Cliente" />

                                    <Group grow>
                                        <DateInput label="Fecha de Salida" valueFormat="DD/MM/YYYY" {...form.getInputProps("fechaSalida")} />
                                        <TextInput label="Nro Control" placeholder="FL-XXXX" {...form.getInputProps("nroFlete")} fw={800} c="blue.9" />
                                    </Group>

                                    <Paper withBorder p="sm" bg="blue.0" radius="sm" style={{ border: '1px solid #74c0fc' }}>
                                        <Text size="xs" fw={800} c="blue.8" mb="xs" tt="uppercase">Etiquetas Comerciales para PDF</Text>
                                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
                                            <TextInput label="Origen" placeholder="Ej: Taller" {...form.getInputProps("origen")} />
                                            <TextInput label="Destino" placeholder="Ej: Taladro" {...form.getInputProps("destino")} />
                                            <NumberInput label="Distancia (Km)" placeholder="Ej: 150" hideControls {...form.getInputProps("distanciaKm")} />
                                        </SimpleGrid>
                                    </Paper>

                                    <Select
                                        label="Clasificación de la Carga"
                                        description="Riesgo operativo y permisos."
                                        data={[
                                            { value: "general", label: "📦 General / No peligrosa" },
                                            { value: "salmuera", label: "💧 Salmuera" },
                                            { value: "hidrocarburos", label: "🛢️ Hidrocarburos" },
                                            { value: "quimicos", label: "🧪 Químicos" },
                                            { value: "explosivos", label: "🧨 Materiales Explosivos" }
                                        ]}
                                        {...form.getInputProps("tipoCarga")}
                                    />

                                    <Paper withBorder p="sm" bg="gray.0" radius="sm" mt="xs">
                                        <SimpleGrid cols={2} spacing="md">
                                            <TextInput type="time" label="Hora Salida" {...form.getInputProps("horaSalida")} />
                                            <NumberInput label="Jornada (Hrs)" min={4} max={24} {...form.getInputProps("jornadaMaxima")} />
                                            <NumberInput label="Peajes (Cant)" min={0} leftSection={<IconMapPin size={16} />} {...form.getInputProps("cantidadPeajes")} />
                                            <NumberInput label="Viáticos ($)" min={0} leftSection={<IconCoin size={16} />} {...form.getInputProps("viaticosManuales")} />
                                        </SimpleGrid>
                                        <Switch
                                            label="¿Cubrir comida el 1er día?"
                                            mt="md" color="yellow.6" fw={600} size="md"
                                            checked={form.values.comidaPrimerDia}
                                            onChange={(event) => form.setFieldValue("comidaPrimerDia", event.currentTarget.checked)}
                                        />
                                    </Paper>
                                </Stack>
                            </Grid.Col>

                            {/* COLUMNA 2 y 3 MERGEADA: CONFIGURACIÓN DE CONVOY CON ODTSelectableGrid RESTAURADO */}
                            <Grid.Col span={{ base: 12, lg: 8 }}>
                                <Stack gap="md">
                                    <Text fw={900} c="dark.5" size="sm" tt="uppercase" style={{ borderBottom: '2px solid #fab005', display: 'inline-block', paddingBottom: '4px' }}>
                                        Estructura del Convoy (Flota Múltiple)
                                    </Text>
                                    
                                    <Grid gutter="md">
                                        {/* SECCIÓN CHUTOS */}
                                        <Grid.Col span={{ base: 12, md: 6 }}>
                                            <Paper withBorder p="md" bg="gray.0">
                                                <Group justify="space-between" mb="sm">
                                                    <Text fw={800} c="dark.7"><IconTruck size={18} style={{ verticalAlign: 'middle', marginRight: 4 }}/> Cabezales / Chutos</Text>
                                                    <Button variant="light" color="blue" size="xs" leftSection={<IconPlus size={14}/>} 
                                                        onClick={() => form.insertListItem('chutos', { id: Date.now().toString(), activoId: "", choferId: "", ayudanteId: "" })}>
                                                        Agregar
                                                    </Button>
                                                </Group>
                                                
                                                <Stack gap="xs">
                                                    {form.values.chutos.map((chuto, index) => (
                                                        <Card key={chuto.id} withBorder shadow="sm" radius="md" p="sm" style={{ borderLeft: '4px solid #339af0' }}>
                                                            <Group justify="space-between" mb="xs">
                                                                <Badge color="blue">Chuto {index + 1}</Badge>
                                                                {index > 0 && (
                                                                    <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem('chutos', index)}>
                                                                        <IconTrash size={16} />
                                                                    </ActionIcon>
                                                                )}
                                                            </Group>
                                                            
                                                            <Stack gap="xs">
                                                                <ODTSelectableGrid
                                                                    label="Vehículo Principal (Chuto)"
                                                                    data={activosMapeados.filter((a) => a.tipo === "Vehiculo")}
                                                                    onChange={(val) => form.setFieldValue(`chutos.${index}.activoId`, val)}
                                                                    value={chuto.activoId}
                                                                    showMetrics
                                                                />

                                                                <ODTSelectableGrid
                                                                    label="Chofer Principal"
                                                                    data={empleados.filter((e) => e.puestos?.some((p) => p.nombre.toLowerCase().includes("chofer"))).map((e) => ({ id: e.id.toString(), nombre: `${e.nombre} ${e.apellido}`, imagen: e.imagen, raw: e }))}
                                                                    onChange={(val) => form.setFieldValue(`chutos.${index}.choferId`, val)}
                                                                    value={chuto.choferId}
                                                                />

                                                                <ODTSelectableGrid
                                                                    label="Ayudante / Escolta (Opcional)"
                                                                    data={empleados.filter((e) => e.puestos?.some((p) => p.nombre.toLowerCase().includes("ayudante"))).map((e) => ({ id: e.id.toString(), nombre: `${e.nombre} ${e.apellido}`, imagen: e.imagen, raw: e }))}
                                                                    onChange={(val) => form.setFieldValue(`chutos.${index}.ayudanteId`, val)}
                                                                    value={chuto.ayudanteId}
                                                                />
                                                            </Stack>
                                                        </Card>
                                                    ))}
                                                </Stack>
                                            </Paper>
                                        </Grid.Col>

                                        {/* SECCIÓN REMOLQUES */}
                                        <Grid.Col span={{ base: 12, md: 6 }}>
                                            <Paper withBorder p="md" bg="gray.0">
                                                <Group justify="space-between" mb="sm">
                                                    <Text fw={800} c="dark.7"><IconTruck size={18} style={{ verticalAlign: 'middle', marginRight: 4 }}/> Remolques / Bateas</Text>
                                                    <Button variant="light" color="violet" size="xs" leftSection={<IconPlus size={14}/>} 
                                                        onClick={() => form.insertListItem('remolques', { id: Date.now().toString(), tipo: "dadica", activoId: "", pesoTercero: 0, retorna: true })}>
                                                        Agregar
                                                    </Button>
                                                </Group>
                                                
                                                <Stack gap="xs">
                                                    {form.values.remolques.length === 0 && <Text c="dimmed" size="sm" ta="center">Sin remolques asignados</Text>}
                                                    {form.values.remolques.map((remolque, index) => (
                                                        <Card key={remolque.id} withBorder shadow="sm" radius="md" p="sm" style={{ borderLeft: '4px solid #7950f2' }}>
                                                            <Group justify="space-between" mb="xs">
                                                                <Select 
                                                                    data={[{ value: 'dadica', label: 'Propio (Dadica)' }, { value: 'tercero', label: 'Tercero (Alquilado)' }]}
                                                                    {...form.getInputProps(`remolques.${index}.tipo`)}
                                                                    style={{ flex: 1 }}
                                                                />
                                                                <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem('remolques', index)}>
                                                                    <IconTrash size={16} />
                                                                </ActionIcon>
                                                            </Group>
                                                            
                                                            {remolque.tipo === 'dadica' ? (
                                                                <ODTSelectableGrid
                                                                    label="Seleccionar Remolque"
                                                                    data={activosMapeados.filter((a) => a.tipo === "Remolque")}
                                                                    onChange={(val) => form.setFieldValue(`remolques.${index}.activoId`, val)}
                                                                    value={remolque.activoId}
                                                                    showMetrics
                                                                />
                                                            ) : (
                                                                <NumberInput label="Peso del Remolque (t)" description="Para cálculo de esfuerzo de arrastre" min={0} max={50}
                                                                    {...form.getInputProps(`remolques.${index}.pesoTercero`)} mb="xs" />
                                                            )}
                                                            
                                                            <Switch 
                                                                label="El remolque retorna con el convoy" 
                                                                description="Afecta ejes de peaje y consumo en retorno"
                                                                checked={remolque.retorna}
                                                                onChange={(event) => form.setFieldValue(`remolques.${index}.retorna`, event.currentTarget.checked)}
                                                                color="violet"
                                                            />
                                                        </Card>
                                                    ))}
                                                </Stack>
                                            </Paper>
                                        </Grid.Col>
                                    </Grid>

                                    {/* TELEMETRÍA AGREGADA */}
                                    {form.values.chutos.length > 0 && form.values.chutos[0].activoId ? (
                                        <Paper withBorder p="md" radius="sm" bg="dark.8" shadow="sm">
                                            <Group mb="md" gap="xs">
                                                <IconDashboard size={20} color="#fab005" />
                                                <Text size="sm" fw={900} c="white" tt="uppercase">Telemetría Agregada del Convoy</Text>
                                            </Group>

                                            <SimpleGrid cols={2} spacing="md">
                                                <Box>
                                                    <Text size="xs" fw={700} c="gray.5" tt="uppercase">Tara Convoy (Vacío):</Text>
                                                    <Group gap={5} mt={4}>
                                                        <Text size="xl" fw={900} c="yellow.5">{taraBaseVisual.toFixed(1)} t</Text>
                                                    </Group>
                                                    <Text size="xs" c="gray.4" mt={2}>
                                                        Cabezales: {taraChutosFija.toFixed(1)}t | Remolques: {(taraRemolquesPropiosFija + taraRemolquesTercerosFija).toFixed(1)}t
                                                    </Text>
                                                </Box>

                                                <Box>
                                                    <Text size="xs" fw={700} c="gray.5" tt="uppercase">Capacidad Max Conjunta:</Text>
                                                    <Text size="xl" fw={900} c="white" mt={4}>{capacidadMaxDynamic} t</Text>
                                                </Box>

                                                {estimacion?.breakdown?.auditoriaPesos && (
                                                    <>
                                                        <Box>
                                                            <Text size="xs" fw={700} c="gray.5" tt="uppercase">Rendimiento Promedio:</Text>
                                                            <Text size="md" fw={900} c="white" mt={4}>{consumoPromedioDinamico} L/Km</Text>
                                                            <Text size="xs" c="gray.5" mt={2}>(Consumo de todo el convoy)</Text>
                                                        </Box>

                                                        <Box>
                                                            <Text size="xs" fw={700} c="gray.5" tt="uppercase">Vel. Real Montaña:</Text>
                                                            <Text size="md" fw={900} c="orange.5" mt={4}>{estimacion.breakdown.rutinaViaje.velocidadPromedioReal} Km/h</Text>
                                                        </Box>
                                                    </>
                                                )}
                                            </SimpleGrid>
                                        </Paper>
                                    ) : (
                                        <Alert color="dark.8" variant="outline" style={{ borderStyle: 'dashed' }}>
                                            Asigna la flota para visualizar la telemetría base.
                                        </Alert>
                                    )}
                                </Stack>
                            </Grid.Col>
                        </Grid>
                    </Paper>

                    {/* ======================================================= */}
                    {/* SECCIÓN 2: LOGÍSTICA Y RUTA */}
                    {/* ======================================================= */}
                    <Paper shadow="sm" p="xl" radius={0} bg="white" style={{ borderBottom: '4px solid #fab005' }}>
                        <Group mb="md" align="center">
                            <ThemeIcon size="xl" radius="md" variant="filled" color="dark.8">
                                <IconRoute size={28} color="#fab005" />
                            </ThemeIcon>
                            <Title order={2} c="dark.9" tt="uppercase" style={{ letterSpacing: '1px' }}>
                                Trazado Logístico y Altimetría
                            </Title>
                        </Group>

                        <Alert variant="filled" color="dark.8" mb="lg" icon={<IconInfoCircle size={18} color="#fab005" />} style={{ borderLeft: '4px solid #fab005' }}>
                            <Text c="white" fw={500}>Haz clic en el mapa. El sistema trazará el circuito calculando kilómetros, tiempos y esfuerzo en montañas automáticamente.</Text>
                        </Alert>

                        <Box id="mapa-ruta-captura" style={{ minHeight: '500px', borderRadius: '4px', overflow: 'hidden', border: '2px solid #343a40' }}>
                            <GoogleRouteMap
                                onRouteCalculated={handleRouteCalculated}
                                tramosFormulario={form.values.tramos}
                                vehiculoAsignado={form.values.chutos.length > 0 && !!form.values.chutos[0].activoId}
                                taraBase={0}
                                capacidadMax={30}
                                initialWaypoints={form.values.waypoints}
                            />
                        </Box>

                        {form.values.tramos.length > 0 && (
                            <Box mt="xl" p="xl" bg="gray.1" style={{ borderRadius: '8px', border: '1px solid #dee2e6' }}>
                                <Text fw={900} c="dark.8" size="lg" tt="uppercase" mb="xl" style={{ borderBottom: '2px solid #fab005', display: 'inline-block', paddingBottom: '4px' }}>
                                    Distribución de Carga por Tramos
                                </Text>

                                <Timeline active={form.values.tramos.length} bulletSize={32} lineWidth={4} color="yellow.6">
                                    {form.values.tramos.map((tramo, index) => (
                                        <Timeline.Item
                                            key={index}
                                            bullet={<IconMapPin size={18} c="dark.9" />}
                                            title={<Text fw={900} size="xl" c="dark.8">{tramo.origen.split(',')[0]} ➔ {tramo.destino.split(',')[0]}</Text>}
                                        >
                                            <Group gap="md" mt={8} mb="lg">
                                                <Badge size="lg" color="dark.8" variant="filled" radius="sm">{tramo.distanciaKm} Km</Badge>
                                                {tramo.desnivelMetros > 0 && <Badge size="lg" color="orange.6" variant="filled" radius="sm">⛰️ +{tramo.desnivelMetros}m subida</Badge>}
                                            </Group>

                                            <Paper withBorder p="xl" radius="md" bg="white" shadow="sm" style={{ borderLeft: '8px solid #fab005' }}>
                                                <Grid align="center" gutter="xl">
                                                    <Grid.Col span={{ base: 12, md: 3 }}>
                                                        <Stack gap={4}>
                                                            <Text size="sm" fw={800} c="gray.6" tt="uppercase">Peso Neto (Carga):</Text>
                                                            <Badge size="xl" radius="sm" color={tramo.tonelaje === 0 ? 'gray.6' : tramo.tonelaje > (capacidadMaxDynamic * 0.8) ? 'red.7' : 'dark.8'} variant="filled">
                                                                {tramo.tonelaje} t
                                                            </Badge>
                                                            <Text size="sm" mt="xs" fw={600}>Peso Bruto: <Text span c="dark.9" fw={900}>{((Number(taraBaseVisual) || 0) + (Number(tramo.tonelaje) || 0)).toFixed(1)}t</Text></Text>
                                                        </Stack>
                                                    </Grid.Col>

                                                    <Grid.Col span={{ base: 12, md: 6 }}>
                                                        <Text size="md" fw={800} mb={10} c="dark.7">Ajustar Peso a Mover en este Tramo:</Text>
                                                        <Slider
                                                            color="yellow.6" size="xl" radius="sm"
                                                            defaultValue={tramo.tonelaje}
                                                            onChangeEnd={(val) => form.setFieldValue(`tramos.${index}.tonelaje`, val)}
                                                            step={0.5} min={0} max={capacidadMaxDynamic}
                                                            label={(val) => `${val}t`}
                                                            marks={[
                                                                { value: 0, label: <Text fw={800}>Vacío</Text> },
                                                                { value: Math.round(capacidadMaxDynamic), label: <Text fw={800}>Full</Text> }
                                                            ]}
                                                        />
                                                    </Grid.Col>

                                                    <Grid.Col span={{ base: 12, md: 3 }}>
                                                        <NumberInput
                                                            label={<Text fw={700}>Espera en parada (Hrs)</Text>}
                                                            description="Carga/Descarga"
                                                            size="lg" min={0} step={0.5}
                                                            value={tramo.tiempoEspera || 0}
                                                            onChange={(val) => form.setFieldValue(`tramos.${index}.tiempoEspera`, val)}
                                                        />
                                                    </Grid.Col>
                                                </Grid>
                                            </Paper>
                                        </Timeline.Item>
                                    ))}
                                </Timeline>
                            </Box>
                        )}
                    </Paper>

                    {/* ======================================================= */}
                    {/* SECCIÓN 3: INTELIGENCIA FINANCIERA */}
                    {/* ======================================================= */}
                    <Paper shadow="sm" p="xl" radius={0} bg="white" style={{ borderBottom: '4px solid #fab005' }}>
                        <Group mb="md" align="center">
                            <ThemeIcon size="xl" radius="md" variant="filled" color="dark.8">
                                <IconCalculator size={28} color="#fab005" />
                            </ThemeIcon>
                            <Title order={2} c="dark.9" tt="uppercase" style={{ letterSpacing: '1px' }}>
                                Presupuesto Inteligente Convoy
                            </Title>
                        </Group>

                        {calcLoading ? (
                            <Center py={100}><Loader size="xl" color="yellow.6" variant="bars" /></Center>
                        ) : !estimacion ? (
                            <Alert color="dark.8" variant="outline" ta="center" mt="xl" style={{ borderStyle: 'dashed' }}>
                                <Text fw={600} size="lg">Traza la ruta para que el motor financiero procese los costos del convoy en tiempo real.</Text>
                            </Alert>
                        ) : (
                            <Stack gap="xl">

                                {estimacion?.breakdown?.rutinaViaje && (
                                    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
                                        <Paper withBorder p="xl" radius="md" ta="center" bg="gray.1" shadow="xs">
                                            <Text size="md" c="gray.6" fw={900} tt="uppercase">Tiempo en Movimiento</Text>
                                            <Text fw={900} style={{ fontSize: '3rem', lineHeight: 1.2 }} c="dark.8">{estimacion.breakdown.rutinaViaje.horasConduccion} <Text span size="xl" c="dimmed">hrs</Text></Text>
                                            <Text size="md" c="gray.6" fw={700}>+{estimacion.breakdown.rutinaViaje.horasEsperaTotales} hrs (Demoras/Espera)</Text>
                                        </Paper>
                                        <Paper withBorder p="xl" radius="md" ta="center" bg="dark.8" shadow="md">
                                            <Text size="md" c="yellow.5" fw={900} tt="uppercase">Duración Total Misión</Text>
                                            <Text fw={900} style={{ fontSize: '3rem', lineHeight: 1.2 }} c="white">{estimacion.breakdown.rutinaViaje.tiempoMisionTotal} <Text span size="xl" c="gray.5">hrs</Text></Text>
                                            <Text size="md" c="gray.4" fw={700}>Rodando + Descansos</Text>
                                        </Paper>
                                        <Paper withBorder p="xl" radius="md" ta="center" bg="teal.0" shadow="xs" style={{ border: '2px solid #20c997' }}>
                                            <Text size="md" c="teal.9" fw={900} tt="uppercase">Llegada Estimada</Text>
                                            <Text fw={900} style={{ fontSize: '2.2rem', lineHeight: 1.2 }} c="teal.9" mt={8}>
                                                {new Date(estimacion.breakdown.rutinaViaje.fechaLlegadaISO).toLocaleDateString('es-VE', { weekday: 'short', day: '2-digit', month: 'short' })}
                                            </Text>
                                            <Text fw={900} size="xl" c="teal.9">
                                                {new Date(estimacion.breakdown.rutinaViaje.fechaLlegadaISO).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </Paper>
                                    </SimpleGrid>
                                )}

                                <Accordion variant="separated" radius="sm" defaultValue="detalles">
                                    <Accordion.Item value="detalles" style={{ backgroundColor: '#ffffff', border: '1px solid #ced4da', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                        <Accordion.Control icon={<IconChartLine size={28} color="#343a40" />} p="xl">
                                            <Text fw={900} size="xl" c="dark.9" tt="uppercase">Desglose Analítico de Costos Financieros</Text>
                                        </Accordion.Control>
                                        <Accordion.Panel p="xl">

                                            {estimacion?.breakdown?.itinerario && estimacion.breakdown.itinerario.length > 0 && (
                                                <Box mt="md" mb="xl" p="xl" bg="gray.0" style={{ borderRadius: '8px', border: '1px solid #e9ecef' }}>
                                                    <Text fw={900} mb="lg" size="lg" c="dark.8" tt="uppercase"><IconRoute size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Cronograma Estimado de la Misión</Text>
                                                    <Timeline active={estimacion.breakdown.itinerario.length} bulletSize={24} lineWidth={3} color="yellow.6">
                                                        {estimacion.breakdown.itinerario.map((evento, idx) => (
                                                            <Timeline.Item key={idx} title={<Text fw={900} c="dark.8" size="md">Día {evento.dia}</Text>} lineVariant={evento.tipo === 'descanso' ? 'dashed' : 'solid'} color={evento.tipo === 'descanso' ? 'orange.6' : 'yellow.6'}>
                                                                <Text c="dimmed" size="md" fw={700}>{evento.inicio} - {evento.fin}</Text>
                                                                <Text size="lg" fw={800} c="dark.7">{evento.accion}</Text>
                                                                {evento.detalleViatico && (
                                                                    <Badge size="md" color="green.7" variant="filled" mt={8} radius="sm">{evento.detalleViatico}</Badge>
                                                                )}
                                                            </Timeline.Item>
                                                        ))}
                                                    </Timeline>
                                                </Box>
                                            )}

                                            <Box style={{ overflowX: 'auto' }}>
                                                <Table highlightOnHover verticalSpacing="lg" style={{ minWidth: '1000px' }}>
                                                    <Table.Thead bg="gray.2">
                                                        <Table.Tr>
                                                            <Table.Th w="60%"><Text c="dark.8" fw={900} size="md" tt="uppercase">Concepto Operativo</Text></Table.Th>
                                                            <Table.Th w="20%"><Text c="dark.8" fw={900} size="md" tt="uppercase">Clasificación</Text></Table.Th>
                                                            <Table.Th w="20%" style={{ textAlign: 'right' }}><Text c="dark.8" fw={900} size="md" tt="uppercase">Costo USD</Text></Table.Th>
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>
                                                        {/* --- 1. COMBUSTIBLE --- */}
                                                        <Table.Tr onClick={() => toggleSection('gasoil')} style={{ cursor: 'pointer' }} bg={expandedSections.gasoil ? "gray.1" : undefined}>
                                                            <Table.Td fw={900} c="dark.8" fz="lg"><Text span mr={8} c="yellow.6">{expandedSections.gasoil ? '▼' : '▶'}</Text> ⛽ Combustible Convoy ({estimacion?.breakdown?.litros || 0} Lts)</Table.Td>
                                                            <Table.Td><Badge color="dark.6" radius="sm" size="lg">Operativo</Badge></Table.Td>
                                                            <Table.Td fw={900} ta="right" fz="xl" c="dark.9">${(estimacion?.breakdown?.combustible || 0).toFixed(2)}</Table.Td>
                                                        </Table.Tr>

                                                        {/* --- 2. NÓMINA --- */}
                                                        <Table.Tr onClick={() => toggleSection('nomina')} style={{ cursor: 'pointer' }} bg={expandedSections.nomina ? "gray.1" : undefined}>
                                                            <Table.Td fw={900} c="dark.8" fz="lg"><Text span mr={8} c="yellow.6">{expandedSections.nomina ? '▼' : '▶'}</Text> 👷 Nómina de Ruta ({form.values.chutos.length} Choferes)</Table.Td>
                                                            <Table.Td><Badge color="blue.8" radius="sm" size="lg">RRHH</Badge></Table.Td>
                                                            <Table.Td fw={900} ta="right" fz="xl" c="dark.9">${(estimacion?.breakdown?.nomina || 0).toFixed(2)}</Table.Td>
                                                        </Table.Tr>

                                                        {/* --- 3. VIÁTICOS --- */}
                                                        <Table.Tr onClick={() => toggleSection('viaticos')} style={{ cursor: 'pointer' }} bg={expandedSections.viaticos ? "gray.1" : undefined}>
                                                            <Table.Td fw={900} c="dark.8" fz="lg"><Text span mr={8} c="yellow.6">{expandedSections.viaticos ? '▼' : '▶'}</Text> 🍔 Viáticos en Ruta</Table.Td>
                                                            <Table.Td><Badge color="indigo.7" radius="sm" size="lg">Operaciones</Badge></Table.Td>
                                                            <Table.Td fw={900} ta="right" fz="xl" c="dark.9">${(estimacion?.breakdown?.viaticos || 0).toFixed(2)}</Table.Td>
                                                        </Table.Tr>

                                                        {/* --- 4. PEAJES --- */}
                                                        <Table.Tr onClick={() => toggleSection('peajes')} style={{ cursor: 'pointer' }} bg={expandedSections.peajes ? "gray.1" : undefined}>
                                                            <Table.Td fw={900} c="dark.8" fz="lg"><Text span mr={8} c="yellow.6">{expandedSections.peajes ? '▼' : '▶'}</Text> 🚧 Peajes y Vialidad Convoy ({form.values.cantidadPeajes} en ruta)</Table.Td>
                                                            <Table.Td><Badge color="cyan.7" radius="sm" size="lg">Impuestos</Badge></Table.Td>
                                                            <Table.Td fw={900} ta="right" fz="xl" c="dark.9">${(estimacion?.breakdown?.peajes || 0).toFixed(2)}</Table.Td>
                                                        </Table.Tr>

                                                        {/* --- 5. OVERHEAD ABC (AHORA RECONSTRUIDO COMPLETAMENTE ITERANDO SOBRE CONVOY) --- */}
                                                        <Table.Tr onClick={() => toggleSection('overhead')} style={{ cursor: 'pointer' }} bg={expandedSections.overhead ? "gray.2" : "gray.1"}>
                                                            <Table.Td fw={900} c="dark.8" fz="lg"><Text span mr={8} c="yellow.6">{expandedSections.overhead ? '▼' : '▶'}</Text> 🏢 Costo Overhead ABC Convoy</Table.Td>
                                                            <Table.Td><Badge color="violet.7" radius="sm" size="lg">Administrativo</Badge></Table.Td>
                                                            <Table.Td fw={900} ta="right" fz="xl" c="dark.9">${(estimacion?.breakdown?.overhead || 0).toFixed(2)}</Table.Td>
                                                        </Table.Tr>
                                                        {expandedSections.overhead && (
                                                            <>
                                                                <Table.Tr>
                                                                    <Table.Td pl={60} c="dark.7" style={{ fontSize: '0.95rem', borderBottom: 'none', paddingBottom: 6, paddingTop: 16 }} colSpan={3}>
                                                                        <Text span fw={900}>Matemática ABC Múltiple:</Text> Asigna un porcentaje del Gasto Administrativo Anual (${gastosFijosAnuales.toLocaleString()}) a CADA ACTIVO del convoy según su valor comercial frente al resto de la empresa.
                                                                    </Table.Td>
                                                                </Table.Tr>

                                                                {/* BUCLE DE CHUTOS OVERHEAD */}
                                                                {chutosMatematica.map((chuto, idx) => (
                                                                    <React.Fragment key={`ov-chuto-${idx}`}>
                                                                        <Table.Tr><Table.Td pl={60} fw={900} c="dark.8" style={{ borderBottom: 'none', paddingTop: 12 }} colSpan={2}>🚛 {chuto.nombre} (Tarifa Overhead: ${chuto.overheadHora.toFixed(2)}/hr)</Table.Td><Table.Td ta="right" fw={900} c="dark.8" style={{ borderBottom: 'none', paddingTop: 12 }}>${chuto.overheadTotal.toFixed(2)}</Table.Td></Table.Tr>
                                                                        <Table.Tr><Table.Td pl={80} c="dimmed" style={{ borderBottom: 'none', paddingBottom: 2, paddingTop: 2 }} colSpan={3} fz="sm">
                                                                            • <Text span fw={700}>Origen del {chuto.pesoPorc.toFixed(1)}%:</Text> Es lo que representa este equipo (${chuto.valor.toLocaleString()}) frente al valor de toda la flota (${valorFlota.toLocaleString()}).
                                                                        </Table.Td></Table.Tr>
                                                                        <Table.Tr><Table.Td pl={80} c="dimmed" style={{ borderBottom: 'none', paddingBottom: 8, paddingTop: 2 }} colSpan={3} fz="sm">
                                                                            • <Text span fw={700}>Fórmula:</Text> (${gastosFijosAnuales.toLocaleString()} × {chuto.pesoPorc.toFixed(1)}%) ÷ {chuto.horasAnuales} hrs anuales = <Text span fw={800} c="dark.6">${chuto.overheadHora.toFixed(2)}/hr</Text> × {tiempoMision.toFixed(1)} hrs de viaje.
                                                                        </Table.Td></Table.Tr>
                                                                    </React.Fragment>
                                                                ))}

                                                                {/* BUCLE DE BATEAS OVERHEAD */}
                                                                {bateasMatematica.map((batea, idx) => (
                                                                    <React.Fragment key={`ov-batea-${idx}`}>
                                                                        <Table.Tr><Table.Td pl={60} fw={900} c="dark.8" style={{ borderBottom: 'none', paddingTop: 12 }} colSpan={2}>🛤️ {batea.nombre} (Tarifa Overhead: ${batea.overheadHora.toFixed(2)}/hr)</Table.Td><Table.Td ta="right" fw={900} c="dark.8" style={{ borderBottom: 'none', paddingTop: 12 }}>${batea.overheadTotal.toFixed(2)}</Table.Td></Table.Tr>
                                                                        <Table.Tr><Table.Td pl={80} c="dimmed" style={{ borderBottom: 'none', paddingBottom: 2, paddingTop: 2 }} colSpan={3} fz="sm">
                                                                            • <Text span fw={700}>Origen del {batea.pesoPorc.toFixed(1)}%:</Text> Es lo que representa este equipo (${batea.valor.toLocaleString()}) frente al valor de toda la flota (${valorFlota.toLocaleString()}).
                                                                        </Table.Td></Table.Tr>
                                                                        <Table.Tr><Table.Td pl={80} c="dimmed" style={{ borderBottom: 'none', paddingBottom: 8, paddingTop: 2 }} colSpan={3} fz="sm">
                                                                            • <Text span fw={700}>Fórmula:</Text> (${gastosFijosAnuales.toLocaleString()} × {batea.pesoPorc.toFixed(1)}%) ÷ {batea.horasAnuales} hrs anuales = <Text span fw={800} c="dark.6">${batea.overheadHora.toFixed(2)}/hr</Text> × {tiempoMision.toFixed(1)} hrs de viaje.
                                                                        </Table.Td></Table.Tr>
                                                                    </React.Fragment>
                                                                ))}

                                                                {/* 🔥 TERMÓMETRO DE SUPERVIVENCIA CONVOY 🔥 */}
                                                                <Table.Tr>
                                                                    <Table.Td colSpan={3} style={{ borderBottom: 'none', padding: '16px 60px 30px 60px' }}>
                                                                        <Paper withBorder p="md" radius="sm" bg="blue.0" style={{ borderLeft: '6px solid #339af0' }}>
                                                                            <Text fw={900} c="blue.9" mb="xs"><IconChartLine size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Punto de Equilibrio Logístico (Metas de Ocupación Mensual)</Text>
                                                                            <Text size="sm" c="blue.8" mb="md">Para garantizar que los costos fijos administrativos no generen pérdidas, se deben cumplir estas cuotas de fletes <b>(idénticos a este)</b> al mes por cada unidad:</Text>

                                                                            <Group gap="xl" align="flex-start">
                                                                                {chutosMatematica.map((chuto, idx) => (
                                                                                    <Box key={`meta-chuto-${idx}`}>
                                                                                        <Text size="xs" tt="uppercase" fw={700} c="blue.9">🚛 Meta Ind. (Chuto {idx+1}):</Text>
                                                                                        <Text size="xl" fw={900} c="dark.9">{Math.ceil(chuto.viajesMes)} <Text span size="sm" fw={600} c="dimmed">viajes/mes</Text></Text>
                                                                                    </Box>
                                                                                ))}

                                                                                {bateasMatematica.map((batea, idx) => (
                                                                                    <Box key={`meta-batea-${idx}`}>
                                                                                        <Text size="xs" tt="uppercase" fw={700} c="blue.9">🛤️ Meta Ind. (Batea {idx+1}):</Text>
                                                                                        <Text size="xl" fw={900} c="dark.9">{Math.ceil(batea.viajesMes)} <Text span size="sm" fw={600} c="dimmed">viajes/mes</Text></Text>
                                                                                    </Box>
                                                                                ))}

                                                                                <Divider orientation="vertical" color="blue.3" />

                                                                                <Box style={{ backgroundColor: 'rgba(255, 107, 107, 0.1)', padding: '8px 16px', borderRadius: '4px', border: '1px solid #ff8787' }}>
                                                                                    <Text size="xs" tt="uppercase" fw={900} c="red.8">🚨 STRESS TEST (TODA LA EMPRESA):</Text>
                                                                                    <Text size="xl" fw={900} c="red.9">{Math.ceil(viajesMesEmpresaConvoy)} <Text span size="sm" fw={600} c="red.7">viajes de CONVOY/mes</Text></Text>
                                                                                    <Text size="xs" c="red.8" mt={4} style={{ maxWidth: '250px', lineHeight: 1.2 }}>
                                                                                        (Si la flota entera se paraliza y dependes exclusivamente de repetir este despacho de {chutosSeleccionados.length} chuto(s) para pagar el 100% de la oficina).
                                                                                    </Text>
                                                                                </Box>
                                                                            </Group>
                                                                        </Paper>
                                                                    </Table.Td>
                                                                </Table.Tr>
                                                            </>
                                                        )}

                                                        {/* --- 6. MANTENIMIENTO DINÁMICO --- */}
                                                        <Table.Tr onClick={() => toggleSection('mantenimiento')} style={{ cursor: 'pointer' }} bg={expandedSections.mantenimiento ? "gray.1" : undefined}>
                                                            <Table.Td fw={900} c="dark.8" fz="lg"><Text span mr={8} c="yellow.6">{expandedSections.mantenimiento ? '▼' : '▶'}</Text> 🔧 Reserva Mantenimiento Múltiple</Table.Td>
                                                            <Table.Td><Badge color="orange.7" radius="sm" size="lg">Taller</Badge></Table.Td>
                                                            <Table.Td fw={900} ta="right" fz="xl" c="dark.9">${(estimacion?.breakdown?.mantenimiento || 0).toFixed(2)}</Table.Td>
                                                        </Table.Tr>
                                                        {expandedSections.mantenimiento && (
                                                            <>
                                                                {/* Bloque Chutos Conjuntos */}
                                                                <Table.Tr><Table.Td pl={60} fw={900} c="dark.7" style={{ borderBottom: 'none', paddingTop: 16 }} colSpan={2}>🚛 Mantenimiento Conjunto Chutos</Table.Td><Table.Td ta="right" fw={900} c="dark.7" style={{ borderBottom: 'none', paddingTop: 16 }}>${mttoChutoTotalGlobal.toFixed(2)}</Table.Td></Table.Tr>
                                                                {mttoChutoItems.map((item, index) => (
                                                                    <Table.Tr key={`mtto-chuto-${index}`}>
                                                                        <Table.Td pl={80} c="dimmed" style={{ borderBottom: 'none', paddingBottom: 4, paddingTop: 4 }} fz="sm">↳ {item.descripcion}</Table.Td>
                                                                        <Table.Td style={{ borderBottom: 'none', paddingBottom: 4, paddingTop: 4 }}><Badge color={item.tipo === 'Rodamiento' ? 'orange.8' : 'gray.6'} variant="outline" radius="sm" size="sm">{item.tipo}</Badge></Table.Td>
                                                                        <Table.Td style={{ borderBottom: 'none', paddingBottom: 4, paddingTop: 4 }} ta="right" c="dimmed" fw={800} fz="sm">${item.monto.toFixed(2)}</Table.Td>
                                                                    </Table.Tr>
                                                                ))}

                                                                {/* Bloque Bateas Conjuntas */}
                                                                {mttoBateaTotalGlobal > 0 && (
                                                                    <>
                                                                        <Table.Tr><Table.Td pl={60} fw={900} c="dark.7" style={{ borderBottom: 'none', paddingTop: 16 }} colSpan={2}>🛤️ Mantenimiento Conjunto Bateas</Table.Td><Table.Td ta="right" fw={900} c="dark.7" style={{ borderBottom: 'none', paddingTop: 16 }}>${mttoBateaTotalGlobal.toFixed(2)}</Table.Td></Table.Tr>
                                                                        {mttoBateaItems.map((item, index) => (
                                                                            <Table.Tr key={`mtto-batea-${index}`}>
                                                                                <Table.Td pl={80} c="dimmed" style={{ borderBottom: 'none', paddingBottom: 4, paddingTop: 4 }} fz="sm">↳ {item.descripcion}</Table.Td>
                                                                                <Table.Td style={{ borderBottom: 'none', paddingBottom: 4, paddingTop: 4 }}><Badge color={item.tipo === 'Rodamiento' ? 'orange.8' : 'gray.6'} variant="outline" radius="sm" size="sm">{item.tipo}</Badge></Table.Td>
                                                                                <Table.Td style={{ borderBottom: 'none', paddingBottom: 4, paddingTop: 4 }} ta="right" c="dimmed" fw={800} fz="sm">${item.monto.toFixed(2)}</Table.Td>
                                                                            </Table.Tr>
                                                                        ))}
                                                                    </>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* --- 7. POSESIÓN FINANCIERA (FÓRMULAS EXPUESTAS POR CONVOY) --- */}
                                                        <Table.Tr onClick={() => toggleSection('posesion')} style={{ cursor: 'pointer' }} bg={expandedSections.posesion ? "gray.1" : undefined}>
                                                            <Table.Td fw={900} c="dark.8" fz="lg"><Text span mr={8} c="yellow.6">{expandedSections.posesion ? '▼' : '▶'}</Text> 📈 Costo Posesión Flota</Table.Td>
                                                            <Table.Td><Badge color="teal.7" radius="sm" size="lg">Financiero</Badge></Table.Td>
                                                            <Table.Td fw={900} ta="right" fz="xl" c="dark.9">${(estimacion?.breakdown?.posesion || 0).toFixed(2)}</Table.Td>
                                                        </Table.Tr>
                                                        {expandedSections.posesion && (
                                                            <>
                                                                <Table.Tr>
                                                                    <Table.Td pl={60} c="dark.7" style={{ fontSize: '0.95rem', borderBottom: 'none', paddingBottom: 6, paddingTop: 16 }} colSpan={3}>
                                                                        <Text span fw={900}>Matemática Financiera ({tiempoMision.toFixed(1)} horas de ruta):</Text> Refleja la pérdida de valor (Depreciación) y el costo de oportunidad del dinero inmovilizado (Interés del {tasaInteres}%) diluido entre las horas de trabajo reales para CADA EQUIPO del convoy.
                                                                    </Table.Td>
                                                                </Table.Tr>

                                                                {/* DESGLOSE DE CHUTOS */}
                                                                {chutosMatematica.map((chuto, idx) => (
                                                                    <React.Fragment key={`pos-chuto-${idx}`}>
                                                                        <Table.Tr><Table.Td pl={60} fw={900} c="dark.8" style={{ borderBottom: 'none', paddingTop: 12 }} colSpan={2}>🚛 {chuto.nombre} (Tarifa Total: ${chuto.posHora.toFixed(2)}/hr)</Table.Td><Table.Td ta="right" fw={900} c="dark.8" style={{ borderBottom: 'none', paddingTop: 12 }}>${chuto.posTotal.toFixed(2)}</Table.Td></Table.Tr>
                                                                        <Table.Tr><Table.Td pl={80} c="dimmed" style={{ borderBottom: 'none', paddingBottom: 2, paddingTop: 2 }} colSpan={3} fz="sm">
                                                                            • <Text span fw={700}>Depreciación:</Text> (${chuto.valor.toLocaleString()} - Salvamento ${chuto.salvamento.toLocaleString()}) ÷ ({chuto.vida} años × {chuto.horasAnuales} hrs/año) = <Text span fw={800} c="dark.6">${chuto.depHora.toFixed(2)}/hr</Text>
                                                                        </Table.Td></Table.Tr>
                                                                        <Table.Tr><Table.Td pl={80} c="dimmed" style={{ borderBottom: 'none', paddingBottom: 2, paddingTop: 2 }} colSpan={3} fz="sm">
                                                                            • <Text span fw={700}>Costo Capital:</Text> (${chuto.valor.toLocaleString()} × {tasaInteres}% anual) ÷ {chuto.horasAnuales} hrs/año = <Text span fw={800} c="dark.6">${chuto.intHora.toFixed(2)}/hr</Text>
                                                                        </Table.Td></Table.Tr>
                                                                        <Table.Tr><Table.Td pl={80} c="dark.5" style={{ borderBottom: 'none', paddingBottom: 8, paddingTop: 2 }} colSpan={3} fz="sm">
                                                                            <Text span fw={700}>↳ Total Vehículo:</Text> (${chuto.depHora.toFixed(2)} + ${chuto.intHora.toFixed(2)}) × {tiempoMision.toFixed(1)} horas = <Text span fw={900} c="dark.8">${chuto.posTotal.toFixed(2)}</Text>
                                                                        </Table.Td></Table.Tr>
                                                                    </React.Fragment>
                                                                ))}

                                                                {/* DESGLOSE DE BATEAS */}
                                                                {bateasMatematica.map((batea, idx) => (
                                                                    <React.Fragment key={`pos-batea-${idx}`}>
                                                                        <Table.Tr><Table.Td pl={60} fw={900} c="dark.8" style={{ borderBottom: 'none', paddingTop: 16 }} colSpan={2}>🛤️ {batea.nombre} (Tarifa Total: ${batea.posHora.toFixed(2)}/hr)</Table.Td><Table.Td ta="right" fw={900} c="dark.8" style={{ borderBottom: 'none', paddingTop: 16 }}>${batea.posTotal.toFixed(2)}</Table.Td></Table.Tr>
                                                                        <Table.Tr><Table.Td pl={80} c="dimmed" style={{ borderBottom: 'none', paddingBottom: 2, paddingTop: 2 }} colSpan={3} fz="sm">
                                                                            • <Text span fw={700}>Depreciación:</Text> (${batea.valor.toLocaleString()} - Salvamento ${batea.salvamento.toLocaleString()}) ÷ ({batea.vida} años × {batea.horasAnuales} hrs/año) = <Text span fw={800} c="dark.6">${batea.depHora.toFixed(2)}/hr</Text>
                                                                        </Table.Td></Table.Tr>
                                                                        <Table.Tr><Table.Td pl={80} c="dimmed" style={{ borderBottom: 'none', paddingBottom: 2, paddingTop: 2 }} colSpan={3} fz="sm">
                                                                            • <Text span fw={700}>Costo Capital:</Text> (${batea.valor.toLocaleString()} × {tasaInteres}% anual) ÷ {batea.horasAnuales} hrs/año = <Text span fw={800} c="dark.6">${batea.intHora.toFixed(2)}/hr</Text>
                                                                        </Table.Td></Table.Tr>
                                                                        <Table.Tr><Table.Td pl={80} c="dark.5" style={{ borderBottom: 'none', paddingBottom: 16, paddingTop: 2 }} colSpan={3} fz="sm">
                                                                            <Text span fw={700}>↳ Total Remolque:</Text> (${batea.depHora.toFixed(2)} + ${batea.intHora.toFixed(2)}) × {tiempoMision.toFixed(1)} horas = <Text span fw={900} c="dark.8">${batea.posTotal.toFixed(2)}</Text>
                                                                        </Table.Td></Table.Tr>
                                                                    </React.Fragment>
                                                                ))}
                                                            </>
                                                        )}

                                                    </Table.Tbody>

                                                    <Table.Tfoot>
                                                        <Table.Tr bg="dark.8">
                                                            <Table.Th colSpan={2} ta="right" fz="xl" c="white" tt="uppercase" style={{ letterSpacing: '1px' }}>COSTO OPERATIVO BASE (Break-Even):</Table.Th>
                                                            <Table.Th ta="right" fz="xl" c="yellow.5" style={{ fontSize: '2.5rem' }}>${estimacion.costoTotal.toFixed(2)}</Table.Th>
                                                        </Table.Tr>
                                                    </Table.Tfoot>
                                                </Table>
                                            </Box>
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                </Accordion>

                                <Grid align="center" gutter="xl">
                                    <Grid.Col span={{ base: 12, md: 5 }}>
                                        <Paper withBorder p="xl" radius="md" h="100%" shadow="sm" bg="white" style={{ borderTop: '8px solid #2f9e44' }}>
                                            <Text fw={900} c="dark.8" size="xl" tt="uppercase" mb="xl">Control de Rentabilidad</Text>
                                            <Stack gap="xl">
                                                <Box>
                                                    <Group justify="space-between" mb="xs">
                                                        <Text size="lg" fw={900} c="dark.7">Margen de Ganancia Comercial</Text>
                                                        <Badge color="green.7" size="xl" radius="sm" variant="filled" style={{ fontSize: '1.2rem', padding: '16px 12px' }}>{valorVisualMargen}%</Badge>
                                                    </Group>
                                                    <Slider
                                                        color="green.6" size="xl"
                                                        value={valorVisualMargen} onChange={setValorVisualMargen}
                                                        onChangeEnd={(val) => form.setFieldValue("margenGanancia", val)}
                                                        step={1} min={0} max={500}
                                                        marks={[{ value: 30, label: <Text fw={800}>30%</Text> }, { value: 100, label: <Text fw={800}>100%</Text> }, { value: 500, label: <Text fw={800}>500%</Text> }]}
                                                    />
                                                </Box>
                                                <Box mt="xl">
                                                    <Group justify="space-between" mb="xs">
                                                        <Text size="lg" fw={900} c="dark.7">Calidad Repuestos Asignada</Text>
                                                        <Badge variant="filled" color="dark.5" size="xl" radius="sm">{valorVisualRepuestos}%</Badge>
                                                    </Group>
                                                    <Slider
                                                        color="dark.4" size="lg"
                                                        value={valorVisualRepuestos} onChange={setValorVisualRepuestos}
                                                        onChangeEnd={(val) => form.setFieldValue("calidadRepuestos", val)}
                                                        step={10} marks={[{ value: 0, label: <Text fw={700}>Económico</Text> }, { value: 100, label: <Text fw={700}>Original</Text> }]}
                                                    />
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    </Grid.Col>

                                    <Grid.Col span={{ base: 12, md: 7 }}>
                                        <Paper withBorder p="xl" radius="md" bg="white" shadow="md" style={{ borderLeft: '12px solid #fab005' }}>
                                            <Stack gap="lg">
                                                <Group justify="space-between" style={{ borderBottom: '2px dashed #adb5bd', paddingBottom: '16px' }}>
                                                    <Text size="xl" fw={900} c="dark.6" tt="uppercase">Costo Operativo Convoy:</Text>
                                                    <Text size="xl" fw={900} c="dark.9" style={{ fontSize: '2rem' }}>${estimacion.costoTotal.toFixed(2)}</Text>
                                                </Group>
                                                <Group justify="space-between" style={{ borderBottom: '2px dashed #adb5bd', paddingBottom: '16px' }}>
                                                    <Text size="xl" fw={900} c="green.8" tt="uppercase">+ Ganancia Comercial Esperada:</Text>
                                                    <Text size="xl" fw={900} c="green.8" style={{ fontSize: '2rem' }}>${estimacion.gananciaBase.toFixed(2)}</Text>
                                                </Group>

                                                <Box ta="right" mt="xl">
                                                    <Text size="xl" tt="uppercase" fw={900} c="dark.4" mb={8} style={{ letterSpacing: '2px' }}>Tarifa Final Sugerida al Cliente</Text>
                                                    <Text style={{ fontSize: '5.5rem', lineHeight: '1' }} fw={900} c="dark.9">
                                                        ${estimacion.precioSugerido.toFixed(2)}
                                                    </Text>
                                                    <Group justify="flex-end" mt="lg">
                                                        {estimacion?.infoTarifa?.esMinima ? (
                                                            <Badge color="orange.6" size="xl" radius="sm" variant="filled" style={{ padding: '20px 16px', fontSize: '1.2rem' }}>TARIFA MÍNIMA APLICADA</Badge>
                                                        ) : (
                                                            <Badge color="green.7" size="xl" radius="sm" variant="filled" style={{ padding: '20px 16px', fontSize: '1.2rem' }}>TARIFA RENTABLE GARANTIZADA</Badge>
                                                        )}
                                                    </Group>
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    </Grid.Col>
                                </Grid>
                            </Stack>
                        )}
                    </Paper>

                    <Box px="xl" pb="xl">
                        <Grid align="center">
                            <Grid.Col span={{ base: 12, md: 4 }}>
                                <Button
                                    fullWidth variant="outline" color="dark.8"
                                    onClick={handleGenerarCotizacionPDF} loading={generandoPDF} leftSection={<IconFileInvoice size={28} />}
                                    style={{ height: '100px', fontSize: '1.4rem', fontWeight: 900, border: '2px solid #343a40' }}
                                >
                                    Descargar PDF Comercial
                                </Button>
                            </Grid.Col>

                            <Grid.Col span={{ base: 12, md: 8 }}>
                                <Button
                                    fullWidth radius="md" type="submit" loading={submitting} disabled={generandoPDF}
                                    leftSection={<IconSteeringWheel size={36} />} color="yellow.6" c="dark.9"
                                    style={{ height: '100px', fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', boxShadow: '0 12px 24px rgba(0,0,0,0.25)' }}
                                >
                                    Guardar Convoy e Iniciar Operación
                                </Button>
                            </Grid.Col>
                        </Grid>
                    </Box>
                </Stack>
            </Box>
        </form>
    );
}