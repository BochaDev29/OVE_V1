import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import { FileText, Download, Loader2, AlertCircle, Eye } from 'lucide-react';
import { ProjectService } from '../../services/project.service';
import { ProfileService } from '../../services/profile.service';
import { useAuth } from '../../contexts/AuthContext';
import { addPDFCoverPage } from '../../lib/pdf-utils';
import { PDFPreview } from '../common/PDFPreview';
import {
    getAcometidaTypeSpec,
    validateAcometidaLength,
    validateCableSafety
} from '../../lib/electrical-rules';

interface DocMemoryProps {
    project?: any; // Mantener compatible si se pasa por props, aunque usaremos useParams como principal fuente de verdad completa
    value?: string;
    onChange?: (val: string) => void;
}

export default function DocMemory({ project: initialProject }: DocMemoryProps) {
    const { id } = useParams();
    const { user } = useAuth();

    const [projectData, setProjectData] = useState<any>(null);
    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Texto editable de la memoria
    const [memoryText, setMemoryText] = useState('');

    useEffect(() => {
        loadData();
    }, [id, user]);

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Cargar Proyecto (Si no vino por props o para asegurar data fresca)
            let currentProject = initialProject;
            if (!currentProject && id) {
                currentProject = await ProjectService.getProjectById(id);
            }

            if (!currentProject) {
                throw new Error("No se pudo cargar el proyecto.");
            }
            setProjectData(currentProject);

            // 2. Cargar Perfil del Matriculado
            if (user) {
                const profile = await ProfileService.getProfile(user.id);
                setProfileData(profile);
            }

        } catch (err: any) {
            console.error("Error loading data for memory:", err);
            setError(err.message || "Error cargando datos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectData && !memoryText) {
            generateInitialText(projectData);
        }
    }, [projectData]);

    const generateInitialText = (proj: any) => {
        const config = proj.wizardData?.config || {};
        const calculation = proj.wizardData?.calculation || {};
        const owner = config.ownerDetail || {};

        const clientName = config.clientName || owner.dniCuit || "A DEFINIR";
        const address = `${owner.street || ''} ${owner.number || ''}`.trim() || "NO INFORMADO";
        const location = `${owner.city || ''} ${owner.province ? '-' + owner.province : ''}`.trim();
        const catastro = owner.catastro || "NO INFORMADO";

        let text = "";

        // ENCABEZADO
        const isExistente = config.projectType === 'existente';
        text += "MEMORIA TÉCNICA DESCRIPTIVA\n";
        text += isExistente
            ? "Régimen de Instalación Existente (Res. 54/2018 - Ley 10.281)\n\n"
            : "Instalación Eléctrica en Inmuebles - AEA 90364-7-770\n\n";
        text += "________________________________________________________________________________\n\n";

        // 1. DATOS
        text += "1. DATOS DEL SOLICITANTE Y UBICACIÓN\n\n";
        text += `Solicitante: ${clientName}\n`;
        text += `Domicilio del Inmueble: ${address}\n`;
        text += `Localidad: ${location}\n`;
        text += `Nomenclatura Catastral: ${catastro}\n\n`;

        // 2. OBJETO
        text += "2. OBJETO DE LA MEMORIA\n\n";
        if (config.estadoObra === 'provisoria') {
            text += "La presente Memoria Técnica describe las características constructivas de la instalación eléctrica transitoria para obra (AVP), conforme a la Reglamentación AEA 90364-7-770 y requisitos de suministro provisorio.\n";
            text += "⚠️ CERTIFICACIÓN VÁLIDA POR 12 MESES desde la fecha de emisión.\n\n";
        } else if (isExistente) {
            text += "La presente Memoria Técnica tiene por objeto describir las características constructivas de la instalación eléctrica existente, evaluada conforme a la Resolución 54/2018 de ERSeP y Ley Provincial 10281 de Seguridad Eléctrica.\n\n";
        } else {
            text += "La presente Memoria Técnica tiene por objeto describir las características constructivas de la instalación eléctrica, ejecutada conforme a la Reglamentación AEA 90364-7-770 (Viviendas unifamiliares hasta 63A) y Ley Provincial 10281 de Seguridad Eléctrica.\n\n";
        }

        // 3. CIRCUITOS
        text += "3. DETALLE DE CIRCUITOS\n\n";
        const circuits = calculation.circuits || [];
        if (circuits.length > 0) {
            circuits.forEach((c: any) => {
                text += `- ${c.id} (${c.type}): ${c.description}\n`;
                text += `  Bocas: ${c.bocas} | Ib: ${c.ib?.toFixed(2) || 0} A | Cable: ${c.cable} | Prot: ${c.breaker}\n\n`;
            });
        } else {
            text += "No se han definido circuitos en el cálculo.\n\n";
        }

        // 3.5. ACOMETIDA ELÉCTRICA (si existe)
        if (config.acometida) {
            text += "3.5. ACOMETIDA ELÉCTRICA\n\n";

            try {
                const acometidaSpec = getAcometidaTypeSpec(config.acometida.tipo);

                if (acometidaSpec) {
                    text += `Tipo: ${acometidaSpec.descripcion}\n`;
                    text += `Longitud: ${config.acometida.longitud} m\n`;
                    text += `Método de Instalación: ${acometidaSpec.metodo_instalacion}\n`;
                    text += `Material: ${acometidaSpec.material}\n`;
                    text += `Sección Mínima: ${config.voltage === '380V' ? acometidaSpec.seccion_min_tri_mm2 : acometidaSpec.seccion_min_mono_mm2} mm²\n`;
                    text += `Normativa: ${acometidaSpec.normativa}\n\n`;

                    // Validación de longitud
                    const validacionLongitud = validateAcometidaLength(
                        config.acometida.longitud,
                        config.acometida.tipo
                    );

                    if (!validacionLongitud.valid) {
                        text += `⚠️ OBSERVACIÓN NORMATIVA:\n${validacionLongitud.alert}\n\n`;
                    }

                    // Diagnóstico de seguridad (solo para instalaciones existentes)
                    if (config.estadoObra === 'existente' && config.acometida.seccion) {
                        text += "DIAGNÓSTICO DE SEGURIDAD:\n";
                        text += `Sección de cable existente: ${config.acometida.seccion} mm²\n`;

                        // Buscar protección del TP
                        const tpPanel = calculation.panels?.find((p: any) => p.type === 'TP');
                        if (tpPanel?.existingPIA?.amperes) {
                            const validacionSeguridad = validateCableSafety(
                                config.acometida.seccion,
                                tpPanel.existingPIA.amperes,
                                config.voltage === '380V',
                                acometidaSpec.metodo_instalacion
                            );

                            if (!validacionSeguridad.safe) {
                                text += `\n🔥 ${validacionSeguridad.alert}\n`;
                                text += `Nivel de Riesgo: ${validacionSeguridad.riskLevel}\n\n`;
                            } else {
                                text += `✓ La protección (${tpPanel.existingPIA.amperes}A) es compatible con el cable ${config.acometida.seccion}mm².\n\n`;
                            }
                        }
                    }
                } else {
                    text += `Tipo: ${config.acometida.tipo}\n`;
                    text += `Longitud: ${config.acometida.longitud} m\n\n`;
                }
            } catch (error) {
                console.warn('Error al obtener datos de acometida:', error);
                text += `Tipo: ${config.acometida.tipo}\n`;
                text += `Longitud: ${config.acometida.longitud} m\n\n`;
            }
        }

        // 4. RESUMEN
        text += "4. RESUMEN DE CARACTERÍSTICAS TÉCNICAS\n\n";
        text += `Tensión Nominal: ${config.voltage || '220V'}\n`;
        text += `Grado de Electrificación: ${isExistente ? 'N/A (RES. 54/18)' : (calculation.grade || 'Minimo').toUpperCase()}\n`;
        text += `D.P.M.S. Total: ${calculation.dpmsTotal ? Math.round(calculation.dpmsTotal) : 0} VA\n`;
        text += `Intensidad de Proyecto (Ib): ${calculation.totalDPMS ? (calculation.totalDPMS / 220).toFixed(2) : (calculation.current ? calculation.current.toFixed(2) : 0)} A\n`;
        text += `Cable Acometida (Sugerido): ${calculation.suggestedCable || '-'} mm²\n`;
        text += `Protección Principal: ${calculation.suggestedBreaker || '-'}\n`;
        text += `Puesta a Tierra: Jabalina Acero-Cobre + Cond. 10mm² (Verificado)\n\n`;

        if (config.estadoObra === 'provisoria') {
            text += "5. REQUISITOS TÉCNICOS PARA SUMINISTRO TRANSITORIO\n\n";
            text += "1. El tablero provisorio de obra debe ser de material aislante con grado de protección IP43 o superior.\n";
            text += "2. Todos los tomacorrientes deben contar con su respectiva tapa protectora (IP44/65).\n";
            text += "3. Se debe contar con protección diferencial de 30mA y termomagnética adecuada.\n";
            text += "4. La puesta a tierra es obligatoria mediante jabalina reglamentaria e inspeccionable.\n";
            text += "5. Los conductores deben ser del tipo doble aislación (IRAM 2178) en tramos expuestos.\n";
            text += "6. La altura del tablero debe situarse entre 0.8m y 1.5m del suelo.\n";
            text += "7. Se prohíbe el uso de cables tipo taller para la instalación fija de obra.\n";
            text += "8. El gabinete de medidor debe ser Clase II (Sintético) conforme a MN 127/128.\n";
            text += "9. La instalación debe ser retirada una vez finalizada la obra o vencido el plazo de 12 meses.\n";
            text += "10. No se permiten empalmes fuera de cajas de paso o derivación.\n";
            text += "11. El tablero debe estar correctamente señalizado con riesgo eléctrico.\n\n";
        }

        setMemoryText(text);
    };

    const renderPreviewContent = () => {
        const config = projectData?.wizardData?.config || {};
        const owner = config.ownerDetail || {};
        const clientName = config.clientName || 'Cliente';
        const address = `${owner.street || ''} ${owner.number || ''}`.trim() || 'Dirección no especificada';

        return (
            <div className="space-y-6">
                {/* Título */}
                <div className="text-center border-b pb-6">
                    <h1 className="text-3xl font-bold mb-2">MEMORIA TÉCNICA</h1>
                    <p className="text-slate-600">Documentación Técnica</p>
                </div>

                {/* Datos del Proyecto */}
                <div>
                    <h2 className="text-xl font-bold mb-3">Información de la Obra</h2>
                    <div className="space-y-2 text-sm">
                        <p><strong>Cliente:</strong> {clientName}</p>
                        <p><strong>Ubicación:</strong> {address}</p>
                        <p><strong>Destino:</strong> {config.destination || 'No especificado'}</p>
                    </div>
                </div>

                {/* Contenido de la Memoria */}
                <div className="whitespace-pre-wrap text-sm font-mono">
                    {memoryText}
                </div>
            </div>
        );
    };

    const handleGeneratePDF = () => {
        if (!projectData) return;
        setGenerating(true);

        try {
            const doc = new jsPDF();

            // 1. CARÁTULA
            addPDFCoverPage(doc, "MEMORIA TÉCNICA", projectData, profileData);

            // 2. CONTENIDO EDITABLE (Página 2)
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);

            const splitText = doc.splitTextToSize(memoryText, 170);

            // Posición inicial en Pag 2
            let y = 20;
            // Si el texto es muy largo, jsPDF a veces necesita manejo manual de paginado si no se usa autoTable o html.
            // splitTextToSize devuelve array de strings.
            // doc.text maneja multilinea, pero si excede la pagina, no hace salto automatico nativo sin plugin.
            // Implementamos un loop básico de paginado.

            const pageHeight = doc.internal.pageSize.height;
            const margin = 20;

            splitText.forEach((line: string) => {
                if (y > pageHeight - margin) {
                    doc.addPage();
                    y = margin;
                }
                doc.text(line, margin, y);
                y += 5; // Interlineado
            });

            // Guardar
            const clientName = projectData.wizardData?.config?.clientName || 'Proyecto';
            doc.save(`Memoria_Tecnica_${clientName}.pdf`);

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

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white shadow-sm rounded-xl border border-slate-200">
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-blue-600" />
                        Memoria Técnica (ERSeP)
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Generación automática conforme a Reglamentación AEA 90364-7-770.
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowPreview(true)}
                        className="flex items-center gap-2 px-4 py-3 rounded-lg font-semibold border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-all"
                    >
                        <Eye size={20} />
                        Vista Previa
                    </button>

                    <button
                        onClick={handleGeneratePDF}
                        disabled={generating}
                        className={`
                            flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-md transition-all
                            ${generating
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:transform active:scale-95'
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
            </div>

            {/* EDITOR DE TEXTO (REEMPLAZA PREVIEW) */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Contenido de la Memoria (Editable)
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        <AlertCircle size={14} />
                        <span>Puedes editar este texto antes de generar el PDF</span>
                    </div>
                </div>

                <textarea
                    value={memoryText}
                    onChange={(e) => setMemoryText(e.target.value)}
                    className="w-full h-[600px] p-4 text-sm font-mono text-slate-700 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent leading-relaxed"
                    spellCheck={false}
                />
            </div>

            {/* Modal de Vista Previa */}
            {showPreview && (
                <PDFPreview
                    title="Memoria Técnica"
                    content={renderPreviewContent()}
                    onClose={() => setShowPreview(false)}
                    onDownload={() => {
                        setShowPreview(false);
                        handleGeneratePDF();
                    }}
                />
            )}
        </div>
    );
}
