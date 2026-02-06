import { Shield, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Panel, CircuitInventoryItem } from '../../../lib/electrical-rules';

interface PanelOutputSectionProps {
    panel: Panel;
    assignedCircuits: CircuitInventoryItem[];
    onUnassignCircuit: (circuitId: string) => void;
    onAssignCircuit: (circuitId: string, panelId: string) => void;
    allPanels: Panel[];
    isExpanded: boolean;
    onToggle: () => void;
}

export function PanelOutputSection({
    panel,
    assignedCircuits,
    onUnassignCircuit,
    onAssignCircuit,
    allPanels,
    isExpanded,
    onToggle
}: PanelOutputSectionProps) {
    if (assignedCircuits.length === 0) {
        return null;
    }

    return (
        <div className={`bg-slate-50/50 rounded-xl border-2 transition-all ${isExpanded ? 'p-3 space-y-3' : 'p-2'}`}>
            <div
                className="flex items-center justify-between cursor-pointer group/header"
                onClick={onToggle}
            >
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400" /> Salida - Jerarquía y Circuitos
                </div>
                <div className="flex items-center gap-3">
                    {!isExpanded && (
                        <div className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 text-[10px] font-bold">
                            {assignedCircuits.length} Circuitos
                        </div>
                    )}
                    <div className="text-slate-400 group-hover/header:text-slate-600 transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>
            </div>

            {isExpanded && (
                <>
                    {/* Agrupar circuitos por protección de cabecera */}
                    {(() => {
                        const headers = panel.protections?.headers || [];

                        // Si no hay headers en el nuevo formato, mostrar vista antigua
                        if (headers.length === 0) {
                            return (
                                <>
                                    {/* Cabecera de Protecciones (Vista Antigua) */}
                                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Shield className="w-4 h-4 text-blue-700" />
                                            <span className="text-xs font-bold text-blue-900">Protección de Cabecera</span>
                                        </div>
                                        <div className="flex gap-3 text-xs">
                                            <div className="bg-white px-3 py-1.5 rounded border border-blue-200">
                                                <span className="text-slate-500">PIA:</span>
                                                <span className="font-bold text-blue-900 ml-1">{panel.protections?.piaRating || 25}A</span>
                                            </div>
                                            {panel.protections?.hasID && (
                                                <div className="bg-white px-3 py-1.5 rounded border border-purple-200">
                                                    <span className="text-slate-500">ID:</span>
                                                    <span className="font-bold text-purple-900 ml-1">
                                                        {panel.protections?.idRating}A / {panel.protections?.idSensitivity}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Circuitos Hijos (Indentados) */}
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Circuitos Protegidos</div>
                                        <div className="flex flex-wrap gap-2 ml-4">
                                            {assignedCircuits.map(c => (
                                                <div key={c.id} className="bg-white border border-slate-200 rounded px-2 py-1 flex items-center gap-2 shadow-sm text-xs">
                                                    <span className="font-bold text-slate-700">{c.id}</span>
                                                    <span className="text-slate-400">|</span>
                                                    <span className="font-mono text-blue-700">{c.cable}</span>
                                                    <span className="text-slate-400">|</span>
                                                    <span className="font-mono text-green-700 font-bold">{c.breaker}</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onUnassignCircuit(c.id);
                                                        }}
                                                        className="text-slate-300 hover:text-red-500 ml-1"
                                                        title="Desasignar"
                                                    >
                                                        ✕
                                                    </button>

                                                    {/* Selector para mover de tablero */}
                                                    <select
                                                        value={panel.id}
                                                        onChange={(e) => onAssignCircuit(c.id, e.target.value)}
                                                        className="ml-1 text-[9px] bg-slate-50 border-none p-0 focus:ring-0 cursor-pointer text-slate-400 hover:text-blue-600 font-bold"
                                                        title="Mover a otro tablero"
                                                    >
                                                        <option value={panel.id}>Mover...</option>
                                                        {allPanels.filter(p => p.id !== panel.id).map(p => (
                                                            <option key={p.id} value={p.id}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            );
                        }

                        // Vista nueva: Agrupar por protección de cabecera
                        const circuitsByHeader = new Map<string, CircuitInventoryItem[]>();
                        const unassignedCircuits: CircuitInventoryItem[] = [];

                        // Agrupar circuitos
                        assignedCircuits.forEach(circuit => {
                            if (circuit.assignedHeaderId) {
                                const existing = circuitsByHeader.get(circuit.assignedHeaderId) || [];
                                circuitsByHeader.set(circuit.assignedHeaderId, [...existing, circuit]);
                            } else {
                                unassignedCircuits.push(circuit);
                            }
                        });

                        return (
                            <div className="space-y-3">
                                {/* Mostrar cada protección de cabecera con sus circuitos */}
                                {headers.map(header => {
                                    const circuits = circuitsByHeader.get(header.id) || [];

                                    return (
                                        <div key={header.id} className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-3">
                                            {/* Cabecera de Protección */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <Shield className="w-4 h-4 text-blue-700" />
                                                <span className="text-xs font-bold text-blue-900">{header.name}</span>
                                                <span className="text-[10px] text-slate-500">
                                                    ({header.type} {header.rating}A • {header.poles}{header.type === 'PIA' ? ` • Curva ${header.curve || 'C'}` : ` • ${header.sensitivity || '30mA'}`})
                                                </span>
                                            </div>

                                            {/* Circuitos bajo esta protección */}
                                            {circuits.length > 0 ? (
                                                <div className="flex flex-wrap gap-2 ml-4">
                                                    {circuits.map(c => (
                                                        <div key={c.id} className="bg-white border border-slate-200 rounded px-2 py-1 flex items-center gap-2 shadow-sm text-xs">
                                                            <span className="font-bold text-slate-700">{c.id}</span>
                                                            <span className="text-slate-400">|</span>
                                                            <span className="font-mono text-blue-700">{c.cable}</span>
                                                            <span className="text-slate-400">|</span>
                                                            <span className="font-mono text-green-700 font-bold">{c.breaker}</span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onUnassignCircuit(c.id);
                                                                }}
                                                                className="text-slate-300 hover:text-red-500 ml-1"
                                                                title="Desasignar"
                                                            >
                                                                ✕
                                                            </button>

                                                            {/* Selector para mover de tablero */}
                                                            <select
                                                                value={panel.id}
                                                                onChange={(e) => onAssignCircuit(c.id, e.target.value)}
                                                                className="ml-1 text-[9px] bg-slate-50 border-none p-0 focus:ring-0 cursor-pointer text-slate-400 hover:text-blue-600 font-bold"
                                                                title="Mover a otro tablero"
                                                            >
                                                                <option value={panel.id}>Mover...</option>
                                                                {allPanels.filter(p => p.id !== panel.id).map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-slate-400 italic ml-4">Sin circuitos asignados</div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Circuitos sin protección asignada */}
                                {unassignedCircuits.length > 0 && (
                                    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Shield className="w-4 h-4 text-amber-700" />
                                            <span className="text-xs font-bold text-amber-900">⚠️ Sin Protección Asignada</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 ml-4">
                                            {unassignedCircuits.map(c => (
                                                <div key={c.id} className="bg-white border border-amber-200 rounded px-2 py-1 flex items-center gap-2 shadow-sm text-xs">
                                                    <span className="font-bold text-slate-700">{c.id}</span>
                                                    <span className="text-slate-400">|</span>
                                                    <span className="font-mono text-blue-700">{c.cable}</span>
                                                    <span className="text-slate-400">|</span>
                                                    <span className="font-mono text-green-700 font-bold">{c.breaker}</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onUnassignCircuit(c.id);
                                                        }}
                                                        className="text-slate-300 hover:text-red-500 ml-1"
                                                        title="Desasignar"
                                                    >
                                                        ✕
                                                    </button>

                                                    {/* Selector para mover de tablero */}
                                                    <select
                                                        value={panel.id}
                                                        onChange={(e) => onAssignCircuit(c.id, e.target.value)}
                                                        className="ml-1 text-[9px] bg-slate-50 border-none p-0 focus:ring-0 cursor-pointer text-slate-400 hover:text-blue-600 font-bold"
                                                        title="Mover a otro tablero"
                                                    >
                                                        <option value={panel.id}>Mover...</option>
                                                        {allPanels.filter(p => p.id !== panel.id).map(p => (
                                                            <option key={p.id} value={p.id}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </>
            )}
        </div>
    );
}
