import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';

export default function TermsOfUse() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="text-blue-600" />
                            Términos de Uso - OVE
                        </h1>
                        <p className="text-sm text-slate-500">Oficina Virtual Eléctrica</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto p-6 space-y-6">

                {/* Disclaimer Principal */}
                <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                        <div>
                            <h2 className="text-lg font-bold text-amber-900 mb-2">
                                IMPORTANTE - LEA ANTES DE USAR
                            </h2>
                            <p className="text-amber-800">
                                OVE es una <strong>HERRAMIENTA DE CÁLCULO Y DOCUMENTACIÓN</strong> para
                                instaladores eléctricos. <strong>NO emite certificados</strong> ni reemplaza
                                la responsabilidad del profesional.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Secciones */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 divide-y divide-slate-200">

                    {/* 1. Naturaleza de la Herramienta */}
                    <Section title="1. NATURALEZA DE LA HERRAMIENTA">
                        <p className="text-slate-700">
                            OVE es una aplicación de software diseñada como <strong>herramienta de cálculo y
                                documentación</strong> para instaladores eléctricos (idóneos, técnicos, profesionales).
                        </p>
                    </Section>

                    {/* 2. Lo que OVE ES */}
                    <Section title="2. LO QUE OVE ES">
                        <ul className="space-y-2">
                            <ListItem icon="check" color="green">
                                Calculadora de instalaciones eléctricas según AEA 90364
                            </ListItem>
                            <ListItem icon="check" color="green">
                                Generador de documentación técnica profesional
                            </ListItem>
                            <ListItem icon="check" color="green">
                                Herramienta de dibujo CAD para planos eléctricos
                            </ListItem>
                            <ListItem icon="check" color="green">
                                Sistema de cómputo de materiales
                            </ListItem>
                            <ListItem icon="check" color="green">
                                Asistente para preparar documentación para entes reguladores
                            </ListItem>
                        </ul>
                    </Section>

                    {/* 3. Lo que OVE NO ES */}
                    <Section title="3. LO QUE OVE NO ES">
                        <ul className="space-y-2">
                            <ListItem icon="x" color="red">
                                NO es un ente certificador
                            </ListItem>
                            <ListItem icon="x" color="red">
                                NO emite certificados de conformidad
                            </ListItem>
                            <ListItem icon="x" color="red">
                                NO reemplaza al instalador electricista
                            </ListItem>
                            <ListItem icon="x" color="red">
                                NO garantiza aprobación por entes reguladores (ERSEP, etc.)
                            </ListItem>
                            <ListItem icon="x" color="red">
                                NO asume responsabilidad técnica ni legal
                            </ListItem>
                        </ul>
                    </Section>

                    {/* 4. Responsabilidades del Usuario */}
                    <Section title="4. RESPONSABILIDADES DEL USUARIO">
                        <p className="text-slate-700 mb-3">
                            El instalador electricista que usa OVE es el <strong>ÚNICO responsable</strong> de:
                        </p>
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2 text-slate-700">
                                <span className="text-blue-600 font-bold">•</span>
                                Verificar la exactitud de todos los cálculos
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <span className="text-blue-600 font-bold">•</span>
                                Validar que los diseños cumplen con la normativa vigente
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <span className="text-blue-600 font-bold">•</span>
                                Revisar toda la documentación generada
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <span className="text-blue-600 font-bold">•</span>
                                Firmar profesionalmente los documentos
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <span className="text-blue-600 font-bold">•</span>
                                Presentar la documentación ante clientes y entes reguladores
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <span className="text-blue-600 font-bold">•</span>
                                Asumir toda responsabilidad técnica y legal
                            </li>
                        </ul>
                    </Section>

                    {/* 5. Normativa y Cálculos */}
                    <Section title="5. NORMATIVA Y CÁLCULOS">
                        <p className="text-slate-700 mb-3">
                            OVE implementa cálculos basados en:
                        </p>
                        <ul className="space-y-2 mb-4">
                            <li className="flex items-start gap-2 text-slate-700">
                                <span className="text-blue-600 font-bold">•</span>
                                AEA 90364-7-770 (Instalaciones de baja tensión - Viviendas)
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <span className="text-blue-600 font-bold">•</span>
                                AEA 90364-7-771 (Instalaciones de baja tensión - Locales)
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <span className="text-blue-600 font-bold">•</span>
                                Ley 10.281 y sus Decretos/Resoluciones/Modificaciones (Córdoba)
                            </li>
                        </ul>
                        <p className="text-slate-700">
                            Sin embargo, el usuario debe:
                        </p>
                        <ul className="space-y-2 mt-2">
                            <li className="flex items-start gap-2 text-slate-700">
                                <span className="text-amber-600 font-bold">⚠</span>
                                Verificar que los cálculos son correctos
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <span className="text-amber-600 font-bold">⚠</span>
                                Consultar la normativa oficial vigente
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <span className="text-amber-600 font-bold">⚠</span>
                                Aplicar criterio profesional en todos los casos
                            </li>
                        </ul>
                    </Section>

                    {/* 6. Limitación de Responsabilidad */}
                    <Section title="6. LIMITACIÓN DE RESPONSABILIDAD">
                        <p className="text-slate-700 mb-3">
                            OVE y sus desarrolladores <strong>NO se hacen responsables</strong> de:
                        </p>
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2 text-slate-700">
                                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                Errores en cálculos o documentación generada
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                Rechazos por parte de entes reguladores
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                Problemas técnicos en instalaciones diseñadas con la herramienta
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                Pérdidas económicas o daños derivados del uso de la aplicación
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                Cambios en normativas no reflejados en la aplicación
                            </li>
                        </ul>
                    </Section>

                    {/* 7. Uso Profesional Exclusivo */}
                    <Section title="7. USO PROFESIONAL EXCLUSIVO">
                        <p className="text-slate-700 mb-3">
                            OVE está diseñado para uso exclusivo de:
                        </p>
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2 text-slate-700">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                Instaladores eléctricos matriculados
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                Profesionales de la ingeniería eléctrica
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                Técnicos e idóneos habilitados según legislación local
                            </li>
                        </ul>
                        <p className="text-amber-700 mt-4 font-semibold">
                            El uso por personas no habilitadas es bajo su propio riesgo.
                        </p>
                    </Section>

                    {/* 8. Actualizaciones y Normativa */}
                    <Section title="8. ACTUALIZACIONES Y NORMATIVA">
                        <p className="text-slate-700">
                            OVE se actualiza periódicamente, pero:
                        </p>
                        <ul className="space-y-2 mt-3">
                            <li className="flex items-start gap-2 text-slate-700">
                                <span className="text-blue-600 font-bold">•</span>
                                El usuario debe verificar que usa la versión más reciente
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <span className="text-blue-600 font-bold">•</span>
                                El usuario debe consultar la normativa oficial vigente
                            </li>
                            <li className="flex items-start gap-2 text-slate-700">
                                <span className="text-blue-600 font-bold">•</span>
                                Los cambios normativos pueden no estar inmediatamente reflejados
                            </li>
                        </ul>
                    </Section>

                    {/* 9. Aceptación de Términos */}
                    <Section title="9. ACEPTACIÓN DE TÉRMINOS">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-blue-900 font-semibold">
                                Al usar OVE, el usuario acepta explícitamente estos términos y
                                reconoce que es el único responsable del uso profesional de la herramienta.
                            </p>
                        </div>
                    </Section>
                </div>

                {/* Footer */}
                <div className="bg-slate-100 rounded-lg p-4 text-center text-sm text-slate-600">
                    <p><strong>Fecha de última actualización:</strong> 2026-01-17</p>
                    <p><strong>Versión de términos:</strong> 1.0</p>
                </div>

                {/* Botón Volver */}
                <div className="text-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md"
                    >
                        Volver
                    </button>
                </div>
            </div>
        </div>
    );
}

// Componente de Sección
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
            {children}
        </div>
    );
}

// Componente de Item de Lista
function ListItem({
    icon,
    color,
    children
}: {
    icon: 'check' | 'x';
    color: 'green' | 'red';
    children: React.ReactNode
}) {
    const Icon = icon === 'check' ? CheckCircle : XCircle;
    const colorClass = color === 'green' ? 'text-green-500' : 'text-red-500';

    return (
        <li className="flex items-start gap-2 text-slate-700">
            <Icon className={`w-4 h-4 ${colorClass} flex-shrink-0 mt-0.5`} />
            {children}
        </li>
    );
}
