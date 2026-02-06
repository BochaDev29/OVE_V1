import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Download, Loader2, AlertCircle, CheckCircle2, XCircle, Zap } from 'lucide-react';
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
}

const PUNTOS_RES_54 = [
    { numero: 1, descripcion: 'Inexistencia de conductores a la vista, sin protección mecánica o con aislación dañada.' },
    { numero: 2, descripcion: 'Inexistencia de conductores o elementos bajo tensión accesibles accidentalmente.' },
    { numero: 3, descripcion: 'Presencia de protección diferencial (ID) de 30mA, funcionamiento mediante botón de test.' },
    { numero: 4, descripcion: 'Presencia de protección contra sobrecorriente (PIA) en todos los circuitos terminales.' },
    { numero: 5, descripcion: 'Inexistencia de fusibles (tapones) o hilos de cobre en reemplazo de protecciones.' },
    { numero: 6, descripcion: 'Correcta vinculación de los conductores de protección (V/A) en todas las cajas y bocas.' },
    { numero: 7, descripcion: 'Presencia de toma de tierra (jabalina) con caja de inspección accesible.' },
    { numero: 8, descripcion: 'Tableros eléctricos construidos con materiales aislantes o con puesta a tierra de masas metálicas.' },
    { numero: 9, descripcion: 'Las partes metálicas de la instalación (cañerías, cajas, tableros) están conectadas a tierra.' },
    { numero: 10, descripcion: 'Inexistencia de instalaciones precarias o conexiones clandestinas dentro de la propiedad.' }
];

export default function DocChecklist({ project: initialProject, value, onChange }: DocChecklistProps) {
    const { id } = useParams();
    const { user } = useAuth();

    const [projectData, setProjectData] = useState<any>(null);
    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [patValue, setPatValue] = useState<string>("");

    useEffect(() => {
        loadData();
    }, [id, user]);

    useEffect(() => {
        if (projectData && items.length === 0) {
            const exData = projectData.wizardData?.existenteData;
            const exCheck = exData?.checklist || {};

            // Mapeo Inteligente: Wizard -> Res. 54
            const initialItems = PUNTOS_RES_54.map(p => {
                let verificado = false;

                // Mapeo de campos del Wizard a puntos del Checklist ERSeP
                switch (p.numero) {
                    case 1: verificado = exCheck.canalizaciones || false; break;
                    case 2: verificado = exCheck.dobleAislacion || exCheck.restriccionAcceso || false; break;
                    case 3: verificado = exCheck.diferencial || false; break;
                    case 4: verificado = exCheck.protecciones || false; break;
                    case 5: verificado = exCheck.protecciones || false; break; // Ausencia de fusibles se asocia a tener térmicas
                    case 6: verificado = exCheck.equipotencializacion || false; break;
                    case 7: verificado = exCheck.sistemaTT || false; break;
                    case 8: verificado = exCheck.gradoProteccionIP || exCheck.cierreSeguridad || false; break;
                    case 9: verificado = exCheck.equipotencializacion || false; break;
                    case 10: verificado = exCheck.estadoGeneral || false; break;
                }

                return {
                    ...p,
                    verificado,
                    observaciones: ''
                };
            });

            setItems(initialItems);

            // Cargar PAT si existe (priorizar wizardData)
            const valorPAT = exData?.valorPAT || projectData.wizardData?.valorPAT;
            if (valorPAT) {
                setPatValue(valorPAT.toString());
            }
        }
    }, [projectData]);

    const loadData = async () => {
        try {
            setLoading(true);
            let currentProject = initialProject;
            if (!currentProject && id) {
                currentProject = await ProjectService.getProjectById(id);
            }
            if (!currentProject) throw new Error("No se pudo cargar el proyecto.");
            setProjectData(currentProject);

            if (user) {
                const profile = await ProfileService.getProfile(user.id);
                setProfileData(profile);
            }
        } catch (err: any) {
            setError(err.message || "Error cargando datos.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (numero: number) => {
        const newItems = items.map(item =>
            item.numero === numero ? { ...item, verificado: !item.verificado } : item
        );
        setItems(newItems);
        if (onChange) onChange(newItems);
    };

    const handleObservaciones = (numero: number, obs: string) => {
        const newItems = items.map(item =>
            item.numero === numero ? { ...item, observaciones: obs } : item
        );
        setItems(newItems);
        if (onChange) onChange(newItems);
    };

    // Lógica de Dictamen Binaria
    const todosVerificados = items.length > 0 && items.every(i => i.verificado);
    const patNumerico = parseFloat(patValue);
    const patAceptable = !isNaN(patNumerico) && patNumerico > 0 && patNumerico <= 40;
    const esApto = todosVerificados && patAceptable;

    const handleGeneratePDF = () => {
        if (!projectData) return;
        setGenerating(false); // Cambiado para que sea instantáneo en este flujo

        try {
            const doc = new jsPDF();
            const config = projectData.wizardData?.config || {};
            const owner = config.ownerDetail || {};
            const province = owner.province || "CÓRDOBA";
            const isCordoba = province.toUpperCase() === 'CÓRDOBA';

            // 1. CARÁTULA
            addPDFCoverPage(doc, "CHECK-LIST DE SEGURIDAD", projectData, profileData);

            // 2. CONTENIDO (Página 2)
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            const mainTitle = isCordoba
                ? "EXPENDIENTE TÉCNICO - RESOLUCIÓN ERSEP 54/2018"
                : "INFORME DE VERIFICACIÓN DE SEGURIDAD ELÉCTRICA";
            doc.text(mainTitle, 105, 30, { align: "center" });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text("Evaluación de condiciones mínimas de seguridad en instalaciones existentes", 105, 36, { align: "center" });

            // Tabla de verificación
            const tableBody = items.map(item => [
                item.numero.toString(),
                item.descripcion,
                item.verificado ? 'CUMPLE' : 'NO CUMPLE',
                item.observaciones || '-'
            ]);

            // @ts-ignore
            autoTable(doc, {
                startY: 45,
                head: [['#', 'PUNTO DE RELEVAMIENTO (RES. 54)', 'ESTADO', 'OBSERVACIONES']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [44, 62, 80], fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 80 },
                    2: { cellWidth: 25, halign: 'center' },
                    3: { cellWidth: 55 }
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 2) {
                        if (data.cell.text[0] === 'CUMPLE') {
                            data.cell.styles.textColor = [34, 197, 94];
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.textColor = [239, 68, 68];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });

            // Mediciones y Dictamen
            // @ts-ignore
            let finalY = doc.lastAutoTable.finalY + 15;

            // Recuadro de Medición PAT
            doc.setDrawColor(200);
            doc.setFillColor(245, 247, 250);
            doc.roundedRect(20, finalY, 170, 25, 2, 2, 'FD');

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(44, 62, 80);
            doc.text("DATOS DE LA CARGA E INSTALACIÓN", 25, finalY + 8);

            const calculation = projectData.wizardData?.calculation || {};
            const pMax = calculation.totalKW || (calculation.totalDPMS * 0.85 / 1000);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(`POTENCIA MÁXIMA (Pmax): ${pMax.toFixed(2)} kW`, 25, finalY + 15);
            doc.text(`MEDICIÓN DE PUESTA A TIERRA`, 25, finalY + 22);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.text(`VALOR PAT: ${patValue || '---'} Ohms`, 105, finalY + 18, { align: "center" });

            finalY += 35;

            // RECUADRO DE DICTAMEN FINAL
            doc.setDrawColor(esApto ? [34, 197, 94] : [239, 68, 68]);
            doc.setLineWidth(1);
            doc.rect(20, finalY, 170, 30);

            doc.setFontSize(16);
            doc.setTextColor(esApto ? [34, 197, 94] : [239, 68, 68]);
            doc.text("DICTAMEN FINAL:", 105, finalY + 12, { align: "center" });

            doc.setFontSize(20);
            const statusText = esApto ? "APTO - INSTALACIÓN SEGURA" : "NO APTO - REQUIERE ADECUACIÓN";
            doc.text(statusText, 105, finalY + 22, { align: "center" });

            // JURAMENTO LEGAL (Página 3 o pie según espacio)
            if (finalY > 200) doc.addPage();
            const juramentoY = doc.internal.pageSize.height - 60;

            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(100);
            const juramentoText = [
                "DECLARACIÓN JURADA: El profesional firmante declara bajo juramento que los datos aquí consignados son veraces",
                "y reflejan fielmente el estado de la instalación al momento de la inspección. Se deja constancia que la",
                "verificación se limita a los puntos exigidos por la Res. 54/2018 de ERSeP, no asumiendo responsabilidad",
                "por vicios ocultos o modificaciones posteriores realizadas por terceros sin supervisión profesional."
            ];

            juramentoText.forEach((line, i) => {
                doc.text(line, 105, juramentoY + (i * 4), { align: "center" });
            });

            // Firma
            doc.line(70, juramentoY + 35, 140, juramentoY + 35);
            doc.setFont("helvetica", "bold");
            doc.text("Firma y Sello del Profesional Responsable", 105, juramentoY + 40, { align: "center" });

            const clientName = projectData.wizardData?.config?.clientName || 'Proyecto';
            doc.save(`Checklist_Res54_${clientName}.pdf`);

        } catch (err) {
            console.error("Error generating PDF:", err);
            alert("Error al generar el PDF.");
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto mb-2" />Cargando...</div>;
    if (error) return <div className="p-12 text-red-500 font-bold">{error}</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {/* Header Profesional */}
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
                <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-blue-600 font-bold tracking-wider text-sm uppercase">
                            <Zap size={16} fill="currentColor" />
                            Seguridad Eléctrica ERSeP
                        </div>
                        <h1 className="text-3xl font-black text-slate-800">
                            Check-list Resolución 54/2018
                        </h1>
                        <p className="text-slate-500">
                            Ubicación: <span className="text-slate-700 font-medium">{projectData?.wizardData?.config?.ownerDetail?.street || 'S/D'} {projectData?.wizardData?.config?.ownerDetail?.number || ''}</span>
                        </p>
                    </div>

                    <button
                        onClick={handleGeneratePDF}
                        className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold shadow-lg transition-all ${esApto ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-800 text-white hover:bg-slate-900'
                            }`}
                    >
                        <Download size={20} />
                        Descargar Expediente
                    </button>
                </div>

                {/* Grid de Datos y Medición */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">Valor Puesta a Tierra (PAT)</label>
                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="number"
                                value={patValue}
                                onChange={(e) => setPatValue(e.target.value)}
                                placeholder="0.00"
                                className="text-2xl font-black text-blue-700 bg-transparent w-full focus:outline-none"
                            />
                            <span className="text-lg font-bold text-slate-400">Ω</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 italic">Máximo admitido: 40 Ohms</p>
                    </div>

                    <div className="md:col-span-2 p-5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">Dictamen Automático</label>
                            <div className={`text-xl font-black mt-1 ${esApto ? 'text-green-600' : 'text-red-500'}`}>
                                {esApto ? 'APTO - INSTALACIÓN DE SEGURIDAD' : 'NO APTO / PENDIENTE'}
                            </div>
                        </div>
                        {esApto ? <CheckCircle2 size={40} className="text-green-500" /> : <XCircle size={40} className="text-red-400" />}
                    </div>
                </div>
            </div>

            {/* Tabla de Puntos */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-800 text-white">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold uppercase w-16">#</th>
                            <th className="px-6 py-4 text-left text-xs font-bold uppercase">Requerimiento Res. 54</th>
                            <th className="px-6 py-4 text-center text-xs font-bold uppercase w-32">Estado</th>
                            <th className="px-6 py-4 text-left text-xs font-bold uppercase">Observaciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map((item) => (
                            <tr key={item.numero} className="group hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-5 text-sm font-bold text-slate-400">{item.numero}</td>
                                <td className="px-6 py-5">
                                    <p className="text-sm font-semibold text-slate-700 leading-tight">{item.descripcion}</p>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <button
                                        onClick={() => handleToggle(item.numero)}
                                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${item.verificado
                                            ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                                            : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'
                                            }`}
                                    >
                                        {item.verificado ? 'CUMPLE' : 'NO CUMPLE'}
                                    </button>
                                </td>
                                <td className="px-6 py-5">
                                    <input
                                        type="text"
                                        value={item.observaciones}
                                        onChange={(e) => handleObservaciones(item.numero, e.target.value)}
                                        placeholder="Nota técnica..."
                                        className="w-full bg-transparent border-b border-transparent focus:border-blue-300 focus:outline-none text-sm py-1"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Banner Legal */}
            <div className="p-6 bg-blue-900 rounded-2xl text-white flex gap-4 items-center">
                <AlertCircle size={32} className="text-blue-300 flex-shrink-0" />
                <div className="text-sm">
                    <p className="font-bold text-base mb-1">Responsabilidad del Habilitado:</p>
                    <p className="opacity-80 leading-relaxed font-medium">
                        La Resolución 54/18 exige el cumplimiento del 100% de los puntos y una PAT inferior a 40Ω.
                        Este documento tiene valor de declaración jurada y debe ser validado por el instalador actuante.
                    </p>
                </div>
            </div>
        </div>
    );
}
