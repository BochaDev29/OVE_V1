import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Download, FileText, Eye, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPDFCoverPage } from '../../lib/pdf-utils';
import { PDFPreview } from '../common/PDFPreview';
import {
    calcularMaterialesPorCircuito,
    consolidarMateriales,
    getMaterialesPAT,
    getPanelHardwareMaterials,
    generarDescripcionConNorma,
    MaterialCalculado
} from '../../lib/materials-consolidation';

export interface DocDataMaterials {
    items: MaterialItem[];
    notes: string;
}

interface DocMaterialsProps {
    project: any;
    value: DocDataMaterials | any[];
    onChange: (val: DocDataMaterials) => void;
}

interface MaterialItem {
    id: string;
    rubro: string;
    category: string;
    description: string;
    norma: string;
    unit: string;
    quantity: number | string;
    isManual?: boolean;
}

export default function DocMaterials({ project, value, onChange }: DocMaterialsProps) {
    const [items, setItems] = useState<MaterialItem[]>([]);
    const [notes, setNotes] = useState<string>('');
    const [showPreview, setShowPreview] = useState(false);

    // Sync external value with internal state
    useEffect(() => {
        if (value) {
            if (Array.isArray(value)) {
                // Formato antiguo: solo items
                if (value.length > 0) setItems(value);
            } else {
                // Nuevo formato: objeto con items y notas
                if (value.items) setItems(value.items);
                if (value.notes !== undefined) setNotes(value.notes);
            }
        }

        const shouldCalculate = !value ||
            (Array.isArray(value) && value.length === 0) ||
            (!Array.isArray(value) && (!value.items || value.items.length === 0));

        if (shouldCalculate && project) {
            calculateInitialMaterials();
        }
    }, [project]);

    // Update parent when items or notes change
    useEffect(() => {
        if (items.length > 0 || notes) {
            onChange({ items, notes });
        }
    }, [items, notes]);

    const calculateInitialMaterials = async () => {
        try {
            const todosLosMateriales: MaterialCalculado[] = [];
            const config = project.wizardData?.config || {};
            const calculation = project.wizardData?.calculation || {};

            // 0. Preparar datos y módulos
            const module = await import('../../lib/electrical-rules');

            const materialesPorCircuito = module.LOADED_MATERIALES_POR_CIRCUITO || [];
            const materialesGenerales = module.LOADED_MATERIALES_GENERALES || [];
            const materialesPAT = module.LOADED_MATERIALES_PAT || [];

            const isTrifasico = config.voltage === '380V';

            // 1. MATERIALES DE ACOMETIDA (solo si includesPillar === true)
            if (config.includesPillar && config.acometida?.tipo) {
                const matsAcometida = module.getMaterialesAcometida(config.acometida.tipo);
                const isProvisoria = config.estadoObra === 'provisoria';

                matsAcometida.forEach(m => {
                    // Si es provisoria, solo permitimos Clase II (MN 127/128 o materiales sintéticos)
                    if (isProvisoria && m.categoria === 'Gabinete' &&
                        !m.norma_referencia.includes('MN 127') && !m.norma_referencia.includes('MN 128')) {
                        return;
                    }

                    todosLosMateriales.push({
                        codigo_material: String(m.codigo_material || `${m.codigo_acometida}_${m.item_numero}`),
                        categoria: m.categoria,
                        descripcion: m.descripcion_material,
                        especificacion_tecnica: '',
                        norma_referencia: m.norma_referencia,
                        unidad: m.unidad,
                        cantidad: m.cantidad,
                        observaciones: m.observaciones
                    });
                });
            }

            // 2. LÍNEA PRINCIPAL (LP) - Solo si includesPillar === true
            if (config.includesPillar && config.acometida?.longitud) {
                const lpMats = calcularMaterialesPorCircuito(
                    'LP',
                    0,
                    config.acometida.canalizacion || 'Embutido',
                    materialesPorCircuito,
                    materialesGenerales,
                    { longitud_acometida: config.acometida.longitud, isTrifasico }
                );
                todosLosMateriales.push(...lpMats);
            }

            // 3. CIRCUITOS SECCIONALES (CS) Y CIRCUITOS GENERALES
            const panels = config.panels || [];
            panels.forEach((panel: any) => {
                const panelMethod = panel.installationType || 'Embutido';

                // Circuito Seccional (si tiene distancia al padre)
                if (panel.feederDistance > 0) {
                    const csMats = calcularMaterialesPorCircuito(
                        'CS',
                        0,
                        panelMethod,
                        materialesPorCircuito,
                        materialesGenerales,
                        { longitud_cs: panel.feederDistance, isTrifasico }
                    );
                    todosLosMateriales.push(...csMats);
                }

                // 3.0 HARDWARE DE TABLERO (Gabinete, PIA Cabecera, ID Cabecera, PAT Kit)
                const panelHardware = getPanelHardwareMaterials(panel, materialesGenerales);
                todosLosMateriales.push(...panelHardware);

            });

            // 3.1 MATERIALES DE MONTAJE DE OBRA (SI ES PROVISORIA)
            if (config.estadoObra === 'provisoria') {
                const obraMats = calcularMaterialesPorCircuito(
                    'OBRA_MONTAJE',
                    1,
                    'Exterior',
                    materialesPorCircuito,
                    materialesGenerales
                );
                todosLosMateriales.push(...obraMats);
            }

            // Circuitos del cálculo
            const circuits = calculation.circuits || [];
            circuits.forEach((circuito: any) => {
                const circuitMats = calcularMaterialesPorCircuito(
                    circuito.type || 'TUG',
                    circuito.bocas || 1,
                    config.installationType || 'Embutido',
                    materialesPorCircuito,
                    materialesGenerales,
                    { isTrifasico },
                    {
                        cableSection: circuito.cable,
                        breakerValue: circuito.breaker
                    }
                );
                todosLosMateriales.push(...circuitMats);
            });

            // 4. MATERIALES PAT
            // PAT DEL USUARIO: Siempre se incluye (protección de personas)
            if (materialesPAT.length > 0 && materialesGenerales.length > 0) {
                const matsPATUsuario = getMaterialesPAT('PAT_USUARIO', materialesPAT, materialesGenerales);
                todosLosMateriales.push(...matsPATUsuario);

                // PAT DE SERVICIO: Solo si includesPillar === true Y acometida es Clase I
                // (Clase I = acometidas viejas con caños metálicos o gabinetes de fundición)
                if (config.includesPillar && config.acometida?.clase === 'I') {
                    const matsPATServicio = getMaterialesPAT('PAT_SERVICIO', materialesPAT, materialesGenerales);
                    todosLosMateriales.push(...matsPATServicio);
                }
            }

            // 5. CONSOLIDAR Y ACTUALIZAR ESTADO
            const consolidado = consolidarMateriales(todosLosMateriales);
            const newItems: MaterialItem[] = consolidado.map(m => createItem(
                m.categoria,
                m.descripcion,
                m.unidad,
                m.cantidad,
                m.norma_referencia,
                m.especificacion_tecnica
            ));

            setItems(newItems);
            console.log('✅ Materiales cargados dinámicamente:', newItems.length);

        } catch (error) {
            console.error('❌ Error en calculateInitialMaterials:', error);
            // Fallback mínimo si todo falla
            setItems([
                createItem('Error', 'No se pudieron cargar los materiales. Verifique la consola.', 'u', 1)
            ]);
        }
    };

    const mapCategoryToRubro = (cat: string): string => {
        const c = cat.toUpperCase();
        if (c.includes('GABINETE') || c.includes('PROTECCI') || c.includes('TABLERO') || c.includes('PIA') || c.includes('ID')) return '1. Protecciones y Tableros';
        if (c.includes('CABLE') || c.includes('CONDUCTOR')) return '2. Cables y Conductores';
        if (c.includes('CANO') || c.includes('CAJA') || c.includes('CAÑER') || c.includes('ACCESORIO')) return '3. Canalizaciones y Accesorios';
        if (c.includes('MODULO') || c.includes('TECLA') || c.includes('TOMA') || c.includes('BASTIDOR')) return '4. Módulos y Bastidores';
        return '5. Varios y Servicios';
    };

    const createItem = (cat: string, desc: string, unit: string, qty: number | string, norma: string = '', spec: string = ''): MaterialItem => {
        let fullDesc = desc;
        if (spec && spec !== desc) {
            fullDesc = `${desc} (${spec})`;
        }

        return {
            id: Math.random().toString(36).substr(2, 9),
            rubro: mapCategoryToRubro(cat),
            category: cat,
            description: fullDesc,
            norma: norma || 'S/N',
            unit,
            quantity: qty
        };
    };

    const handleUpdate = (id: string, field: keyof MaterialItem, val: any) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
    };

    const handleAddItem = () => {
        const newItem = createItem('Varios', 'Nuevo Material...', 'u', 1);
        newItem.isManual = true;
        setItems([...items, newItem]);
    };

    const handleDelete = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const renderPreviewContent = () => {
        const itemsByRubro = items.reduce((acc, item) => {
            if (!acc[item.rubro]) acc[item.rubro] = [];
            acc[item.rubro].push(item);
            return acc;
        }, {} as Record<string, MaterialItem[]>);

        return (
            <div className="space-y-6">
                <div className="text-center border-b pb-6">
                    <h1 className="text-2xl font-bold mb-1 uppercase text-slate-900 leading-tight">Planilla de Materiales y Especificaciones Técnicas</h1>
                    <p className="text-slate-600 text-sm">Listado orientativo según proyecto - AEA 90364</p>
                </div>

                {Object.entries(itemsByRubro).sort().map(([rubro, rubroItems]) => (
                    <div key={rubro} className="space-y-2">
                        <h3 className="font-black text-slate-800 border-l-4 border-blue-600 pl-2 text-sm uppercase">{rubro}</h3>
                        <table className="w-full text-[10px] border-collapse">
                            <thead>
                                <tr className="bg-slate-100 italic">
                                    <th className="border border-slate-300 px-2 py-1 text-left w-8">#</th>
                                    <th className="border border-slate-300 px-2 py-1 text-center w-12">Cant.</th>
                                    <th className="border border-slate-300 px-2 py-1 text-center w-10">Unid.</th>
                                    <th className="border border-slate-300 px-2 py-1 text-left">Descripción del Material</th>
                                    <th className="border border-slate-300 px-2 py-1 text-left w-1/4">Norma Técnica / Certificación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rubroItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-slate-300 px-2 py-1 text-center text-slate-400">{idx + 1}</td>
                                        <td className="border border-slate-300 px-2 py-1 text-center font-bold">{item.quantity}</td>
                                        <td className="border border-slate-300 px-2 py-1 text-center">{item.unit}</td>
                                        <td className="border border-slate-300 px-2 py-1">{item.description}</td>
                                        <td className="border border-slate-300 px-2 py-1 text-slate-600 font-medium">{item.norma}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}

                {notes && (
                    <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <h4 className="font-bold text-slate-800 text-xs uppercase mb-2">Notas y Observaciones del Profesional:</h4>
                        <p className="text-[10px] text-slate-700 whitespace-pre-wrap leading-normal">{notes}</p>
                    </div>
                )}

                <div className="mt-8 pt-4 border-t border-slate-200">
                    <p className="text-[9px] text-slate-500 leading-relaxed italic">
                        <strong>NOTA AL PIE:</strong> Las cantidades expresadas surgen del cómputo métrico digital. Se recomienda verificar en obra antes de realizar la compra definitiva. Todos los materiales adquiridos deben exhibir el Sello de Seguridad Eléctrica según Res. 169/2018.
                    </p>
                </div>
            </div>
        );
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const clientName = project?.wizardData?.config?.clientName || 'Proyecto';

        // @ts-ignore
        addPDFCoverPage(doc, "PLANILLA DE MATERIALES", project, null);

        // Agrupar por rubro para el PDF
        const itemsByRubro = items.reduce((acc, item) => {
            if (!acc[item.rubro]) acc[item.rubro] = [];
            acc[item.rubro].push(item);
            return acc;
        }, {} as Record<string, MaterialItem[]>);

        let finalY = 20;

        Object.entries(itemsByRubro).sort().forEach(([rubro, rubroItems]) => {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(52, 73, 94);
            doc.text(rubro.toUpperCase(), 15, finalY + 5);

            const tableBody = rubroItems.map((item, idx) => [
                (idx + 1).toString(),
                item.quantity || '-',
                item.unit,
                item.description,
                item.norma || 'S/N'
            ]);

            // @ts-ignore
            autoTable(doc, {
                startY: finalY + 8,
                head: [['#', 'CANT.', 'UNID.', 'DESCRIPCIÓN DEL MATERIAL', 'NORMA TÉCNICA / CERTIF.']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [44, 62, 80], fontSize: 8 },
                styles: { fontSize: 8 },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
                    2: { cellWidth: 15, halign: 'center' },
                    3: { cellWidth: 'auto' },
                    4: { cellWidth: 45, fontSize: 7 }
                },
                margin: { left: 15, right: 15 }
            });

            // @ts-ignore
            finalY = doc.lastAutoTable.finalY + 10;

            // Si nos acercamos al final de la página, nueva página
            if (finalY > 260) {
                doc.addPage();
                finalY = 20;
            }
        });

        // Agregar Notas al PDF si existen
        if (notes) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(44, 62, 80);
            doc.text("NOTAS Y OBSERVACIONES:", 15, finalY);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(8);
            const splitNotes = doc.splitTextToSize(notes, 180);
            doc.text(splitNotes, 15, finalY + 5);

            finalY += (splitNotes.length * 4) + 15;

            if (finalY > 270) {
                doc.addPage();
                finalY = 20;
            }
        }

        // Disclaimer Footer
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(120);
        const disclaimer = [
            "NOTA: Las cantidades expresadas surgen del cómputo métrico digital. Se recomienda verificar en obra antes de realizar la compra definitiva.",
            "Todos los materiales adquiridos deben exhibir el Sello de Seguridad Eléctrica según Res. 169/2018."
        ];

        const pageHeight = doc.internal.pageSize.height;
        doc.text(disclaimer[0], 105, pageHeight - 15, { align: "center" });
        doc.text(disclaimer[1], 105, pageHeight - 11, { align: "center" });

        const projectName = project?.name || project?.wizardData?.config?.clientName || 'Proyecto';
        doc.save(`Listado_de_Materiales_${projectName}.pdf`);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">

            {/* Toolbar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center gap-2">
                    <FileText className="text-blue-600" size={24} />
                    <h2 className="text-lg font-bold text-slate-700">Listado de Materiales</h2>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleAddItem}
                        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium border border-green-200"
                    >
                        <Plus size={18} /> Agregar
                    </button>
                    <button
                        onClick={() => setShowPreview(true)}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
                    >
                        <Eye size={18} /> Vista Previa
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm hover:shadow"
                    >
                        <Download size={18} /> Descargar PDF
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800 text-slate-200 font-semibold border-b border-slate-700">
                        <tr>
                            <th className="px-3 py-3 w-1/4">Rubro / Categoría</th>
                            <th className="px-3 py-3 w-2/5">Descripción del Material</th>
                            <th className="px-3 py-3 w-1/4">Norma Técnica / Calidad</th>
                            <th className="px-3 py-3 w-16 text-center">Und.</th>
                            <th className="px-3 py-3 w-20 text-center">Cant.</th>
                            <th className="px-3 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                                    No hay materiales. Intenta recargar o agrega uno manualmente.
                                </td>
                            </tr>
                        ) : (
                            // Agrupar por rubro en la vista principal también para consistencia
                            Object.entries(items.reduce((acc, item) => {
                                if (!acc[item.rubro]) acc[item.rubro] = [];
                                acc[item.rubro].push(item);
                                return acc;
                            }, {} as Record<string, MaterialItem[]>))
                                .sort()
                                .map(([rubro, rubroItems]) => (
                                    <React.Fragment key={rubro}>
                                        <tr className="bg-slate-50 border-y border-slate-200">
                                            <td colSpan={6} className="px-3 py-2 font-black text-slate-700 uppercase tracking-tighter text-[10px]">
                                                {rubro}
                                            </td>
                                        </tr>
                                        {rubroItems.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors">
                                                <td className="px-3 py-1">
                                                    <input
                                                        type="text"
                                                        className="w-full bg-transparent border-none focus:ring-0 text-slate-500 text-[10px] p-0 italic"
                                                        value={item.category}
                                                        onChange={(e) => handleUpdate(item.id, 'category', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-3 py-1">
                                                    <input
                                                        type="text"
                                                        className="w-full bg-transparent border-none focus:ring-0 text-slate-800 font-medium p-0"
                                                        value={item.description}
                                                        onChange={(e) => handleUpdate(item.id, 'description', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-3 py-1">
                                                    <input
                                                        type="text"
                                                        className="w-full bg-transparent border-none focus:ring-0 text-blue-700 font-bold p-0"
                                                        value={item.norma}
                                                        onChange={(e) => handleUpdate(item.id, 'norma', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-3 py-1">
                                                    <input
                                                        type="text"
                                                        className="w-full bg-transparent border-none focus:ring-0 text-center text-slate-400 p-0"
                                                        value={item.unit}
                                                        onChange={(e) => handleUpdate(item.id, 'unit', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-3 py-1">
                                                    <input
                                                        type="text"
                                                        placeholder="-"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center font-black text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                                                        value={item.quantity}
                                                        onChange={(e) => handleUpdate(item.id, 'quantity', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-3 py-1 text-right">
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Eliminar fila"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* SECCIÓN DE NOTAS */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
                <div className="flex items-center gap-2 text-slate-700">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold">Notas y Observaciones Generales</h3>
                </div>
                <textarea
                    rows={4}
                    className="w-full text-sm border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 p-3 bg-slate-50/50 outline-none transition-all"
                    placeholder="Agregue aquí aclaraciones sobre marcas preferidas, plazos de entrega, o condiciones especiales de los materiales..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded border border-blue-100 flex gap-2">
                <AlertCircle size={16} />
                <p>
                    <strong>Nota:</strong> Las cantidades de conductores y cañerías se calculan automáticamente basándose en las longitudes de Línea Principal, Seccionales y bocas de circuitos. Usted puede ajustar estos valores manualmente si fuera necesario.
                </p>
            </div>

            {/* Modal de Vista Previa */}
            {showPreview && (
                <PDFPreview
                    title="Cómputo de Materiales"
                    content={renderPreviewContent()}
                    onClose={() => setShowPreview(false)}
                    onDownload={() => {
                        setShowPreview(false);
                        handleDownloadPDF();
                    }}
                />
            )}
        </div>
    );
}
