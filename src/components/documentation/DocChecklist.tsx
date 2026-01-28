import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Download, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { ProjectService } from '../../services/project.service';
import { ProfileService } from '../../services/profile.service';
import { useAuth } from '../../contexts/AuthContext';
import { addPDFCoverPage } from '../../lib/pdf-utils';

interface DocChecklistProps {
    project?: any;
    value?: any[];
    onChange?: (val: any[]) => void;
}

interface ChecklistItem {
    numero: number;
    descripcion: string;
    verificado: boolean;
    observaciones: string;
    categoria: string;
}

const getPuntosVerificacion = (estadoObra?: string): Omit<ChecklistItem, 'verificado' | 'observaciones'>[] => {
    if (estadoObra === 'provisoria') {
        return [
            { numero: 1, descripcion: 'Estado general del tablero de obra e instalaciones moviles', categoria: 'General' },
            { numero: 2, descripcion: 'Protección diferencial 30mA presente y funcional (Obra)', categoria: 'Protecciones' },
            { numero: 3, descripcion: 'Tomacorrientes con tapas IP44/IP65 en buen estado', categoria: 'Tableros' },
            { numero: 4, descripcion: 'Sección de cables 2.5mm² mín. (Norma IRAM 2178/247-3)', categoria: 'Seguridad' },
            { numero: 5, descripcion: 'Estado de aislación de conductores (sin empalmes expuestos)', categoria: 'Conductores' },
            { numero: 6, descripcion: 'PAT obligatoria instalada e inspeccionable (Obra)', categoria: 'PAT' },
            { numero: 7, descripcion: 'Tablero señalizado con riesgo eléctrico y cerrado', categoria: 'Tableros' },
            { numero: 8, descripcion: 'Ausencia de cables tipo taller en instalación fija', categoria: 'Conductores' },
            { numero: 9, descripcion: 'Cajas de paso cerradas y estancas si están a la intemperie', categoria: 'Seguridad' },
            { numero: 10, descripcion: 'Altura de montaje de tomacorrientes (0.8m a 1.5m)', categoria: 'General' },
            { numero: 11, descripcion: 'Vencimiento de certificación (12 meses) informado', categoria: 'Administrativo' }
        ];
    }
    return [
        { numero: 1, descripcion: 'Estado general de la instalación eléctrica', categoria: 'General' },
        { numero: 2, descripcion: 'Protección diferencial (ID) presente y funcional', categoria: 'Protecciones' },
        { numero: 3, descripcion: 'Selectividad entre protecciones (In_ID ≥ In_PIA)', categoria: 'Protecciones' },
        { numero: 4, descripcion: 'Sección de cables vs corriente de protección (In ≤ Iz)', categoria: 'Seguridad' },
        { numero: 5, descripcion: 'Estado de aislación de conductores', categoria: 'Conductores' },
        { numero: 6, descripcion: 'Puesta a tierra (PAT) presente y medida', categoria: 'PAT' },
        { numero: 7, descripcion: 'Tableros con tapa y señalización adecuada', categoria: 'Tableros' },
        { numero: 8, descripcion: 'Ausencia de empalmes sin protección', categoria: 'Conductores' },
        { numero: 9, descripcion: 'Tomacorrientes con puesta a tierra', categoria: 'Bocas' },
        { numero: 10, descripcion: 'Iluminación de emergencia (si aplica)', categoria: 'Iluminación' },
        { numero: 11, descripcion: 'Cumplimiento de distancias de seguridad', categoria: 'Seguridad' }
    ];
};

export default function DocChecklist({ project: initialProject, value, onChange }: DocChecklistProps) {
    const { id } = useParams();
    const { user } = useAuth();

    const [projectData, setProjectData] = useState<any>(null);
    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    const [items, setItems] = useState<ChecklistItem[]>([]);

    useEffect(() => {
        loadData();
    }, [id, user]);

    useEffect(() => {
        if (projectData && items.length === 0) {
            const initialItems = getPuntosVerificacion(projectData.wizardData?.config?.estadoObra).map(p => ({
                ...p,
                verificado: false,
                observaciones: ''
            }));
            setItems(initialItems);
        }
    }, [projectData]);

    useEffect(() => {
        if (value && value.length > 0) {
            setItems(value);
        }
    }, [value]);

    useEffect(() => {
        if (items.length > 0 && onChange) {
            onChange(items);
        }
    }, [items]);

    const loadData = async () => {
        try {
            setLoading(true);

            let currentProject = initialProject;
            if (!currentProject && id) {
                currentProject = await ProjectService.getProjectById(id);
            }

            if (!currentProject) {
                throw new Error("No se pudo cargar el proyecto.");
            }
            setProjectData(currentProject);

            if (user) {
                const profile = await ProfileService.getProfile(user.id);
                setProfileData(profile);
            }

            // Pre-llenar con datos de existenteData si existen
            if (currentProject.wizardData?.existenteData) {
                const existenteData = currentProject.wizardData.existenteData;

                // Actualizar items con datos existentes
                setItems(prev => prev.map(item => {
                    if (item.numero === 2 && existenteData.tieneDiferencial !== undefined) {
                        return { ...item, verificado: existenteData.tieneDiferencial };
                    }
                    if (item.numero === 6 && existenteData.tienePAT !== undefined) {
                        return { ...item, verificado: existenteData.tienePAT };
                    }
                    return item;
                }));
            }

        } catch (err: any) {
            console.error("Error loading data for checklist:", err);
            setError(err.message || "Error cargando datos.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (numero: number) => {
        setItems(prev => prev.map(item =>
            item.numero === numero ? { ...item, verificado: !item.verificado } : item
        ));
    };

    const handleObservaciones = (numero: number, obs: string) => {
        setItems(prev => prev.map(item =>
            item.numero === numero ? { ...item, observaciones: obs } : item
        ));
    };

    const handleGeneratePDF = () => {
        if (!projectData) return;
        setGenerating(true);

        try {
            const doc = new jsPDF();

            // Carátula
            addPDFCoverPage(doc, "CHECKLIST RES. 54/2018", projectData, profileData);

            // Título
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.text("VERIFICACIÓN TÉCNICA - INSTALACIÓN EXISTENTE", 105, 20, { align: "center" });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text("Resolución ERSeP 54/2018 - Ley Provincial 10.281", 105, 27, { align: "center" });

            // Tabla de verificación
            const tableBody = items.map(item => [
                item.numero.toString(),
                item.verificado ? '☑' : '☐',
                item.descripcion,
                item.categoria,
                item.observaciones || '-'
            ]);

            // @ts-ignore
            autoTable(doc, {
                startY: 35,
                head: [['#', '✓', 'Punto de Verificación', 'Categoría', 'Observaciones']],
                body: tableBody,
                theme: 'grid',
                headStyles: {
                    fillColor: [52, 73, 94],
                    fontSize: 9,
                    fontStyle: 'bold'
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                columnStyles: {
                    0: { width: 10, halign: 'center' },
                    1: { width: 10, halign: 'center', fontSize: 12 },
                    2: { width: 70 },
                    3: { width: 30 },
                    4: { width: 60 }
                },
                didParseCell: function (data) {
                    // Colorear filas según verificación
                    if (data.section === 'body' && data.column.index === 1) {
                        const isVerified = data.cell.text[0] === '☑';
                        if (isVerified) {
                            data.cell.styles.textColor = [34, 197, 94]; // Green
                        } else {
                            data.cell.styles.textColor = [239, 68, 68]; // Red
                        }
                    }
                }
            });

            // Resumen
            const verificados = items.filter(i => i.verificado).length;
            const total = items.length;
            const porcentaje = Math.round((verificados / total) * 100);

            // @ts-ignore
            const finalY = doc.lastAutoTable.finalY + 10;

            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("RESUMEN DE VERIFICACIÓN:", 20, finalY);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(`Puntos verificados: ${verificados} de ${total} (${porcentaje}%)`, 20, finalY + 7);

            // Estado
            let estadoColor: [number, number, number] = [239, 68, 68]; // Red
            let estadoTexto = "NO CONFORME";

            if (porcentaje === 100) {
                estadoColor = [34, 197, 94]; // Green
                estadoTexto = "CONFORME";
            } else if (porcentaje >= 80) {
                estadoColor = [251, 191, 36]; // Yellow
                estadoTexto = "CONFORME CON OBSERVACIONES";
            }

            doc.setTextColor(...estadoColor);
            doc.setFont("helvetica", "bold");
            doc.text(`Estado: ${estadoTexto}`, 20, finalY + 14);

            // Disclaimer
            doc.setTextColor(100);
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            const pageHeight = doc.internal.pageSize.height;
            doc.text(
                "NOTA: Este checklist es de carácter técnico y debe ser completado por el profesional responsable.",
                105,
                pageHeight - 15,
                { align: "center" }
            );

            const clientName = projectData.wizardData?.config?.clientName || 'Proyecto';
            doc.save(`Checklist_Res54-2018_${clientName}.pdf`);

        } catch (err) {
            console.error("Error generating PDF:", err);
            alert("Error al generar el PDF. Revisa la consola.");
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <Loader2 className="animate-spin mb-2" size={32} />
                <p>Cargando datos del proyecto...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                <AlertCircle size={24} />
                <p>{error}</p>
            </div>
        );
    }

    const verificados = items.filter(i => i.verificado).length;
    const total = items.length;
    const porcentaje = Math.round((verificados / total) * 100);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="text-blue-600" />
                            Checklist Res. 54/2018
                        </h2>
                        <p className="text-slate-500 mt-1">
                            Verificación técnica para instalaciones existentes según ERSeP
                        </p>
                    </div>

                    <button
                        onClick={handleGeneratePDF}
                        disabled={generating}
                        className={`
                            flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-md transition-all
                            ${generating
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                            }
                        `}
                    >
                        {generating ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Generando PDF...
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                Descargar PDF
                            </>
                        )}
                    </button>
                </div>

                {/* DISCLAIMER LEGAL - ERSEP */}
                <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-orange-900">
                            <p className="font-semibold mb-1">Checklist Ley 10.281 - ERSEP Córdoba</p>
                            <p>
                                Este checklist es una <strong>herramienta de verificación técnica</strong>.
                                El instalador electricista debe completarlo, firmarlo y presentarlo ante ERSEP
                                junto con la documentación requerida.
                                <strong> OVE no certifica ni aprueba instalaciones.</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-600">
                            Progreso de Verificación
                        </span>
                        <span className="text-sm font-bold text-slate-800">
                            {verificados} / {total} ({porcentaje}%)
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                        <div
                            className={`h-3 rounded-full transition-all ${porcentaje === 100 ? 'bg-green-500' :
                                porcentaje >= 80 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                }`}
                            style={{ width: `${porcentaje}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Checklist Items */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-12">#</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase w-16">✓</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Punto de Verificación</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-32">Categoría</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-64">Observaciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map((item) => (
                            <tr key={item.numero} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-slate-600">
                                    {item.numero}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        onClick={() => handleToggle(item.numero)}
                                        className={`p-2 rounded-lg transition-all ${item.verificado
                                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                            }`}
                                    >
                                        {item.verificado ? (
                                            <CheckCircle2 size={20} />
                                        ) : (
                                            <XCircle size={20} />
                                        )}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-700">
                                    {item.descripcion}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                        {item.categoria}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <input
                                        type="text"
                                        value={item.observaciones}
                                        onChange={(e) => handleObservaciones(item.numero, e.target.value)}
                                        placeholder="Agregar observación..."
                                        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Alert */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
                <div className="text-sm text-amber-800">
                    <p className="font-semibold">Importante:</p>
                    <p>Este checklist es obligatorio para instalaciones existentes según Res. 54/2018.
                        Todos los puntos deben estar verificados para emitir el certificado de conformidad.</p>
                </div>
            </div>
        </div>
    );
}
