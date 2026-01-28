/**
 * Exportación de presupuestos a PDF y Excel
 * Diferenciado por perfil fiscal del usuario
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { GeneratedBudget, BudgetLineItem, TaxStatus } from '../../types/budget';
import type { UserProfile } from '../../services/profile.service';
import { addPDFCoverPage } from '../pdf-utils';

/**
 * Exporta presupuesto a PDF diferenciado por perfil fiscal
 */
export const exportBudgetToPDF = (
    budget: {
        items: BudgetLineItem[];
        subtotal: number;
        markup_percentage: number;
        markup_amount: number;
        vat_percentage: number;
        vat_amount: number;
        total: number;
        validity_days: number;
        additional_notes?: string;
    },
    profile: UserProfile,
    projectInfo: {
        projectName?: string;
        clientName?: string;
        street?: string;
        number?: string;
        city?: string;
        province?: string;
    }
) => {
    const doc = new jsPDF();
    const taxStatus: TaxStatus = profile.tax_status || 'particular';

    // Agregar carátula profesional uniforme
    const projectData = {
        wizardData: {
            config: {
                clientName: projectInfo.clientName || 'Cliente no especificado',
                ownerDetail: {
                    street: projectInfo.street || '',
                    number: projectInfo.number || '',
                    city: projectInfo.city || '',
                    province: projectInfo.province || ''
                },
                destination: 'vivienda'
            }
        }
    };

    addPDFCoverPage(doc, 'PRESUPUESTO', projectData, profile);

    // Validez
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + budget.validity_days);

    let yPos = 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Válido hasta: ${validUntil.toLocaleDateString('es-AR')}`, 14, yPos);
    yPos += 10;

    // Calcular factor de ganancia para redistribuir en precios
    const markupFactor = 1 + (budget.markup_percentage / 100);

    // Función helper para formatear unidades
    const formatUnit = (quantity: number, unit: string): string => {
        const qty = Math.round(quantity * 100) / 100; // Redondear a 2 decimales
        const qtyStr = qty % 1 === 0 ? qty.toString() : qty.toFixed(2);

        if (unit === 'unidad') {
            return qty === 1 ? `${qtyStr} unidad` : `${qtyStr} unidades`;
        } else if (unit === 'metro') {
            return qty === 1 ? `${qtyStr} m` : `${qtyStr} m`;
        } else if (unit === 'global') {
            return 'Global';
        }
        return `${qtyStr} ${unit}`;
    };

    // Tabla de items
    const tableData: any[] = [];

    budget.items.forEach(item => {
        if (item.include_canalizacion || item.include_instalacion) {
            // Item con etapas - mostrar desglosado
            tableData.push([
                item.concept,
                formatUnit(item.quantity, item.unit),
                '',
                '', // P.U. vacío
                '' // Subtotal vacío
            ]);

            // Subfilas para etapas (con ganancia redistribuida)
            if (item.include_canalizacion) {
                const priceWithMarkup = (item.price_canalizacion || 0) * markupFactor;
                const subtotalWithMarkup = priceWithMarkup * item.quantity;
                tableData.push([
                    '    • Canalización',
                    '',
                    '',
                    `$ ${priceWithMarkup.toFixed(2)}`,
                    `$ ${subtotalWithMarkup.toFixed(2)}`
                ]);
            }
            if (item.include_instalacion) {
                const priceWithMarkup = (item.price_instalacion || 0) * markupFactor;
                const subtotalWithMarkup = priceWithMarkup * item.quantity;
                tableData.push([
                    '    • Instalación',
                    '',
                    '',
                    `$ ${priceWithMarkup.toFixed(2)}`,
                    `$ ${subtotalWithMarkup.toFixed(2)}`
                ]);
            }

            // Subtotal del item (con ganancia incluida)
            const itemSubtotalWithMarkup = item.subtotal * markupFactor;
            tableData.push([
                '',
                '',
                '',
                'Subtotal:',
                `$ ${itemSubtotalWithMarkup.toFixed(2)}`
            ]);
        } else {
            // Item tradicional sin etapas (con ganancia redistribuida)
            const priceWithMarkup = item.unit_price * markupFactor;
            const subtotalWithMarkup = item.subtotal * markupFactor;
            tableData.push([
                item.concept,
                formatUnit(item.quantity, item.unit),
                '',
                `$ ${priceWithMarkup.toFixed(2)}`,
                `$ ${subtotalWithMarkup.toFixed(2)}`
            ]);
        }
    });

    autoTable(doc, {
        startY: yPos,
        head: [['Concepto', 'Cantidad', '', 'P.U.', 'Subtotal']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 9
        },
        columnStyles: {
            0: { cellWidth: 90 },
            1: { halign: 'center', cellWidth: 30 },
            2: { cellWidth: 0 }, // Columna oculta
            3: { halign: 'right', cellWidth: 30 },
            4: { halign: 'right', cellWidth: 40 }
        },
        didParseCell: function (data) {
            // Estilo para subfilas de etapas
            if (data.row.index > 0 && data.cell.text[0]?.startsWith('    •')) {
                data.cell.styles.fontSize = 9;
                data.cell.styles.textColor = [70, 70, 70];
            }
            // Estilo para fila de subtotal
            if (data.cell.text[0] === 'Subtotal:') {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 9;
            }
        }
    });

    // Notas adicionales (si existen)
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    if (budget.additional_notes && budget.additional_notes.trim()) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(70, 70, 70);

        const notesLines = doc.splitTextToSize(`Notas: ${budget.additional_notes}`, 180);
        doc.text(notesLines, 14, finalY);
        finalY += (notesLines.length * 5) + 10;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
    }

    // Totales
    const rightX = 200;

    doc.setFontSize(10);

    // Subtotal (ya incluye ganancia redistribuida)
    const subtotalWithMarkup = budget.subtotal * (1 + budget.markup_percentage / 100);
    doc.text('Subtotal:', rightX - 60, finalY, { align: 'right' });
    doc.text(`$ ${subtotalWithMarkup.toFixed(2)}`, rightX, finalY, { align: 'right' });

    // Ganancia OCULTA - ya redistribuida en precios
    // doc.text(`Ganancia (${budget.markup_percentage}%):`, rightX - 60, finalY + 6, { align: 'right' });
    // doc.text(`$ ${budget.markup_amount.toFixed(2)}`, rightX, finalY + 6, { align: 'right' });

    let totalY = finalY + 6;

    // IVA - Solo para Responsable Inscripto
    if (taxStatus === 'responsable_inscripto') {
        doc.text(`IVA (${budget.vat_percentage}%):`, rightX - 60, totalY, { align: 'right' });
        doc.text(`$ ${budget.vat_amount.toFixed(2)}`, rightX, totalY, { align: 'right' });
        totalY += 6;
    } else if (taxStatus === 'monotributista') {
        // Leyenda para Monotributista
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('(IVA incluido - Monotributista)', rightX - 60, totalY, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        totalY += 6;
    }

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', rightX - 60, totalY, { align: 'right' });
    doc.text(`$ ${budget.total.toFixed(2)}`, rightX, totalY, { align: 'right' });

    // Leyenda para Particular
    if (taxStatus === 'particular') {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        const pageHeight = doc.internal.pageSize.height;
        doc.text(
            'Presupuesto para fines informativos. No válido como factura.',
            doc.internal.pageSize.width / 2,
            pageHeight - 20,
            { align: 'center' }
        );
    }

    // Guardar
    doc.save(`presupuesto_${Date.now()}.pdf`);
};

/**
 * Exporta presupuesto a Excel (CSV)
 */
export const exportBudgetToExcel = (
    budget: {
        items: BudgetLineItem[];
        subtotal: number;
        markup_percentage: number;
        markup_amount: number;
        vat_percentage: number;
        vat_amount: number;
        total: number;
        validity_days: number;
    },
    profile: UserProfile,
    projectInfo: {
        projectName?: string;
        clientName?: string;
    }
) => {
    const taxStatus: TaxStatus = profile.tax_status || 'particular';
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + budget.validity_days);

    let csv = 'PRESUPUESTO\n';
    csv += `Fecha:,${new Date().toLocaleDateString()}\n`;
    csv += `Válido hasta:,${validUntil.toLocaleDateString()}\n`;
    csv += '\n';

    // Datos del profesional
    if (profile.business_name) {
        csv += `Empresa:,${profile.business_name}\n`;
    }

    // Categoría profesional
    const category = (profile as any).professional_category;
    if (profile.license_number) {
        let credentialLabel = 'Credencial:';
        if (category === 'ingeniero' || category === 'tecnico') {
            credentialLabel = 'Matrícula:';
        } else if (category === 'electricista_habilitado') {
            credentialLabel = 'Habilitación:';
        }
        csv += `${credentialLabel},${profile.license_number}\n`;
    }
    if (taxStatus !== 'particular' && profile.tax_id) {
        csv += `CUIT:,${profile.tax_id}\n`;
    }
    csv += '\n';

    // Datos del proyecto
    if (projectInfo.projectName) {
        csv += `Proyecto:,${projectInfo.projectName}\n`;
    }
    if (projectInfo.clientName) {
        csv += `Cliente:,${projectInfo.clientName}\n`;
    }
    csv += '\n';

    // Items
    csv += 'Concepto,Cantidad,Unidad,Precio Unitario,Subtotal\n';
    budget.items.forEach(item => {
        csv += `"${item.concept}",${item.quantity},${item.unit},${item.unit_price.toFixed(2)},${item.subtotal.toFixed(2)}\n`;
    });
    csv += '\n';

    // Totales
    csv += `Subtotal:,,,,$${budget.subtotal.toFixed(2)}\n`;
    csv += `Ganancia (${budget.markup_percentage}%):,,,,$${budget.markup_amount.toFixed(2)}\n`;

    if (taxStatus === 'responsable_inscripto') {
        csv += `IVA (${budget.vat_percentage}%):,,,,$${budget.vat_amount.toFixed(2)}\n`;
    } else if (taxStatus === 'monotributista') {
        csv += `(IVA incluido - Monotributista)\n`;
    }

    csv += `TOTAL:,,,,$${budget.total.toFixed(2)}\n`;

    if (taxStatus === 'particular') {
        csv += '\n';
        csv += 'Presupuesto para fines informativos. No válido como factura.\n';
    }

    // Descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `presupuesto_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
