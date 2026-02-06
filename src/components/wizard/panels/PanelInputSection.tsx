import { ArrowRight, ChevronDown, ChevronUp, MessageSquare, MessageSquareText } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Panel, ProjectConfig } from '../../../lib/electrical-rules';

// Constantes de tamaños de cañería (copiadas del archivo principal)
const CONDUIT_SIZES: Record<string, Array<{ diameter: string; maxSection: number }>> = {
    B1: [
        { diameter: '13mm', maxSection: 2.5 },
        { diameter: '19mm', maxSection: 6 },
        { diameter: '25mm', maxSection: 10 },
        { diameter: '32mm', maxSection: 25 }
    ],
    B2: [
        { diameter: '19mm', maxSection: 4 },
        { diameter: '25mm', maxSection: 10 },
        { diameter: '32mm', maxSection: 25 },
        { diameter: '40mm', maxSection: 35 }
    ],
    D1: [
        { diameter: '25mm', maxSection: 6 },
        { diameter: '32mm', maxSection: 16 },
        { diameter: '40mm', maxSection: 35 },
        { diameter: '50mm', maxSection: 50 }
    ],
    D2: [
        { diameter: 'N/A', maxSection: 95 }
    ]
};

interface PanelInputSectionProps {
    panel: Panel;
    availablePanels: Panel[];
    onUpdate: (updates: Partial<Panel>) => void;
    updateLine: (updates: any) => void;
    isExpanded: boolean;
    onToggle: () => void;
    config: ProjectConfig;
}

export function PanelInputSection({
    panel,
    availablePanels,
    onUpdate,
    updateLine,
    isExpanded,
    onToggle,
    config
}: PanelInputSectionProps) {
    // Estado para expandir/colapsar notas
    const [showNotes, setShowNotes] = useState(false);

    const showNatureSelectors = useMemo(() => {
        return ['modificacion', 'existente', 'provisoria'].includes(config.estadoObra || '');
    }, [config.estadoObra]);

    // Valores actuales de la línea
    const currentSection = panel.incomingLine?.section || 4;
    const currentMethod = panel.incomingLine?.method || 'B1';
    const currentConduit = panel.incomingLine?.conduitDiameter || CONDUIT_SIZES[currentMethod]?.[0]?.diameter || '19mm';

    return (
        <div className={`bg-blue-50/30 rounded-xl border-2 border-blue-200 transition-all ${isExpanded ? 'p-4 space-y-4' : 'p-2'}`}>
            <div
                className="flex items-center justify-between cursor-pointer group/header"
                onClick={onToggle}
            >
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-blue-600" /> Entrada - Línea de Alimentación
                    {panel.incomingLine?.nature === 'relevado' && (
                        <span className="text-[8px] bg-slate-200 text-slate-600 px-1 rounded ml-1 border border-slate-300">🔍 EXISTENTE</span>
                    )}
                </h4>
                <div className="flex items-center gap-3">
                    {!isExpanded && (
                        <div className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded flex items-center gap-2">
                            <span>{panel.incomingLine?.method || 'B1'}</span>
                            <span className="text-blue-300">|</span>
                            <span>{currentSection}mm²</span>
                            <span className="text-blue-300">|</span>
                            <span>Ø {currentConduit}</span>
                        </div>
                    )}
                    <div className="text-blue-400 group-hover/header:text-blue-600 transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>
            </div>

            {isExpanded && (
                <>
                    {showNatureSelectors && (
                        <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-lg border border-blue-100 shadow-sm mb-2">
                            <div>
                                <label className="text-[9px] font-bold text-blue-700 block mb-1 uppercase tracking-tighter">Naturaleza del Gabinete</label>
                                <div className="grid grid-cols-2 gap-1">
                                    <button
                                        onClick={() => onUpdate({ nature: 'relevado' })}
                                        className={`py-1 rounded text-[9px] font-black border transition-all ${panel.nature === 'relevado'
                                            ? 'bg-slate-100 border-slate-400 text-slate-700 shadow-inner'
                                            : 'bg-white border-slate-200 text-slate-400 opacity-60'
                                            }`}
                                    >
                                        🔍 EXISTENTE
                                    </button>
                                    <button
                                        onClick={() => onUpdate({ nature: 'proyectado' })}
                                        className={`py-1 rounded text-[9px] font-black border transition-all ${panel.nature === 'proyectado'
                                            ? 'bg-blue-600 border-blue-700 text-white shadow-md'
                                            : 'bg-white border-slate-200 text-slate-400 opacity-60'
                                            }`}
                                    >
                                        🆕 NUEVO
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-indigo-700 block mb-1 uppercase tracking-tighter">Naturaleza de Alimentación</label>
                                <div className="grid grid-cols-2 gap-1">
                                    <button
                                        onClick={() => updateLine({ nature: 'relevado' })}
                                        className={`py-1 rounded text-[9px] font-black border transition-all ${panel.incomingLine?.nature === 'relevado'
                                            ? 'bg-slate-100 border-slate-400 text-slate-700 shadow-inner'
                                            : 'bg-white border-slate-200 text-slate-400 opacity-60'
                                            }`}
                                    >
                                        🔍 EXISTENTE
                                    </button>
                                    <button
                                        onClick={() => updateLine({ nature: 'proyectado' })}
                                        className={`py-1 rounded text-[9px] font-black border transition-all ${panel.incomingLine?.nature === 'proyectado'
                                            ? 'bg-indigo-600 border-indigo-700 text-white shadow-md'
                                            : 'bg-white border-slate-200 text-slate-400 opacity-60'
                                            }`}
                                    >
                                        🆕 NUEVA
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Indicador de Alimentación desde Medidor (solo TP) */}
                    {panel.type === 'TP' && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-2.5 rounded-lg border-2 border-blue-300 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">⚡</span>
                                <div className="text-xs font-bold text-blue-900">
                                    Alimentado desde: <span className="text-indigo-700">Medidor (M)</span> mediante la LP
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Padre (solo TS) */}
                    {panel.type !== 'TP' && (
                        <>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500">Alimentado desde</label>
                                <select
                                    value={
                                        panel.incomingLine?.sourceProtectionId
                                            ? `${panel.parentId}:${panel.incomingLine.sourceProtectionId}`
                                            : panel.parentId || ''
                                    }
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Si el valor contiene ":", es una protección específica
                                        if (value.includes(':')) {
                                            const [parentId, protectionId] = value.split(':');
                                            onUpdate({ parentId });
                                            updateLine({ sourceProtectionId: protectionId });
                                        } else {
                                            // Solo panel padre, sin protección específica
                                            onUpdate({ parentId: value });
                                            updateLine({ sourceProtectionId: undefined });
                                        }
                                    }}
                                    className="w-full text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Seleccionar Padre...</option>
                                    {availablePanels.map(p => {
                                        const protections = p.protections?.headers || [];

                                        return [
                                            // Opción: Solo panel (sin protección específica)
                                            <option key={p.id} value={p.id}>
                                                {p.name} (sin protección específica)
                                            </option>,
                                            // Opciones: Panel > Protección
                                            ...protections.map(prot => (
                                                <option key={`${p.id}:${prot.id}`} value={`${p.id}:${prot.id}`}>
                                                    {p.name} › {prot.name} ({prot.type} {prot.rating}A • {prot.poles})
                                                </option>
                                            ))
                                        ];
                                    })}
                                </select>
                            </div>

                            {/* Selector de Fase de Alimentación (solo si padre es 380V y panel es 220V) */}
                            {(() => {
                                const parentPanel = availablePanels.find(p => p.id === panel.parentId);
                                const showPhaseSelector = parentPanel?.voltage === '380V' && panel.voltage === '220V';

                                if (!showPhaseSelector) return null;

                                return (
                                    <div className="bg-amber-50 p-2 rounded border border-amber-200">
                                        <label className="text-[10px] uppercase font-bold text-amber-700 block mb-1">
                                            Fase de Alimentación
                                        </label>
                                        <select
                                            value={panel.incomingLine?.sourcePhase || 'R'}
                                            onChange={(e) => updateLine({ sourcePhase: e.target.value as 'R' | 'S' | 'T' })}
                                            className="w-full text-sm border-amber-300 rounded-md focus:ring-amber-500 focus:border-amber-500 bg-white"
                                        >
                                            <option value="R">Fase R</option>
                                            <option value="S">Fase S</option>
                                            <option value="T">Fase T</option>
                                        </select>
                                        <div className="text-[9px] text-amber-600 mt-1 italic">
                                            ℹ️ Tablero 220V alimentado desde fase del tablero 380V
                                        </div>
                                    </div>
                                );
                            })()}
                        </>
                    )}

                    {/* Fila 1: Distancia | Sección */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label
                                className="text-[10px] uppercase font-bold text-slate-500"
                                title={panel.type === 'TP' ? "Distancia desde el Medidor hasta este tablero" : "Distancia desde el panel padre hasta este tablero"}
                            >
                                Distancia (m) ℹ️
                            </label>
                            <input
                                type="number"
                                value={panel.feederDistance || 0}
                                onChange={(e) => updateLine({ length: parseFloat(e.target.value) || 0 })}
                                className={`w-full text-sm rounded-md font-mono ${panel.type === 'TP' && (panel.feederDistance || 0) > 2
                                    ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                                    : 'border-slate-300'
                                    }`}
                                min="0"
                                title="LP: máx 2m (AEA 770) | CS: variable según proyecto"
                            />
                            {panel.type === 'TP' && (panel.feederDistance || 0) > 2 && (
                                <div className="text-[9px] text-red-600 font-medium mt-1">
                                    ⚠️ LP excede 2m (AEA 770)
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500" title="Sección del conductor de fase">Sección ℹ️</label>
                            <select
                                value={currentSection}
                                onChange={(e) => updateLine({ section: parseFloat(e.target.value) })}
                                className={`w-full text-sm rounded-md font-bold text-blue-900 ${panel.type === 'TP' && currentSection < 4
                                    ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                                    : 'border-slate-300'
                                    }`}
                                title="Seleccionar según Ib calculada y método de instalación"
                            >
                                {/* LP (TP): mínimo 4mm² según AEA 770 */}
                                {panel.type === 'TP' ? (
                                    [4, 6, 10, 16, 25, 35, 50, 70, 95].map(s => (
                                        <option key={s} value={s}>{s}mm² Cu</option>
                                    ))
                                ) : (
                                    /* CS (TSG/TS): mínimo 2.5mm² */
                                    [2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95].map(s => (
                                        <option key={s} value={s}>{s}mm² Cu</option>
                                    ))
                                )}
                            </select>
                            {panel.type === 'TP' && currentSection < 4 && (
                                <div className="text-[9px] text-red-600 font-medium mt-1">
                                    ⚠️ LP requiere mínimo 4mm² (AEA 770)
                                </div>
                            )}
                            {panel.type !== 'TP' && currentSection < 2.5 && (
                                <div className="text-[9px] text-red-600 font-medium mt-1">
                                    ⚠️ CS requiere mínimo 2.5mm² (AEA 770)
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fila 2: Método | Cañería */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500">Método de Instalación</label>
                            <select
                                value={currentMethod}
                                onChange={(e) => updateLine({ method: e.target.value })}
                                className="w-full text-sm border-slate-300 rounded-md text-slate-700 truncate"
                            >
                                <option value="B1">B1 - Embutido en Pared</option>
                                <option value="B2">B2 - Bandeja / Cañería Exp.</option>
                                <option value="D1">D1 - Caño Enterrado</option>
                                <option value="D2">D2 - Directamente Enterrado</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500">Cañería ℹ️</label>
                            <select
                                value={currentConduit}
                                onChange={(e) => updateLine({ conduitDiameter: e.target.value } as any)}
                                className="w-full text-sm border-slate-300 rounded-md text-slate-700"
                                title="Diámetro de cañería según método y sección"
                            >
                                {CONDUIT_SIZES[currentMethod]?.map(c => (
                                    <option key={c.diameter} value={c.diameter}>
                                        Ø {c.diameter}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {currentMethod !== 'D2' && (
                        <div className="text-[9px] text-slate-500 mt-[-10px]">PVC rígido / Corrugado</div>
                    )}

                    {/* Notas de Instalación (Entrada) */}
                    <div className="pt-2 border-t border-blue-100 italic">
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] uppercase font-bold text-blue-700/70 block">Notas de Instalación / Detalles de Línea</label>
                            <button
                                onClick={() => setShowNotes(!showNotes)}
                                className={`p-1 rounded-full transition-colors ${panel.incomingLine?.notes ? 'text-blue-600 bg-blue-50 focus:ring-2 focus:ring-blue-500' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                title="Agregar/Ver notas de instalación"
                            >
                                {panel.incomingLine?.notes ? <MessageSquareText className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        {showNotes && (
                            <textarea
                                autoFocus
                                value={panel.incomingLine?.notes || ''}
                                onChange={(e) => updateLine({ notes: e.target.value })}
                                placeholder='Ej: Línea enterrada a 70cm con protección mecánica...'
                                className="w-full text-xs border-blue-200 rounded-md bg-blue-50/30 focus:bg-white transition-all h-16 resize-none p-2 italic text-slate-600 outline-none focus:ring-2 focus:ring-blue-200"
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
