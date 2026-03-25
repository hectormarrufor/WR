import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generarPDFRequisicion = (requisicion, equipoInfo = 'No especificado', fallaInfo = '') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Encabezado de la Empresa
    doc.setFillColor(33, 37, 41); // Gris oscuro (Dark Mantine)
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text('ORDEN DE REQUISICIÓN DE MATERIALES', pageWidth / 2, 16, { align: 'center' });

    // 2. Metadatos del Documento (Lado Derecho)
    doc.setFontSize(10);
    doc.setTextColor(73, 80, 87);
    doc.setFont("helvetica", "bold");
    doc.text(`CÓDIGO:`, pageWidth - 60, 35);
    doc.text(`FECHA:`, pageWidth - 60, 42);
    doc.text(`ESTADO:`, pageWidth - 60, 49);
    
    doc.setFont("helvetica", "normal");
    doc.text(`${requisicion.codigo}`, pageWidth - 35, 35);
    doc.text(`${new Date(requisicion.fechaSolicitud || new Date()).toLocaleDateString('es-VE')}`, pageWidth - 35, 42);
    doc.text(`${requisicion.estado.toUpperCase()}`, pageWidth - 35, 49);

    // 3. Información del Solicitante y Equipo (Lado Izquierdo)
    const nombreSolicitante = requisicion.solicitante?.empleado 
        ? `${requisicion.solicitante.empleado.nombre} ${requisicion.solicitante.empleado.apellido}` 
        : requisicion.solicitante?.user || 'Usuario del Sistema';

    doc.setFont("helvetica", "bold");
    doc.text(`SOLICITADO POR:`, 14, 35);
    doc.text(`PRIORIDAD:`, 14, 42);
    doc.text(`EQUIPO DESTINO:`, 14, 49);

    doc.setFont("helvetica", "normal");
    doc.text(`${nombreSolicitante}`, 50, 35);
    doc.setTextColor(requisicion.prioridad === 'Critica' || requisicion.prioridad === 'Alta' ? 224 : 73, 
                     requisicion.prioridad === 'Critica' || requisicion.prioridad === 'Alta' ? 49 : 80, 
                     requisicion.prioridad === 'Critica' || requisicion.prioridad === 'Alta' ? 49 : 87); // Rojo si es alta/crítica
    doc.text(`${requisicion.prioridad.toUpperCase()}`, 50, 42);
    
    doc.setTextColor(73, 80, 87);
    doc.text(`${equipoInfo}`, 50, 49);

    // 4. Justificación y Contexto
    doc.setDrawColor(206, 212, 218);
    doc.line(14, 55, pageWidth - 14, 55);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text('JUSTIFICACIÓN DE LA SOLICITUD:', 14, 65);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const justificacionLines = doc.splitTextToSize(requisicion.justificacion, pageWidth - 28);
    doc.text(justificacionLines, 14, 72);

    if (fallaInfo) {
        doc.setFont("helvetica", "italic");
        const fallaLines = doc.splitTextToSize(`Reporte Original: "${fallaInfo}"`, pageWidth - 28);
        doc.text(fallaLines, 14, 74 + (justificacionLines.length * 5));
    }

    // 5. Tabla de Ítems (AutoTable)
    const startY = 85 + (justificacionLines.length * 5);
    const tableBody = requisicion.detalles.map((det, index) => [
        index + 1,
        det.consumible?.nombre || 'Ítem no especificado',
        det.consumible?.categoria?.toUpperCase() || 'GENERAL',
        `${det.cantidadSolicitada} ${det.consumible?.unidadMedida || 'und'}`
    ]);

   autoTable(doc, {
        startY: startY,
        head: [['#', 'DESCRIPCIÓN DEL COMPONENTE REQUERIDO', 'CATEGORÍA', 'CANTIDAD']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [25, 113, 194], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { fontSize: 9, cellPadding: 5, textColor: [33, 37, 41] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            2: { cellWidth: 35, halign: 'center' },
            3: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
        }
    });

    // 6. Área de Firmas
    const finalY = doc.lastAutoTable.finalY || startY + 50;
    
    doc.setDrawColor(173, 181, 189);
    doc.line(30, finalY + 40, 80, finalY + 40);
    doc.line(pageWidth - 80, finalY + 40, pageWidth - 30, finalY + 40);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text('FIRMA SOLICITANTE', 55, finalY + 45, { align: 'center' });
    doc.text('FIRMA GERENCIA / COMPRAS', pageWidth - 55, finalY + 45, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(134, 142, 150);
    doc.text(nombreSolicitante, 55, finalY + 50, { align: 'center' });

    // 7. Generar Documento
    doc.save(`${requisicion.codigo}_WR.pdf`);
};