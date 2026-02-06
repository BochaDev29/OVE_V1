import { Shield, ShieldCheck, Activity, Box, Package, ChevronDown, ChevronUp, MessageSquare, MessageSquareText, Trash2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Panel, ProjectConfig, CircuitInventoryItem, ProtectionHeader, calculatePanelDPMS, calculatePanelIb } from '../../../lib/electrical-rules';
import { ProtectionHeadersManager } from './ProtectionHeadersManager';

interface PanelContentSectionProps {
    panel: Panel;
    config: ProjectConfig;
    assignedCircuits: CircuitInventoryItem[];
    diagnostics: any;
    onUpdate: (updates: Partial<Panel>) => void;
    isExpanded: boolean;
    onToggle: () => void;
}

export function PanelContentSection({
    panel,
    config,
    assignedCircuits,
    diagnostics,
    onUpdate,
    isExpanded,
    onToggle
}: PanelContentSectionProps) {
    // Estado para expandir/colapsar notas del gabinete
    const [showNotes, setShowNotes] = useState(false);

    // Calcular PIAs de circuitos para jerarquía
    const circuitPIAs = assignedCircuits.map(c => {
        const piaMatch = c.breaker?.match(/(\d+)A/);
        return piaMatch ? parseInt(piaMatch[1]) : 0;
    });
    const maxCircuitPIA = circuitPIAs.length > 0 ? Math.max(...circuitPIAs) : 0;
    const headerPIA = panel.protections?.piaRating || 25;

    // Validación de coordinación
    const coordinationStatus = assignedCircuits.length === 0
        ? 'none'
        : headerPIA > maxCircuitPIA
            ? 'ok'
            : headerPIA === maxCircuitPIA
                ? 'warning'
                : 'error';

    return (
        <div className={`bg-slate-50/30 rounded-xl border-2 border-slate-200 transition-all ${isExpanded ? 'p-4 space-y-4' : 'p-2'}`}>
            <div
                className="flex items-center justify-between cursor-pointer group/header"
                onClick={onToggle}
            >
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Box className="w-4 h-4 text-slate-700" /> Contenido - Características del Tablero
                </h4>
                <div className="flex items-center gap-3">
                    {!isExpanded && (
                        <div className="text-[10px] font-bold flex items-center gap-2">
                            <div className={`px-2 py-0.5 rounded border ${diagnostics.coordination.isValid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                {headerPIA}A
                            </div>
                            {panel.protections?.hasID && (
                                <div className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                                    ID {panel.protections.idRating}A
                                </div>
                            )}
                            <div className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                {panel.enclosure?.modules || 12} mod
                            </div>
                        </div>
                    )}
                    <div className="text-slate-400 group-hover/header:text-slate-600 transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>
            </div>

            {isExpanded && (
                <>

                    {/* DIAGNÓSTICO TÉCNICO (Ancho completo arriba) */}
                    <div className="bg-purple-50/40 p-3 rounded-lg border border-purple-200">
                        <div className="text-[10px] font-bold text-purple-700 uppercase mb-2 flex items-center gap-1">
                            <Activity className="w-3 h-3" /> Diagnóstico Técnico
                        </div>

                        {/* Badges */}
                        <div className="flex gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold border ${diagnostics.coordination.isValid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                {diagnostics.coordination.isValid ? '✓ COORDINADO' : '✕ ERROR PROTECCIÓN'}
                            </span>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold border ${!diagnostics.voltageDrop.exceedsLimit ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                {diagnostics.voltageDrop.total.toFixed(2)}% ΔV ACUM.
                            </span>
                        </div>

                        {/* Métricas Clave */}
                        <div className="grid grid-cols-4 gap-2 text-center bg-white p-2 rounded border border-slate-200">
                            <div>
                                <div className="text-[9px] uppercase text-slate-500 font-bold">Ib</div>
                                <div className="text-sm font-black text-slate-800">
                                    {(diagnostics?.Ib ?? (assignedCircuits.length > 0 ? calculatePanelIb(calculatePanelDPMS(assignedCircuits), panel.voltage) : 0)).toFixed(1)}A
                                </div>
                            </div>
                            <div>
                                <div className="text-[9px] uppercase text-slate-500 font-bold">Iz</div>
                                <div className={`text-sm font-black ${diagnostics.lineData.izCorrected === 0 ? 'text-red-500' : 'text-blue-600'}`}>
                                    {diagnostics.lineData.izCorrected.toFixed(1)}A
                                </div>
                            </div>
                            <div>
                                <div className="text-[9px] uppercase text-slate-500 font-bold">ΔV Loc.</div>
                                <div className="text-sm font-black text-slate-800">{diagnostics.voltageDrop.local.toFixed(2)}%</div>
                            </div>
                            <div>
                                <div className="text-[9px] uppercase text-slate-500 font-bold">ΔV Acum.</div>
                                <div className="text-sm font-black text-slate-800">{diagnostics.voltageDrop.total.toFixed(2)}%</div>
                            </div>
                        </div>

                        {/* Mensajes de Error */}
                        {!diagnostics.coordination.isValid && (
                            <div className="text-[10px] text-red-600 font-medium leading-tight mt-2">
                                {diagnostics.coordination.errors[0]}
                            </div>
                        )}

                        {/* 🆕 Errores de validación de circuitos individuales */}
                        {diagnostics.circuitValidations && Array.from(diagnostics.circuitValidations.entries()).some(([_, v]) => !v.isValid) && (
                            <div className="mt-2 space-y-1">
                                <div className="text-[9px] font-bold text-red-700 uppercase">⚠️ Errores de Coordinación de Circuitos:</div>
                                {Array.from(diagnostics.circuitValidations.entries())
                                    .filter(([_, validation]) => !validation.isValid)
                                    .map(([circuitId, validation]) => (
                                        <div key={circuitId} className="text-[10px] text-red-600 font-medium leading-tight bg-red-50 p-1.5 rounded border border-red-200">
                                            <strong>{circuitId}:</strong> {validation.errors.join(' ')}
                                        </div>
                                    ))
                                }
                            </div>
                        )}

                        {/* 🆕 Errores de jerarquía de protecciones (sin circuitos) */}
                        {diagnostics.protectionHierarchyValidation && !diagnostics.protectionHierarchyValidation.isValid && (
                            <div className="mt-2 space-y-1">
                                <div className="text-[9px] font-bold text-red-700 uppercase">⚠️ Errores de Jerarquía de Protecciones:</div>
                                {diagnostics.protectionHierarchyValidation.errors.map((error, idx) => (
                                    <div key={idx} className="text-[10px] text-red-600 font-medium leading-tight bg-red-50 p-1.5 rounded border border-red-200">
                                        {error}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 🆕 Errores de Selectividad (NUEVO) */}
                        {diagnostics.selectivity && (!diagnostics.selectivity.isValid || diagnostics.selectivity.warnings.length > 0) && (
                            <div className="mt-2 space-y-1">
                                <div className="text-[9px] font-bold text-red-700 uppercase">
                                    {(diagnostics.selectivity.errors.length > 0) ? '❌ FALLA DE SELECTIVIDAD:' : '⚠️ ADVERTENCIAS DE SELECTIVIDAD:'}
                                </div>
                                {diagnostics.selectivity.errors.map((error: string, idx: number) => (
                                    <div key={`err-${idx}`} className="text-[10px] text-red-600 font-bold leading-tight bg-red-100 p-1.5 rounded border border-red-300 animate-pulse">
                                        {error}
                                    </div>
                                ))}
                                {diagnostics.selectivity.warnings.map((warning: string, idx: number) => (
                                    <div key={`warn-${idx}`} className="text-[10px] text-amber-700 font-medium leading-tight bg-amber-50 p-1.5 rounded border border-amber-200">
                                        {warning}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* GRID 2 COLUMNAS: PROTECCIONES | GABINETE */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* COLUMNA IZQUIERDA: PROTECCIONES */}
                        <div className="bg-blue-50/30 p-3 rounded-lg border border-blue-200 space-y-3">
                            <ProtectionHeadersManager
                                headers={panel.protections?.headers || []}
                                panelVoltage={panel.type === 'TP' ? config.voltage : panel.voltage}
                                onUpdate={(headers) => onUpdate({ protections: { headers } })}
                                estadoObra={config.estadoObra}
                            />
                        </div>

                        <div className="bg-green-50/30 p-3 rounded-lg border border-green-200 space-y-3">
                            <div className="text-[10px] font-bold text-green-700 uppercase flex items-center gap-1">
                                <Package className="w-3 h-3" /> Gabinete
                            </div>

                            <div className="space-y-3">
                                {/* Fila 1: Módulos | IP | Material | Altura */}
                                <div className="grid grid-cols-4 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Módulos</label>
                                        <select
                                            value={panel.enclosure?.modules || 12}
                                            onChange={(e) => onUpdate({
                                                enclosure: { ...(panel.enclosure || { mountingType: 'embutido', ipRating: 'IP41' }), modules: parseInt(e.target.value) }
                                            })}
                                            className="w-full text-xs border-slate-300 rounded p-1 bg-white"
                                        >
                                            {[4, 8, 12, 18, 24, 36, 48].map(m => (
                                                <option key={m} value={m}>{m} mod</option>
                                            ))}
                                        </select>
                                        <div className="text-[9px] text-indigo-600 mt-1 flex items-center gap-1">
                                            💡 {diagnostics.modules.suggested} sug.
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Altura (m)</label>
                                        <input
                                            type="number"
                                            value={panel.physicalData?.height ?? (panel.type === 'TP' ? 1.1 : 1.5)}
                                            step="0.1"
                                            min="0"
                                            onChange={(e) => onUpdate({
                                                physicalData: { ...(panel.physicalData || {}), height: parseFloat(e.target.value) }
                                            })}
                                            className="w-full text-xs border-slate-300 rounded p-1 font-mono"
                                            placeholder="1.1"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Grado IP</label>
                                        <select
                                            value={panel.enclosure?.ipRating || 'IP41'}
                                            onChange={(e) => onUpdate({
                                                enclosure: { ...(panel.enclosure || { mountingType: 'embutido', material: 'PVC-doble aislacion' }), ipRating: e.target.value as any }
                                            })}
                                            className="w-full text-xs border-slate-300 rounded p-1 bg-white"
                                        >
                                            <option value="IP41">IP41</option>
                                            <option value="IP54">IP54</option>
                                            <option value="IP65">IP65</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Material</label>
                                        <select
                                            value={panel.enclosure?.material || 'PVC-doble aislacion'}
                                            onChange={(e) => onUpdate({
                                                enclosure: { ...(panel.enclosure || { mountingType: 'embutido', ipRating: 'IP41' }), material: e.target.value as any }
                                            })}
                                            className="w-full text-xs border-slate-300 rounded p-1 bg-white"
                                        >
                                            <option value="PVC-doble aislacion">PVC-D.A.</option>
                                            <option value="Chapa-doble aislacion">Chapa-D.A.</option>
                                            <option value="plastico">Plástico</option>
                                            <option value="metalico">Metálico</option>
                                        </select>
                                    </div>
                                </div>


                                {/* Fila 2: Ubicación / Detalles */}
                                <div className="pt-1 border-t border-green-100/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[10px] uppercase font-bold text-green-700/70 block">Ubicación / Detalles del Gabinete</label>
                                        <button
                                            onClick={() => setShowNotes(!showNotes)}
                                            className={`p-1 rounded-full transition-colors ${panel.physicalData?.details ? 'text-green-600 bg-green-50 focus:ring-2 focus:ring-green-500' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                                            title="Agregar/Ver detalles del gabinete"
                                        >
                                            {panel.physicalData?.details ? <MessageSquareText className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    {showNotes && (
                                        <textarea
                                            autoFocus
                                            value={panel.physicalData?.details || ''}
                                            onChange={(e) => onUpdate({
                                                physicalData: { ...(panel.physicalData || {}), details: e.target.value }
                                            })}
                                            placeholder="Ej: Colocado en comedor en lugar accesible a una altura de 1,5m..."
                                            className="w-full text-xs border-green-200 rounded-md bg-green-50/30 focus:bg-white transition-all h-16 resize-none p-2 italic text-slate-600 outline-none focus:ring-2 focus:ring-green-200"
                                        />
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-1 border-t border-green-100 mt-2">
                                    <input
                                        type="checkbox"
                                        checked={panel.grounding?.hasPAT ?? (panel.type === 'TP')}
                                        onChange={(e) => onUpdate({
                                            grounding: {
                                                hasPAT: e.target.checked,
                                                patType: panel.grounding?.patType || 'PAT_SIMPLE',
                                                patResistance: panel.grounding?.patResistance || undefined
                                            }
                                        })}
                                        className="rounded border-slate-300 w-3 h-3 text-green-600 focus:ring-green-500"
                                    />
                                    <label className="text-[10px] font-bold text-green-700 select-none">PAT (Jabalina)</label>
                                </div>

                                {/* Campo de Medición de Resistencia PAT */}
                                {panel.grounding?.hasPAT && (
                                    <div className="bg-green-50 p-2 rounded border border-green-200 space-y-1">
                                        <label className="text-[10px] font-bold text-green-700 block">
                                            Resistencia Medida (Ω) <span className="text-red-600">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={panel.grounding?.patResistance ?? ''}
                                            onChange={(e) => {
                                                const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                                onUpdate({
                                                    grounding: {
                                                        ...panel.grounding,
                                                        hasPAT: true,
                                                        patType: panel.grounding?.patType || 'PAT_SIMPLE',
                                                        patResistance: value
                                                    }
                                                });
                                            }}
                                            placeholder="Ej: 15"
                                            min="0"
                                            step="0.1"
                                            className={`w-full text-sm border rounded-md p-1.5 font-mono ${panel.grounding?.patResistance === undefined
                                                ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500'
                                                : panel.grounding.patResistance > 40
                                                    ? 'border-amber-500 bg-amber-50 focus:ring-amber-500 focus:border-amber-500'
                                                    : 'border-green-300 bg-white focus:ring-green-500 focus:border-green-500'
                                                }`}
                                        />
                                        {panel.grounding?.patResistance === undefined && (
                                            <div className="text-[9px] text-red-600 font-medium">
                                                ⚠️ Medición obligatoria para seguridad
                                            </div>
                                        )}
                                        {panel.grounding?.patResistance !== undefined && panel.grounding.patResistance > 40 && (
                                            <div className="text-[9px] text-amber-600 font-medium">
                                                ⚠️ Excede 40Ω (AEA 770) - Requiere mejora
                                            </div>
                                        )}
                                        {panel.grounding?.patResistance !== undefined && panel.grounding.patResistance <= 40 && (
                                            <div className="text-[9px] text-green-600 font-medium">
                                                ✓ Cumple normativa (≤ 40Ω)
                                            </div>
                                        )}
                                        <div className="text-[9px] text-slate-500 italic">
                                            Medición con telurómetro. Normativa: ≤ 40Ω (AEA 770)
                                        </div>

                                        {/* Checklist de Materiales Normativos */}
                                        <div className="mt-3 pt-3 border-t border-green-200">
                                            <div className="text-[10px] font-bold text-green-700 mb-2">
                                                📋 Materiales Normativos (para documentación)
                                            </div>
                                            <div className="space-y-1.5">
                                                {/* Cable PAT */}
                                                <div className="flex items-start gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={!!panel.grounding?.materials?.cablePAT}
                                                        onChange={(e) => {
                                                            const s = panel.incomingLine?.section || 4;
                                                            const spe = s <= 16 ? s : (s / 2);
                                                            const speFinal = Math.max(spe, 2.5);

                                                            onUpdate({
                                                                grounding: {
                                                                    ...panel.grounding,
                                                                    hasPAT: true,
                                                                    materials: {
                                                                        ...panel.grounding?.materials,
                                                                        cablePAT: e.target.checked ? {
                                                                            section: speFinal,
                                                                            standard: 'IRAM NM 247-3',
                                                                            color: 'Verde-Amarillo'
                                                                        } : undefined
                                                                    }
                                                                }
                                                            });
                                                        }}
                                                        className="rounded border-slate-300 w-3 h-3 text-green-600 focus:ring-green-500 mt-0.5"
                                                    />
                                                    <label className="text-[9px] text-slate-700 leading-tight">
                                                        Cable PAT verde-amarillo <strong>{panel.grounding?.materials?.cablePAT?.section || (panel.incomingLine?.section ? Math.max(panel.incomingLine.section <= 16 ? panel.incomingLine.section : panel.incomingLine.section / 2, 2.5) : 4)}mm²</strong> (IRAM NM 247-3)
                                                    </label>
                                                </div>


                                                {/* Tomacable */}
                                                <div className="flex items-start gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={panel.grounding?.materials?.tomacable?.hasCompliantClamp ?? false}
                                                        onChange={(e) => onUpdate({
                                                            grounding: {
                                                                ...panel.grounding,
                                                                hasPAT: true,
                                                                materials: {
                                                                    ...panel.grounding?.materials,
                                                                    tomacable: e.target.checked ? {
                                                                        hasCompliantClamp: true,
                                                                        standard: 'IRAM 2343'
                                                                    } : undefined
                                                                }
                                                            }
                                                        })}
                                                        className="rounded border-slate-300 w-3 h-3 text-green-600 focus:ring-green-500 mt-0.5"
                                                    />
                                                    <label className="text-[9px] text-slate-700 leading-tight">
                                                        Tomacable <strong>IRAM 2343</strong>
                                                    </label>
                                                </div>

                                                {/* Jabalina */}
                                                <div className="flex items-start gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={panel.grounding?.materials?.jabalina?.hasCompliantRod ?? false}
                                                        onChange={(e) => onUpdate({
                                                            grounding: {
                                                                ...panel.grounding,
                                                                hasPAT: true,
                                                                materials: {
                                                                    ...panel.grounding?.materials,
                                                                    jabalina: e.target.checked ? {
                                                                        hasCompliantRod: true,
                                                                        standard: 'IRAM 2309'
                                                                    } : undefined
                                                                }
                                                            }
                                                        })}
                                                        className="rounded border-slate-300 w-3 h-3 text-green-600 focus:ring-green-500 mt-0.5"
                                                    />
                                                    <label className="text-[9px] text-slate-700 leading-tight">
                                                        Jabalina <strong>IRAM 2309</strong>
                                                    </label>
                                                </div>

                                                {/* Caja de Inspección */}
                                                <div className="flex items-start gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={panel.grounding?.materials?.inspectionBox?.hasBox ?? false}
                                                        onChange={(e) => onUpdate({
                                                            grounding: {
                                                                ...panel.grounding,
                                                                hasPAT: true,
                                                                materials: {
                                                                    ...panel.grounding?.materials,
                                                                    inspectionBox: e.target.checked ? {
                                                                        hasBox: true,
                                                                        material: 'PVC con tapa removible'
                                                                    } : undefined
                                                                }
                                                            }
                                                        })}
                                                        className="rounded border-slate-300 w-3 h-3 text-green-600 focus:ring-green-500 mt-0.5"
                                                    />
                                                    <label className="text-[9px] text-slate-700 leading-tight">
                                                        Caja de inspección <strong>PVC c/tapa removible</strong>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="text-[8px] text-slate-400 italic mt-2">
                                                💡 Estos datos se incluirán en la documentación técnica
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {config.projectType === 'existente' && (
                                    <div className="text-[9px] text-slate-400 italic">
                                        * Relevamiento físico
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )
            }
        </div >
    );
}
