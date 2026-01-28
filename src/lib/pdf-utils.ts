import jsPDF from 'jspdf';
import { ProjectConfig } from './electrical-rules';

// Simple types based on services
export interface PDFUserProfile {
    business_name: string;
    license_number: string;
    phone: string;
    email: string;
}

export interface PDFProjectData {
    wizardData: {
        config: ProjectConfig;
    };
}

/**
 * Agrega una carátula estandarizada a un documento jsPDF.
 * @param doc Instancia de jsPDF
 * @param title Título Principal (ej: "MEMORIA TÉCNICA")
 * @param project Datos del Proyecto
 * @param profile Datos del Matriculado
 */
export const addPDFCoverPage = (
    doc: jsPDF,
    title: string,
    project: any,
    profile?: any
) => {
    const pageWidth = doc.internal.pageSize.width; // 210mm A4
    const pageHeight = doc.internal.pageSize.height; // 297mm A4
    const config = project?.wizardData?.config || {};
    const owner = config.ownerDetail || {};

    // 1. MARCO DECORATIVO
    const margin = 10;
    doc.setLineWidth(0.5);
    doc.setDrawColor(44, 62, 80); // Dark Blue
    doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));
    // Inner line
    doc.setLineWidth(0.2);
    doc.rect(margin + 2, margin + 2, pageWidth - (margin * 2) - 4, pageHeight - (margin * 2) - 4);

    // 2. ENCABEZADO INSTITUCIONAL
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text("OVE", pageWidth / 2, 40, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("OFICINA VIRTUAL ELÉCTRICA", pageWidth / 2, 46, { align: "center" });

    doc.setDrawColor(200);
    doc.line(60, 52, 150, 52);

    // 3. TÍTULO DEL DOCUMENTO
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(0);
    doc.text(title.toUpperCase(), pageWidth / 2, 90, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("DOCUMENTACIÓN TÉCNICA", pageWidth / 2, 100, { align: "center" });

    // 4. DATOS DEL PROYECTO (Recuadro Central)
    const boxY = 130;
    const boxHeight = 60;
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, boxY, 130, boxHeight, 3, 3, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text("INFORMACIÓN DE LA OBRA", pageWidth / 2, boxY + 10, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0);

    const client = config.clientName || owner.dniCuit || "Cliente no especificado";
    const address = `${owner.street || ''} ${owner.number || ''} ${owner.floor ? 'Piso ' + owner.floor : ''}`.trim() || "-";
    const city = `${owner.city || 'Córdoba'}, ${owner.province || 'Córdoba'}`;
    const type = config.destination ? config.destination.toUpperCase() : "VIVIENDA";

    // Centered list
    let textY = boxY + 25;
    const lineHeight = 7;

    // Helper para centrar par clave-valor (aprox)
    const labelX = 60;
    const valueX = 100;

    doc.setFont("helvetica", "bold");
    doc.text("Solicitante:", 85, textY, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(client, 90, textY);

    textY += lineHeight;
    doc.setFont("helvetica", "bold");
    doc.text("Ubicación:", 85, textY, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(address, 90, textY);

    textY += lineHeight;
    doc.setFont("helvetica", "bold");
    doc.text("Localidad:", 85, textY, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(city, 90, textY);

    textY += lineHeight;
    doc.setFont("helvetica", "bold");
    doc.text("Destino:", 85, textY, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(type, 90, textY);


    // 5. DATOS DEL RESPONSABLE (Pie)
    const getCategoryLabel = (category: string | undefined, licenseNumber: string) => {
        switch (category) {
            case 'ingeniero':
                return licenseNumber
                    ? `Ingeniero - Mat. ${licenseNumber}`
                    : 'Ingeniero';

            case 'tecnico':
                return licenseNumber
                    ? `Técnico - Mat. ${licenseNumber}`
                    : 'Técnico';

            case 'electricista_habilitado':
                return licenseNumber
                    ? `Electricista Habilitado - Hab. ${licenseNumber}`
                    : 'Electricista Habilitado';

            case 'instalador':
            default:
                return licenseNumber
                    ? `Instalador - ${licenseNumber}`
                    : 'Instalador';
        }
    };

    const profName = profile?.business_name || "Instalador Habilitado";
    const profLabel = getCategoryLabel(
        (profile as any)?.professional_category,
        profile?.license_number || ''
    );
    const profContact = profile?.email || profile?.phone || "";

    const footerBoxY = 220;
    doc.setDrawColor(44, 62, 80);
    doc.setLineWidth(0.5);
    doc.line(60, footerBoxY, 150, footerBoxY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(profName.toUpperCase(), pageWidth / 2, footerBoxY + 8, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(profLabel, pageWidth / 2, footerBoxY + 14, { align: "center" });

    if (profContact) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(profContact, pageWidth / 2, footerBoxY + 20, { align: "center" });
    }

    // 6. DATE AND INFO FOOTER
    const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Emisión: ${today}`, margin + 5, pageHeight - margin - 5);
    doc.text("Generado por OVE - Software de Gestión", pageWidth - margin - 5, pageHeight - margin - 5, { align: "right" });

    // 7. DISCLAIMER LEGAL
    const disclaimerY = pageHeight - margin - 15;
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.setFont("helvetica", "italic");

    const disclaimerText = [
        "IMPORTANTE: Este documento fue generado por OVE, una herramienta de cálculo y documentación.",
        "OVE NO emite certificados. El instalador electricista es el único responsable de verificar, firmar",
        "y presentar esta documentación. Los cálculos se basan en AEA 90364 y deben ser validados por el profesional."
    ];

    disclaimerText.forEach((line, index) => {
        doc.text(line, pageWidth / 2, disclaimerY + (index * 3), { align: "center" });
    });

    // PAGE BREAK
    doc.addPage();
};

/**
 * Agrega una imagen del Canvas (plano/unifilar) a un PDF con carátula profesional
 * @param doc Instancia de jsPDF
 * @param title Título del documento (ej: "PLANO DE PLANTA", "ESQUEMA UNIFILAR")
 * @param imageDataURL Data URL de la imagen del canvas (canvas.toDataURL('image/png'))
 * @param project Datos del Proyecto
 * @param profile Datos del Matriculado
 */
export const addCanvasImageToPDF = (
    doc: jsPDF,
    title: string,
    imageDataURL: string,
    project: any,
    profile?: any
) => {
    // 1. Agregar carátula profesional
    addPDFCoverPage(doc, title, project, profile);

    // 2. Agregar imagen del canvas
    const pageWidth = doc.internal.pageSize.width; // 210mm A4
    const pageHeight = doc.internal.pageSize.height; // 297mm A4
    const margin = 15;

    // Calcular dimensiones para la imagen (mantener aspecto)
    const maxWidth = pageWidth - (margin * 2);
    const maxHeight = pageHeight - (margin * 3) - 20; // Espacio para leyenda

    // Agregar imagen centrada
    try {
        doc.addImage(
            imageDataURL,
            'PNG',
            margin,
            margin,
            maxWidth,
            maxHeight,
            undefined,
            'FAST'
        );
    } catch (error) {
        console.error('Error al agregar imagen al PDF:', error);
        // Agregar mensaje de error en el PDF
        doc.setFontSize(12);
        doc.setTextColor(200, 0, 0);
        doc.text('Error: No se pudo cargar la imagen del plano', pageWidth / 2, pageHeight / 2, { align: 'center' });
    }

    // 3. Leyenda inferior
    const legendY = pageHeight - margin - 10;

    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(margin, legendY - 5, pageWidth - margin, legendY - 5);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
        'Plano generado automáticamente desde Taller CAD - OVE',
        pageWidth / 2,
        legendY,
        { align: 'center' }
    );

    doc.setFontSize(7);
    doc.setTextColor(150);
    const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Fecha de generación: ${today}`, pageWidth / 2, legendY + 5, { align: 'center' });
};
