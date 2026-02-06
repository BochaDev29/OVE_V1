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
        const city = owner.city || "NO INFORMADA";
        const province = owner.province || "CÓRDOBA";
        const catastro = owner.catastro || "NO INFORMADO";

        const isCordoba = province.toUpperCase() === 'CÓRDOBA';
        const isExistente = config.estadoObra === 'existente';
        const destMapping: Record<string, string> = {
            'habitacional': 'Vivienda',
            'vivienda': 'Vivienda',
            'comercial': 'Local Comercial',
            'oficina': 'Oficina',
            'industrial': 'Industria'
        };
        const destType = destMapping[config.regimenUso] || config.regimenUso || 'Inmueble';

        let text = "";

        // 1. REGLAS DE LOCALIZACIÓN (EL SWITCH JURISDICCIONAL)
        if (isCordoba) {
            text += "CERTIFICADO DE INSTALACIÓN ELÉCTRICA APTA\n";
            text += "Ley Provincial de Seguridad Eléctrica Nº 10.281\n";
        } else {
            text += "MEMORIA TÉCNICA DESCRIPTIVA\n";
            text += "Reglamentación AEA 90364 - Sección 770/771\n";
        }
        text += "________________________________________________________________________________\n\n";

        // BLOQUE A: ENCABEZADO Y DATOS DEL PROYECTO
        text += "BLOQUE A: DATOS DEL PROYECTO\n\n";
        text += `Solicitante: ${clientName}\n`;
        text += `Ubicación: ${address} - ${city}\n`;
        text += `Destino: ${destType}\n`;
        text += `Superficie: ${config.surfaceArea || 0} m²\n`;
        text += `Nomenclatura Catastral: ${catastro}\n\n`;

        // BLOQUE B: OBJETO (Narrativa Híbrida)
        text += "BLOQUE B: OBJETO DE LA PRESENTE\n\n";
        if (!isExistente) {
            text += `El objeto de la presente es certificar las características técnicas del proyecto y ejecución de la instalación eléctrica destinada a ${destType}, del propietario/a Sr./Sra. ${clientName}.\n\n`;
        } else {
            text += "El objeto de la presente es describir el relevamiento y verificación de las condiciones de seguridad de la instalación existente, a los fines de su regularización conforme a la normativa vigente.\n\n";
        }

        // BLOQUE C: SÍNTESIS DEL PROYECTO (Datos Duros)
        text += "BLOQUE C: SÍNTESIS DEL PROYECTO\n\n";
        text += `Grado de Electrificación: ${calculation.grade || 'Mínimo'}\n`;
        if (isExistente) {
            const pMax = calculation.totalKW || (calculation.totalDPMS * 0.85 / 1000);
            text += `Potencia Máxima de la Instalación (Pmax): ${pMax.toFixed(2)} kW\n`;
        }
        text += `Demanda de Potencia (DPMS): ${(calculation.totalDPMS / 1000).toFixed(2)} kVA\n`;
        text += `Tensión de Suministro: ${config.voltage || '220V'}\n`;
        text += `Esquema de Conexión a Tierra: TT (Esquema de Puesta a Tierra Directa)\n`;
        text += `Corriente de Cortocircuito (Icc): 3000 A (Mínima reglamentaria)\n\n`;

        // BLOQUE D: DESCRIPCIÓN TÉCNICA
        text += "BLOQUE D: DESCRIPCIÓN TÉCNICA\n\n";

        // 1. Acometida y Medición
        const acometidaType = config.acometida?.tipo || "Normalizada";
        const acometidaMaterial = "Conductores de Cobre con aislación en XLPE/PVC";
        text += "1. Acometida y Medición\n";
        text += `El Punto de Conexión y Medición es del tipo ${acometidaType}, ejecutado con materiales de configuración de Doble Aislación (Clase II), conforme a los requerimientos de la Distribuidora local y la reglamentación vigente.\n`;
        if (config.userNotes?.acometida) text += `Nota: ${config.userNotes.acometida}\n`;
        text += "\n";

        // 2. Tablero Principal y Seccionales
        const ipRating = config.panels?.some((p: any) => p.isExterior) ? "IP65" : "IP40";
        text += "2. Tablero Principal y Seccionales\n";
        text += `La instalación cuenta con un Tablero Principal de material aislante, grado de protección IP ${ipRating}, ubicado según plano. Los dispositivos de maniobra y protección se encuentran instalados sobre riel DIN, garantizando la protección contra contactos accidentales.\n`;
        if (config.userNotes?.panels) text += `Nota: ${config.userNotes.panels}\n`;
        text += "\n";

        // 3. Puesta a Tierra (PAT)
        text += "3. Puesta a Tierra (PAT)\n";
        text += "Se ha ejecutado/verificado un sistema de puesta a tierra de protección compuesto por jabalina cilíndrica de acero-cobre (IRAM 2309) y conductor de protección bicolor (verde-amarillo) que recorre toda la instalación, asegurando la equipotencialidad de las masas.\n\n";

        // 4. Distribución y Circuitos (Iterador)
        text += "4. Distribución y Circuitos\n";

        // CORRECCIÓN: Intentar obtener circuitos de múltiples fuentes (Cálculo o Inventario Directo)
        const circuits = (calculation.circuits && calculation.circuits.length > 0)
            ? calculation.circuits
            : (config.circuitInventory?.circuits || []);

        console.log("🔍 DocMemory -> Circuitos detectados:", circuits.length);

        if (circuits.length > 0) {
            text += "El sistema se distribuye en los siguientes circuitos terminales:\n\n";
            circuits.forEach((c: any) => {
                const desc = c.description || c.nombre || c.type || "Circuito General";
                const cable = c.cable ? c.cable.toString().replace('mm²', '') : '2.5';
                const breaker = c.breaker ? c.breaker.toString().replace('A', '') : '16';

                text += `* Circuito ${c.id}: Destinado a ${desc}. `;
                text += `Cable de ${cable} mm². `;
                text += `Protección Termomagnética de ${breaker} A. `;
                if (c.userNote) text += `${c.userNote}`;
                text += "\n";
            });
        } else {
            text += "⚠️ ATENCIÓN: No se han definido circuitos en el cálculo. Por favor, verifique el Paso 3 del Wizard.\n";
            console.warn("⚠️ DocMemory -> El array de circuitos está vacío en todas las fuentes.");
        }
        text += "\n";

        // BLOQUE E: ESPECIFICACIONES DE MATERIALES (Texto Legal Fijo)
        text += "BLOQUE E: ESPECIFICACIONES DE MATERIALES\n\n";
        text += "Cumplimiento Normativo:\n";
        text += "Todos los materiales utilizados responden a las normas IRAM correspondientes y cuentan con Sello de Seguridad Eléctrica (Res. SC 169/2018):\n";
        text += "* Conductores: IRAM NM 247-3 (No propagantes de llama).\n";
        text += "* Canalizaciones: IRAM 62386 / IEC 61386 (Ignífugos).\n";
        text += "* Protecciones: IEC 60898 (Termomagnéticas) e IEC 61008 (Diferenciales).\n";
        text += "* Tableros: IRAM 62670 / IEC 60670.\n\n";

        // BLOQUE F: DISCLAIMER (Responsabilidad)
        text += "BLOQUE F: RESPONSABILIDAD TÉCNICA\n\n";
        text += "Este documento ha sido generado mediante el software OVE (Oficina Virtual Eléctrica) en base a los datos suministrados por el usuario. La verificación física de la obra, la dirección técnica y la veracidad de los datos declarados son responsabilidad exclusiva del Instalador Habilitado firmante.\n";

        setMemoryText(text);
    };


    const renderPreviewContent = () => {
        const config = projectData?.wizardData?.config || {};
        const owner = config.ownerDetail || {};
        const clientName = config.clientName || 'Cliente';
        const address = `${owner.street || ''} ${owner.number || ''}`.trim() || 'Dirección no especificada';
        const province = owner.province || "CÓRDOBA";
        const isCordoba = province.toUpperCase() === 'CÓRDOBA';

        const mainTitle = isCordoba ? "CERTIFICADO DE INSTALACIÓN ELÉCTRICA APTA" : "MEMORIA TÉCNICA DESCRIPTIVA";
        const subTitle = isCordoba ? "Ley Provincial de Seguridad Eléctrica Nº 10.281" : "Reglamentación AEA 90364 - Sección 770/771";

        return (
            <div className="space-y-6">
                {/* Título */}
                <div className="text-center border-b pb-6">
                    <h1 className="text-2xl font-bold mb-2 uppercase">{mainTitle}</h1>
                    <p className="text-slate-600 font-medium italic">{subTitle}</p>
                </div>

                {/* Datos del Proyecto */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div>
                        <h2 className="text-xs font-bold text-slate-400 uppercase mb-1">Solicitante</h2>
                        <p className="text-sm font-semibold text-slate-700">{clientName}</p>
                    </div>
                    <div>
                        <h2 className="text-xs font-bold text-slate-400 uppercase mb-1">Ubicación</h2>
                        <p className="text-sm font-semibold text-slate-700">{address}</p>
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
            // Título fijo solicitado por el usuario
            const docTitle = "MEMORIA TÉCNICA";

            addPDFCoverPage(doc, docTitle, projectData, profileData);

            // 2. CONTENIDO EDITABLE (Página 2)
            // ELIMINADO: doc.addPage() ya que addPDFCoverPage lo hace internamente
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(50);

            const splitText = doc.splitTextToSize(memoryText, 170);

            // Posición inicial en Pag 2
            let y = 30;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 20;

            // Header simplificado para páginas internas
            const addPageHeader = (pageDoc: jsPDF) => {
                pageDoc.setFontSize(8);
                pageDoc.setTextColor(150);
                pageDoc.text(`${docTitle} - Proyecto: ${projectData.wizardData?.config?.clientName || 'S/D'}`, margin, 15);
                pageDoc.line(margin, 18, 190, 18);
                pageDoc.setFontSize(10);
                pageDoc.setTextColor(50);
            };

            addPageHeader(doc);

            splitText.forEach((line: string) => {
                if (y > pageHeight - margin) {
                    doc.addPage();
                    addPageHeader(doc);
                    y = 30;
                }

                // Si la línea empieza con "BLOQUE", poner en negrita
                if (line.includes("BLOQUE") || line.includes("1.") || line.includes("2.") || line.includes("3.") || line.includes("4.")) {
                    doc.setFont("helvetica", "bold");
                    doc.text(line, margin, y);
                    doc.setFont("helvetica", "normal");
                } else {
                    doc.text(line, margin, y);
                }

                y += 6; // Interlineado
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
                        {projectData?.wizardData?.config?.ownerDetail?.province?.toUpperCase() === 'CÓRDOBA'
                            ? 'Certificado Apta (Ley 10281)'
                            : 'Memoria Técnica (AEA)'
                        }
                    </h2>
                    <p className="text-slate-500 mt-1">
                        Generación automática profesional conforme a especificación maestra.
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
