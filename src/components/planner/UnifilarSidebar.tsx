import React from 'react';
import { Box, Zap, AlertCircle } from 'lucide-react';
import type { ProjectConfig } from '../../lib/electrical-rules';

interface UnifilarSidebarProps {
    config: ProjectConfig;
    onPanelSelect?: (panelId: string) => void;
    selectedPanelId?: string | null;
}

/**
 * Sidebar específico para el modo unifilar
 * 
 * Muestra:
 * - Lista de tableros (TP, TS, TSG)
 * - Circuitos por tablero
 * - Balance de cargas (trifásico)
 * - Datos técnicos
 */
export default function UnifilarSidebar({
    config,
    onPanelSelect,
    selectedPanelId
}: UnifilarSidebarProps) {

    const isTrifasico = config.acometida?.phases === 3;
    const panels = config.panels || [];

    return (
        <div className="absolute right-4 top-16 bottom-6 w-80 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 z-20 flex flex-col overflow-hidden">

            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    Diagrama Unifilar
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                    {isTrifasico ? 'Sistema Trifásico (380V)' : 'Sistema Monofásico (220V)'}
                </p>
            </div>

            {/* Tableros */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Tableros
                </div>

                {panels.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-xs text-slate-400">
                            No hay tableros configurados
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Configúralos en el Wizard Step 3
                        </p>
                    </div>
                ) : (
                    panels.map((panel) => {
                        const isSelected = selectedPanelId === panel.id;
                        // Filtrar circuitos por panelId
                        const assignedCircuits = config.circuitInventoryForCAD?.filter(
                            c => c.panelId === panel.id
                        ) || [];

                        return (
                            <div
                                key={panel.id}
                                onClick={() => onPanelSelect?.(panel.id)}
                                className={`p-3 rounded-lg border transition-all cursor-pointer ${isSelected
                                        ? 'bg-blue-50 border-blue-300 shadow-sm'
                                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                {/* Nombre del tablero */}
                                <div className="flex items-center gap-2 mb-2">
                                    <Box className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-600'}`} />
                                    <span className="font-bold text-sm text-slate-800">
                                        {panel.name}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        ({panel.type})
                                    </span>
                                </div>

                                {/* Info del tablero */}
                                <div className="text-xs text-slate-600 space-y-1">
                                    {panel.enclosure && (
                                        <div>
                                            <span className="font-medium">Gabinete:</span>{' '}
                                            {panel.enclosure.ipRating} - {panel.enclosure.modules} módulos
                                        </div>
                                    )}

                                    {/* Diferencial - buscar en headers */}
                                    {panel.protections?.headers?.find(h => h.type === 'ID') && (
                                        <div>
                                            <span className="font-medium">Diferencial:</span>{' '}
                                            {isTrifasico ? '4' : '2'}x{panel.protections.headers.find(h => h.type === 'ID')?.rating || 25}A{' '}
                                            {panel.protections.headers.find(h => h.type === 'ID')?.sensitivity || 30}mA
                                        </div>
                                    )}

                                    <div>
                                        <span className="font-medium">Circuitos:</span>{' '}
                                        {assignedCircuits.length}
                                    </div>
                                </div>

                                {/* Lista de circuitos (colapsable) */}
                                {isSelected && assignedCircuits.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-blue-200 space-y-1">
                                        {assignedCircuits.map((circuit) => (
                                            <div
                                                key={circuit.id}
                                                className="text-xs bg-white/50 p-2 rounded border border-blue-100"
                                            >
                                                <div className="font-medium text-slate-700">
                                                    {circuit.designation}
                                                </div>
                                                <div className="text-slate-500">
                                                    {circuit.protection?.rating}A - {circuit.cable?.section}mm²
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer con info adicional */}
            <div className="p-3 border-t border-slate-200 bg-slate-50">
                <div className="text-xs text-slate-600">
                    <div className="font-medium mb-1">Sistema:</div>
                    <div className="flex justify-between">
                        <span>Tableros:</span>
                        <span className="font-bold">{panels.length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Circuitos:</span>
                        <span className="font-bold">{config.circuitInventoryForCAD?.length || 0}</span>
                    </div>
                    {isTrifasico && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                            <div className="text-xs text-blue-600 font-medium">
                                ⚡ Balance de fases disponible próximamente
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
