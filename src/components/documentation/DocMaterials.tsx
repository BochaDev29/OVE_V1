import { useEffect, useState } from 'react';
import { Plus, Trash2, Download, FileText, Eye } from 'lucide-react';
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

interface DocMaterialsProps {
    project: any;
    value: any[];
    onChange: (val: any[]) => void;
}

interface MaterialItem {
    id: string;
    category: string;
    description: string;
    unit: string;
    quantity: number | string; // Allow empty string for user input
    isManual?: boolean;
}

export default function DocMaterials({ project, value, onChange }: DocMaterialsProps) {
    const [items, setItems] = useState<MaterialItem[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    // Sync external value with internal state
    useEffect(() => {
        if (value && value.length > 0) {
            setItems(value);
        } else if (project) {
            calculateInitialMaterials();
        }
    }, [project]);

    // Update parent when items change
    useEffect(() => {
        if (items.length > 0) {
            onChange(items);
        }
    }, [items]);

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
                generarDescripcionConNorma(m),
                m.unidad,
                m.cantidad
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

    const createItem = (cat: string, desc: string, unit: string, qty: number | string): MaterialItem => {
        return {
            id: Math.random().toString(36).substr(2, 9),
            category: cat,
            description: desc,
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
        return (
            <div className="space-y-6">
                <div className="text-center border-b pb-6">
                    <h1 className="text-3xl font-bold mb-2">CÓMPUTO DE MATERIALES</h1>
                    <p className="text-slate-600">Listado de Materiales</p>
                </div>

                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="border border-slate-300 px-3 py-2 text-left">Rubro</th>
                            <th className="border border-slate-300 px-3 py-2 text-left">Descripción</th>
                            <th className="border border-slate-300 px-3 py-2 text-center">Unidad</th>
                            <th className="border border-slate-300 px-3 py-2 text-center">Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx}>
                                <td className="border border-slate-300 px-3 py-2 font-semibold">{item.category}</td>
                                <td className="border border-slate-300 px-3 py-2">{item.description}</td>
                                <td className="border border-slate-300 px-3 py-2 text-center">{item.unit}</td>
                                <td className="border border-slate-300 px-3 py-2 text-center font-bold">{item.quantity}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const clientName = project?.wizardData?.config?.clientName || 'Proyecto';

        // @ts-ignore
        addPDFCoverPage(doc, "CÓMPUTO DE MATERIALES", project, null);

        // Agrupar por categoría par orden visual, o usar orden de lista? 
        // El usuario pidió "Tabla interactiva", asumimos el orden de la tabla.
        // Pero jspdf-autotable maneja arrays.

        const tableBody = items.map(item => [
            item.category,
            item.description,
            item.unit,
            item.quantity || '-'
        ]);

        // @ts-ignore
        autoTable(doc, {
            startY: 20,
            head: [['Rubro', 'Descripción', 'Unidad', 'Cantidad']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [52, 73, 94] },
            styles: { fontSize: 10 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 40 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
            }
        });

        // Disclaimer Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100);
        doc.text("NOTA: El presente listado es indicativo. Las cantidades definitivas deben ser verificadas en obra por el instalador responsable.", 105, pageHeight - 15, { align: "center" });

        doc.save(`Materiales_${clientName}.pdf`);
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
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 w-1/6">Rubro</th>
                            <th className="px-4 py-3 w-2/5">Descripción</th>
                            <th className="px-4 py-3 w-24 text-center">Unidad</th>
                            <th className="px-4 py-3 w-32 text-center">Cantidad</th>
                            <th className="px-4 py-3 w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400">
                                    No hay materiales. Intenta recargar o agrega uno manualmente.
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 group">
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            className="w-full bg-transparent border-none focus:ring-0 text-slate-700 font-medium p-0"
                                            value={item.category}
                                            onChange={(e) => handleUpdate(item.id, 'category', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            className="w-full bg-transparent border-none focus:ring-0 text-slate-600 p-0"
                                            value={item.description}
                                            onChange={(e) => handleUpdate(item.id, 'description', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            className="w-full bg-transparent border-none focus:ring-0 text-center text-slate-500 p-0"
                                            value={item.unit}
                                            onChange={(e) => handleUpdate(item.id, 'unit', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            placeholder="-"
                                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-center font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                                            value={item.quantity}
                                            onChange={(e) => handleUpdate(item.id, 'quantity', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            title="Eliminar fila"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded border border-blue-100 flex gap-2">
                <FileText size={16} />
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
