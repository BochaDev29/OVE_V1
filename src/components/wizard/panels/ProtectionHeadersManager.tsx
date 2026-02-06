import { Shield, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { ProtectionHeader } from '../../../lib/electrical-rules';
import { useState, useMemo } from 'react';

interface ProtectionHeadersManagerProps {
    headers: ProtectionHeader[];
    panelVoltage: '220V' | '380V';
    onUpdate: (headers: ProtectionHeader[]) => void;
    estadoObra?: string;
}

export function ProtectionHeadersManager({ headers, panelVoltage, onUpdate, estadoObra }: ProtectionHeadersManagerProps) {
    const [expandedHeaders, setExpandedHeaders] = useState<Set<string>>(new Set(headers.map(h => h.id)));

    const showNatureSelectors = useMemo(() => {
        return ['modificacion', 'existente', 'provisoria'].includes(estadoObra || '');
    }, [estadoObra]);

    const toggleExpanded = (headerId: string) => {
        const newExpanded = new Set(expandedHeaders);
        if (newExpanded.has(headerId)) {
            newExpanded.delete(headerId);
        } else {
            newExpanded.add(headerId);
        }
        setExpandedHeaders(newExpanded);
    };

    const addHeader = () => {
        const newHeader: ProtectionHeader = {
            id: `header-${Date.now()}`,
            name: 'Protección General',
            type: 'PIA',
            rating: 25,
            poles: '2P',
            phase: panelVoltage === '380V' ? (['R', 'S', 'T'][headers.length % 3] as any) : undefined,
            curve: 'C',
            breakingCapacity: '6kA'
        };
        onUpdate([...headers, newHeader]);
        // Expandir automáticamente la nueva protección
        setExpandedHeaders(prev => new Set([...prev, newHeader.id]));
    };

    const updateHeader = (index: number, updates: Partial<ProtectionHeader>) => {
        const newHeaders = [...headers];
        newHeaders[index] = { ...newHeaders[index], ...updates };
        onUpdate(newHeaders);
    };

    const removeHeader = (index: number) => {
        onUpdate(headers.filter((_, i) => i !== index));
    };

    // 🆕 Función para detectar ciclos en jerarquía de protecciones
    const wouldCreateCycle = (potentialParentId: string, childId: string): boolean => {
        if (potentialParentId === childId) return true;

        let current = headers.find(h => h.id === potentialParentId);
        while (current?.parentProtectionId) {
            if (current.parentProtectionId === childId) {
                return true; // Ciclo detectado
            }
            current = headers.find(h => h.id === current?.parentProtectionId);
        }
        return false;
    };

    // 🆕 Obtener protecciones disponibles como padres para una protección dada
    const getAvailableParents = (currentHeader: ProtectionHeader): ProtectionHeader[] => {
        return headers.filter(h => {
            // No puede ser padre de sí mismo
            if (h.id === currentHeader.id) return false;

            // No puede crear ciclos
            if (wouldCreateCycle(h.id, currentHeader.id)) return false;

            return true;
        });
    };

    return (
        <div className="space-y-3">
            <div className="text-[10px] font-bold text-blue-700 uppercase flex items-center gap-1">
                <Shield className="w-3 h-3" /> Protecciones de Cabecera
            </div>

            {/* Lista de protecciones */}
            <div className="space-y-2">
                {headers.map((header, index) => {
                    const isExpanded = expandedHeaders.has(header.id);

                    return (
                        <div key={header.id} className="bg-white rounded border border-blue-300">
                            {/* Header con nombre y controles */}
                            <div className="flex items-center justify-between p-2">
                                <div className="flex items-center gap-1 flex-1">
                                    {/* Botón de colapso */}
                                    <button
                                        onClick={() => toggleExpanded(header.id)}
                                        className="text-blue-600 hover:text-blue-800 p-0.5"
                                        title={isExpanded ? "Contraer" : "Expandir"}
                                    >
                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>

                                    {/* Prefijo de fase (solo lectura) */}
                                    {panelVoltage === '380V' && header.phase && (
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                            {header.poles === '4P' ? 'RST' : header.phase}
                                        </span>
                                    )}

                                    {/* Nombre editable */}
                                    <input
                                        type="text"
                                        value={header.name}
                                        onChange={(e) => updateHeader(index, { name: e.target.value })}
                                        className="text-[10px] font-bold text-blue-900 bg-transparent border-none focus:outline-none flex-1"
                                        placeholder="Nombre descriptivo"
                                    />

                                    {showNatureSelectors && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateHeader(index, { nature: header.nature === 'relevado' ? 'proyectado' : 'relevado' });
                                            }}
                                            className={`text-[8px] font-black px-1.5 py-0.5 rounded transition-all ${header.nature === 'relevado'
                                                ? 'bg-slate-200 text-slate-600 border border-slate-300'
                                                : 'bg-blue-600 text-white border border-blue-700 shadow-sm'
                                                }`}
                                            title={header.nature === 'relevado' ? 'Protección EXISTENTE (No presupuestar)' : 'Protección NUEVA (A presupuestar)'}
                                        >
                                            {header.nature === 'relevado' ? '🔍 REL' : '🆕 PROY'}
                                        </button>
                                    )}

                                    {/* Info resumida cuando está colapsado */}
                                    {!isExpanded && (
                                        <span className="text-[9px] text-slate-500">
                                            {header.type} {header.rating}A • {header.poles}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => removeHeader(index)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Eliminar protección"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Detalles expandibles */}
                            {isExpanded && (
                                <div className="px-2 pb-2 space-y-2">
                                    <div className="grid grid-cols-4 gap-2">
                                        {/* Tipo */}
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-600 block mb-1">Tipo</label>
                                            <select
                                                value={header.type}
                                                onChange={(e) => {
                                                    const newType = e.target.value as 'PIA' | 'ID';
                                                    updateHeader(index, {
                                                        type: newType,
                                                        sensitivity: newType === 'ID' ? '30mA' : undefined
                                                    });
                                                }}
                                                className="w-full text-[10px] rounded border-slate-300 p-1 bg-white"
                                            >
                                                <option value="PIA">PIA</option>
                                                <option value="ID">ID</option>
                                            </select>
                                        </div>

                                        {/* Amperaje */}
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-600 block mb-1">Amp.</label>
                                            <select
                                                value={header.rating}
                                                onChange={(e) => updateHeader(index, { rating: parseInt(e.target.value) })}
                                                className="w-full text-[10px] rounded border-slate-300 p-1 bg-white"
                                            >
                                                {header.type === 'PIA' ? (
                                                    // Amperajes para PIA
                                                    [10, 16, 20, 25, 32, 40, 50, 63, 80, 100].map(a => (
                                                        <option key={a} value={a}>{a}A</option>
                                                    ))
                                                ) : (
                                                    // Amperajes para ID (según norma IRAM)
                                                    [25, 40, 63].map(a => (
                                                        <option key={a} value={a}>{a}A</option>
                                                    ))
                                                )}
                                            </select>
                                        </div>

                                        {/* Polos */}
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-600 block mb-1">Polos</label>
                                            <select
                                                value={header.poles}
                                                onChange={(e) => updateHeader(index, { poles: e.target.value as '2P' | '4P' })}
                                                className="w-full text-[10px] rounded border-slate-300 p-1 bg-white"
                                            >
                                                <option value="2P">2P</option>
                                                {panelVoltage === '380V' && <option value="4P">4P</option>}
                                            </select>
                                        </div>

                                        {/* Fase */}
                                        {panelVoltage === '380V' && (
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-600 block mb-1">Fase</label>
                                                <select
                                                    value={header.phase || 'R'}
                                                    onChange={(e) => updateHeader(index, { phase: e.target.value as any })}
                                                    className="w-full text-[10px] rounded border-slate-300 p-1 bg-white"
                                                >
                                                    {header.poles === '2P' ? (
                                                        <>
                                                            <option value="R">R</option>
                                                            <option value="S">S</option>
                                                            <option value="T">T</option>
                                                        </>
                                                    ) : (
                                                        <option value="RST">RST</option>
                                                    )}
                                                </select>
                                            </div>
                                        )}

                                        {showNatureSelectors && (
                                            <div className="col-span-4">
                                                <label className="text-[9px] font-bold text-slate-600 block mb-1">Naturaleza de la Protección</label>
                                                <div className="grid grid-cols-2 gap-1">
                                                    <button
                                                        onClick={() => updateHeader(index, { nature: 'relevado' })}
                                                        className={`py-1 rounded text-[9px] font-bold border transition-all ${header.nature === 'relevado'
                                                            ? 'bg-slate-100 border-slate-400 text-slate-700 shadow-inner'
                                                            : 'bg-white border-slate-200 text-slate-400 opacity-60'
                                                            }`}
                                                    >
                                                        🔍 Existente
                                                    </button>
                                                    <button
                                                        onClick={() => updateHeader(index, { nature: 'proyectado' })}
                                                        className={`py-1 rounded text-[9px] font-bold border transition-all ${header.nature === 'proyectado'
                                                            ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-inner'
                                                            : 'bg-white border-blue-200 text-blue-400 opacity-60'
                                                            }`}
                                                    >
                                                        🆕 Nueva
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Fila 2: Curva/Sensibilidad + Poder de corte */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {header.type === 'PIA' ? (
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-600 block mb-1">Curva</label>
                                                <select
                                                    value={header.curve || 'C'}
                                                    onChange={(e) => updateHeader(index, { curve: e.target.value as any })}
                                                    className="w-full text-[10px] rounded border-slate-300 p-1 bg-white"
                                                >
                                                    <option value="B">B</option>
                                                    <option value="C">C</option>
                                                    <option value="D">D</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-600 block mb-1">Sensib.</label>
                                                <select
                                                    value={header.sensitivity || '30mA'}
                                                    onChange={(e) => updateHeader(index, { sensitivity: e.target.value as any })}
                                                    className="w-full text-[10px] rounded border-slate-300 p-1 bg-white"
                                                >
                                                    <option value="10mA">10mA (Piscinas)</option>
                                                    <option value="30mA">30mA (Personas)</option>
                                                    <option value="100mA">100mA (Máquinas)</option>
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-[9px] font-bold text-slate-600 block mb-1">Ruptura</label>
                                            <select
                                                value={header.breakingCapacity || '6kA'}
                                                onChange={(e) => updateHeader(index, { breakingCapacity: e.target.value as any })}
                                                className="w-full text-[10px] rounded border-slate-300 p-1 bg-white"
                                            >
                                                <option value="3kA">3kA</option>
                                                <option value="4.5kA">4.5kA</option>
                                                <option value="6kA">6kA</option>
                                                <option value="10kA">10kA</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* 🆕 Fila 3: Alimentado por (Jerarquía de protecciones) */}
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-600 block mb-1">Alimentado por (Opcional)</label>
                                        <select
                                            value={header.parentProtectionId || ''}
                                            onChange={(e) => updateHeader(index, { parentProtectionId: e.target.value || undefined })}
                                            className="w-full text-[10px] rounded border-slate-300 p-1 bg-white"
                                        >
                                            <option value="">Ninguno (Protección de cabecera)</option>
                                            {getAvailableParents(header).map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} ({p.type} {p.rating}A • {p.poles})
                                                </option>
                                            ))}
                                        </select>
                                        <div className="text-[8px] text-slate-400 italic mt-0.5">
                                            {header.parentProtectionId
                                                ? '↑ Esta protección está alimentada por la seleccionada'
                                                : '⚡ Esta es una protección de cabecera (raíz)'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Botón agregar protección */}
                <button
                    onClick={addHeader}
                    className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-dashed border-blue-300 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                >
                    <Plus className="w-3 h-3" />
                    Agregar Protección
                </button>

                {/* Warning si no hay protecciones */}
                {headers.length === 0 && (
                    <div className="bg-amber-50 border border-amber-300 rounded p-2 text-[9px] text-amber-700">
                        ⚠️ El tablero debe tener al menos una protección de cabecera
                    </div>
                )}
            </div>
        </div>
    );
}
