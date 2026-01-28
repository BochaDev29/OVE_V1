import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Upload, FileText, Camera, Save, FileDown, Box, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { calcularPotenciaRes54 } from '../../lib/electrical-rules';
import type { EnvironmentCalculation, ProjectConfig } from '../../lib/electrical-rules';

interface WizardStepExistenteProps {
    onBack: () => void;
    onNext: () => void;
    onSaveData: (data: ExistenteData) => void;
    initialData?: ExistenteData;
    environments: EnvironmentCalculation[];
    config: ProjectConfig;
}

export interface ExistenteData {
    bocasLuz: number;
    bocasTomas: number;
    cargasEspeciales: number;
    checklist: {
        cierreSeguridad: boolean;
        dobleAislacion: boolean;
        gradoProteccionIP: boolean;
        restriccionAcceso: boolean;
        sistemaTT: boolean;
        equipotencializacion: boolean;
        protecciones: boolean;
        diferencial: boolean;
        selloS: boolean;
        canalizaciones: boolean;
        estadoGeneral: boolean;
        certificadoEdificio?: boolean;
    };
    fotos: File[];
}

export default function WizardStepExistente({
    onBack,
    onNext,
    onSaveData,
    initialData,
    environments,
    config
}: WizardStepExistenteProps) {
    const [expandedPanels, setExpandedPanels] = useState<string[]>((config.panels || []).map(p => p.id));

    const togglePanel = (panelId: string) => {
        setExpandedPanels(prev => prev.includes(panelId) ? prev.filter(id => id !== panelId) : [...prev, panelId]);
    };

    // Consolidar todos los circuitos de todos los tableros
    const consolidado = useMemo(() => {
        const totalBocasLuz = environments.reduce((sum, env) => sum + (env.bocasLuz || 0), 0);
        const totalBocasTomas = environments.reduce((sum, env) => sum + (env.bocasTomas || 0), 0);
        const totalCargasEspeciales = environments.reduce((sum, env) => sum + (env.cargasEspeciales || 0), 0);

        return calcularPotenciaRes54(totalBocasLuz, totalBocasTomas, totalCargasEspeciales);
    }, [environments]);

    const [checklist, setChecklist] = useState(initialData?.checklist || {
        cierreSeguridad: false,
        dobleAislacion: false,
        gradoProteccionIP: false,
        restriccionAcceso: false,
        sistemaTT: false,
        equipotencializacion: false,
        protecciones: false,
        diferencial: false,
        selloS: false,
        canalizaciones: false,
        estadoGeneral: false
    });

    const [fotos, setFotos] = useState<File[]>(initialData?.fotos || []);

    // Guardar datos automáticamente
    useEffect(() => {
        onSaveData({
            bocasLuz: 0,
            bocasTomas: 0,
            cargasEspeciales: 0,
            checklist,
            fotos
        });
    }, [checklist, fotos]);

    const handleChecklistChange = (field: keyof typeof checklist) => {
        setChecklist(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFotos(Array.from(e.target.files));
        }
    };

    const checklistComplete = Object.values(checklist).every(v => v === true);
    const checklistProgress = Object.values(checklist).filter(v => v === true).length;
    const canFinalize = checklistComplete && fotos.length > 0;

    const checklistItems = [
        { key: 'cierreSeguridad', title: '1. Cierre de Seguridad', desc: 'Tableros con cierre que requiera herramienta especial' },
        { key: 'dobleAislacion', title: '2. Doble Aislación', desc: 'Tablero principal de material aislante' },
        { key: 'gradoProteccionIP', title: '3. Grado de Protección IP', desc: 'Acorde al lugar de emplazamiento' },
        { key: 'restriccionAcceso', title: '4. Restricción de Acceso', desc: 'Imposibilidad de contacto con partes bajo tensión' },
        { key: 'sistemaTT', title: '5. Sistema TT', desc: 'Instalación de puesta a tierra de protección' },
        { key: 'equipotencializacion', title: '6. Equipotencialización', desc: 'Conexión de todas las masas a la tierra de protección' },
        { key: 'protecciones', title: '7. Protecciones', desc: 'Interruptores automáticos para sobrecarga y cortocircuito en cada línea' },
        { key: 'diferencial', title: '8. Diferencial ≤30mA', desc: 'Interruptor diferencial menor o igual a 30mA operativo' },
        { key: 'selloS', title: '9. Sello "S"', desc: 'Elementos con certificación de seguridad eléctrica (IRAM/IEC)' },
        { key: 'canalizaciones', title: '10. Canalizaciones y Bocas', desc: 'Correcta instalación de conductores, tomas y cajas cerradas' },
        { key: 'estadoGeneral', title: '11. Estado General', desc: 'Verificación visual: sin cables a la vista ni tomas dañados' }
    ];

    const formatNum = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="space-y-8 animate-in slide-in-from-right duration-500 pb-12">
            {/* ENCABEZADO CON ESTILO DE RESULTADOS */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                            Régimen de Instalación Existente (Res. 54/2018)
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Conforme a Ley Provincial 10.281 - Seguridad Eléctrica
                        </p>
                    </div>
                    <div className="flex gap-4 text-right">
                        <div className="border-l border-slate-600 pl-4">
                            <p className="text-xs text-slate-400 uppercase font-bold">Potencia Total (DPMS)</p>
                            <p className="text-xl font-bold">{formatNum(consolidado.dpms)} VA</p>
                            <p className="text-xs text-slate-400 text-right">~ {formatNum(consolidado.kw)} kW</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CAJA DE RESUMEN CON GRADIENTES */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Consolidado Total de la Instalación</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* VA TOTAL - DESTACADO */}
                    <div className="bg-white rounded-xl p-5 shadow-md border-2 border-blue-400">
                        <p className="text-xs font-bold text-blue-700 mb-1 uppercase">Potencia Aparente Total</p>
                        <p className="text-4xl font-bold text-blue-600">{consolidado.vaTotal.toFixed(0)} VA</p>
                        <p className="text-xs text-slate-600 mt-2">
                            ({environments.reduce((sum, env) => sum + (env.bocasLuz || 0), 0)}×25) +
                            ({environments.reduce((sum, env) => sum + (env.bocasTomas || 0), 0)}×240) +
                            {environments.reduce((sum, env) => sum + (env.cargasEspeciales || 0), 0)}
                        </p>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm">
                        <p className="text-xs text-slate-600 mb-1">DPMS (×0.8)</p>
                        <p className="text-3xl font-bold text-slate-800">{consolidado.dpms.toFixed(0)} VA</p>
                        <p className="text-xs text-slate-500 mt-1">Coef. simultaneidad</p>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm">
                        <p className="text-xs text-slate-600 mb-1">Potencia Final</p>
                        <p className={`text-3xl font-bold ${consolidado.kw > 10 ? 'text-red-600' : 'text-green-600'}`}>
                            {consolidado.kw.toFixed(2)} kW
                        </p>
                        <p className="text-xs text-slate-500 mt-1">DPMS × 0.85</p>
                    </div>
                </div>

                {/* Alerta de Categoría Profesional */}
                {consolidado.alerts.length > 0 && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <h5 className="font-semibold text-red-900">Alerta de Categoría Profesional</h5>
                                {consolidado.alerts.map((alert, idx) => (
                                    <p key={idx} className="text-sm text-red-700 mt-1">{alert}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* TARJETAS DE TABLEROS CON PIA/ID */}
            <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-700 border-b border-slate-200 pb-2">Detalle por Tablero</h3>
                {config.panels.map(panelConfig => {
                    const circuitosDelPanel = environments.filter(env => env.panelId === panelConfig.id);
                    const totalLuzPanel = circuitosDelPanel.reduce((sum, env) => sum + (env.bocasLuz || 0), 0);
                    const totalTomasPanel = circuitosDelPanel.reduce((sum, env) => sum + (env.bocasTomas || 0), 0);
                    const totalEspecialesPanel = circuitosDelPanel.reduce((sum, env) => sum + (env.cargasEspeciales || 0), 0);
                    const vaPanel = (totalLuzPanel * 25) + (totalTomasPanel * 240) + totalEspecialesPanel;
                    const isExpanded = expandedPanels.includes(panelConfig.id);
                    const isTP = panelConfig.type === 'TP';

                    return (
                        <div key={panelConfig.id} className={`border rounded-xl shadow-sm overflow-hidden ${isTP ? 'border-slate-300 bg-white' : 'border-blue-200 bg-blue-50/30'}`}>
                            <div className={`p-4 flex flex-col md:flex-row justify-between items-center cursor-pointer ${isTP ? 'bg-slate-100' : 'bg-blue-100'}`} onClick={() => togglePanel(panelConfig.id)}>
                                <div className="flex items-center gap-3">
                                    <Box className={`w-5 h-5 ${isTP ? 'text-slate-700' : 'text-blue-600'}`} />
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-800">{panelConfig.name}</h4>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isTP ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'}`}>
                                            {isTP ? 'Tablero Principal' : 'Tablero Seccional'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 mt-3 md:mt-0">
                                    {/* Mostrar PIA e ID si existen */}
                                    {panelConfig.existingPIA && (
                                        <div className="bg-white px-3 py-2 rounded-lg border border-amber-300 shadow-sm">
                                            <p className="text-[9px] text-amber-600 uppercase font-bold">PIA</p>
                                            <p className="font-black text-amber-900">{panelConfig.existingPIA.amperes}A {panelConfig.existingPIA.poles}</p>
                                        </div>
                                    )}
                                    {panelConfig.existingID && (
                                        <div className="bg-white px-3 py-2 rounded-lg border border-green-300 shadow-sm">
                                            <p className="text-[9px] text-green-600 uppercase font-bold">ID</p>
                                            <p className="font-black text-green-900">{panelConfig.existingID.amperes}A {panelConfig.existingID.sensitivity}</p>
                                        </div>
                                    )}
                                    <div><p className="text-[10px] text-slate-500 uppercase font-bold text-center">Demanda</p><p className="font-bold text-slate-900 text-center">{formatNum(vaPanel)} VA</p></div>
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                </div>
                            </div>
                            {isExpanded && (
                                <div className="p-6 border-t border-slate-200/50">
                                    <h5 className="font-bold text-slate-600 mb-3 text-sm uppercase flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-blue-500" /> Circuitos Relevados
                                    </h5>
                                    {circuitosDelPanel.length > 0 ? (
                                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                                                    <tr>
                                                        <th className="px-4 py-3">Ambiente/Circuito</th>
                                                        <th className="px-4 py-3 text-center">Bocas Luz</th>
                                                        <th className="px-4 py-3 text-center">Bocas Tomas</th>
                                                        <th className="px-4 py-3 text-center">Potencia (VA)</th>
                                                        <th className="px-4 py-3 text-center">Protección</th>
                                                        <th className="px-4 py-3 text-center">Cable</th>
                                                        <th className="px-4 py-3 text-center">PAT</th>
                                                        <th className="px-4 py-3 text-center">PE</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {circuitosDelPanel.map(env => {
                                                        const vaCircuito = (env.bocasLuz || 0) * 25 + (env.bocasTomas || 0) * 240 + (env.cargasEspeciales || 0);
                                                        return (
                                                            <tr key={env.id} className="hover:bg-slate-50/50">
                                                                <td className="px-4 py-3 font-medium text-slate-700">{env.name}</td>
                                                                <td className="px-4 py-3 text-center">{env.bocasLuz || 0}</td>
                                                                <td className="px-4 py-3 text-center">{env.bocasTomas || 0}</td>
                                                                <td className="px-4 py-3 text-center font-bold text-blue-600">{vaCircuito.toFixed(0)}</td>
                                                                <td className="px-4 py-3 text-center text-xs">{env.breakerInfo || '-'}</td>
                                                                <td className="px-4 py-3 text-center text-xs">{env.cableInfo || '-'}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${env.hasPAT ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {env.hasPAT ? 'SÍ' : 'NO'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${env.hasPE ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {env.hasPE ? 'SÍ' : 'NO'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 italic">Sin circuitos asignados</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* NOTAS DE RELEVAMIENTO */}
            {environments.some(env => env.observacionesTecnicas) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-lg">Notas de Relevamiento Técnico</h4>
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Observaciones Profesionales</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {environments.filter(env => env.observacionesTecnicas).map(env => (
                            <div key={env.id} className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                                <p className="font-bold text-slate-700 text-sm mb-2">{env.name}</p>
                                <p className="text-slate-600 text-sm italic leading-relaxed">{env.observacionesTecnicas}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CHECKLIST DE 11 PUNTOS */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Checklist de Verificación Técnica (Pág. 130)
                    </h4>
                    <div className="text-sm">
                        <span className={`font-bold ${checklistComplete ? 'text-green-600' : 'text-amber-600'}`}>
                            {checklistProgress}/11
                        </span>
                        <span className="text-slate-600 ml-1">puntos verificados</span>
                    </div>
                </div>

                {!checklistComplete && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg mb-4">
                        <p className="text-sm text-blue-700">
                            <strong>Nota:</strong> Puede guardar el proyecto como borrador sin completar el checklist.
                            Sin embargo, la generación de documentos PDF requiere que los 11 puntos estén verificados.
                        </p>
                    </div>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {checklistItems.map((item) => (
                        <label
                            key={item.key}
                            className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                            <input
                                type="checkbox"
                                checked={checklist[item.key as keyof typeof checklist]}
                                onChange={() => handleChecklistChange(item.key as keyof typeof checklist)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-0.5 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800">{item.title}</p>
                                <p className="text-xs text-slate-600 mt-0.5">{item.desc}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* UPLOAD DE FOTOS */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-blue-600" />
                    Fotos de Verificación
                    <span className="text-xs font-normal text-slate-500">(Flexibles - Suba las que considere necesarias)</span>
                </h4>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <label className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-700 font-medium">Seleccionar archivos</span>
                        <span className="text-slate-600"> o arrastrar aquí</span>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </label>
                    <p className="text-xs text-slate-500 mt-2">
                        JPG, PNG (máx. 5MB por archivo) - Ej: Tablero, PAT, Diferencial, etc.
                    </p>
                </div>

                {fotos.length > 0 && (
                    <div className="mt-4">
                        <p className="text-sm font-medium text-slate-700 mb-2">
                            {fotos.length} archivo(s) seleccionado(s):
                        </p>
                        <ul className="space-y-1">
                            {fotos.map((file, idx) => (
                                <li key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* BOTONES DE NAVEGACIÓN */}
            <div className="flex justify-between pt-4 border-t gap-4">
                <button
                    onClick={onBack}
                    className="px-6 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                    Atrás
                </button>

                <div className="flex gap-3">
                    {/* Botón Guardar Borrador */}
                    <button
                        onClick={onNext}
                        className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2 font-bold"
                    >
                        <Save className="w-4 h-4" />
                        Guardar Borrador
                    </button>

                    {/* Botón Finalizar */}
                    <button
                        onClick={onNext}
                        disabled={!canFinalize}
                        className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${canFinalize
                            ? 'bg-green-600 hover:bg-green-700 hover:scale-105'
                            : 'bg-slate-300 cursor-not-allowed'
                            }`}
                        title={!canFinalize ? 'Complete el checklist (11/11) y agregue fotos para habilitar' : ''}
                    >
                        <FileDown className="w-4 h-4" />
                        {canFinalize ? 'Guardar Proyecto' : `Checklist ${checklistProgress}/11`}
                    </button>
                </div>
            </div>

            {!canFinalize && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg">
                    <p className="text-sm text-amber-700">
                        <strong>Pendiente para finalizar:</strong>
                        {!checklistComplete && ` Completar checklist (${checklistProgress}/11 puntos)`}
                        {!checklistComplete && fotos.length === 0 && ' • '}
                        {fotos.length === 0 && ' Agregar fotos de verificación'}
                    </p>
                </div>
            )}
        </div>
    );
}
