import React, { useState } from 'react';
import {
    ClipboardCheck, Check, AlertCircle, CheckCircle,
    ChevronDown, ChevronRight, Zap, Shield, Cable
} from 'lucide-react';
import { useProjectQuota, getCircuitIcon } from '../../hooks/useProjectQuota';
import type { FloorPlanQuota, SingleLineQuota, EnvironmentQuota } from '../../hooks/useProjectQuota';

interface QuotaPanelProps {
    calculationData: any;
    symbols: any[];
    activeMode: 'floorPlan' | 'singleLine';
}

export const QuotaPanel: React.FC<QuotaPanelProps> = ({
    calculationData,
    symbols,
    activeMode
}) => {
    const quota = useProjectQuota(calculationData, symbols, activeMode);

    if (!quota) return null;

    return (
        <div className="bg-white border rounded-lg shadow-sm">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                <h3 className="font-bold flex items-center gap-2 text-slate-900">
                    <ClipboardCheck className="w-5 h-5 text-blue-600" />
                    Control de Instalación - {activeMode === 'floorPlan' ? 'PLANTA' : 'UNIFILAR'}
                </h3>
            </div>

            {/* Contenido según modo */}
            {activeMode === 'floorPlan' && quota.floorPlan ? (
                <FloorPlanQuota quota={quota.floorPlan} />
            ) : activeMode === 'singleLine' && quota.singleLine ? (
                <SingleLineQuota quota={quota.singleLine} />
            ) : null}
        </div>
    );
};

// ==================== MODO PLANTA ====================

const FloorPlanQuota: React.FC<{ quota: FloorPlanQuota }> = ({ quota }) => {
    const [expandedEnvs, setExpandedEnvs] = useState<Set<string>>(new Set());

    const toggleEnv = (envName: string) => {
        setExpandedEnvs(prev => {
            const next = new Set(prev);
            if (next.has(envName)) {
                next.delete(envName);
            } else {
                next.add(envName);
            }
            return next;
        });
    };

    return (
        <div className="p-4 space-y-4">
            {/* Resumen General */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-sm mb-3 text-slate-700">📋 Resumen General</h4>
                <div className="space-y-2">
                    <QuotaItem
                        icon="💡"
                        label="Luces"
                        required={quota.totalRequired.lights}
                        placed={quota.totalPlaced.lights}
                    />
                    <QuotaItem
                        icon="🔌"
                        label="Tomas"
                        required={quota.totalRequired.outlets}
                        placed={quota.totalPlaced.outlets}
                    />
                    <QuotaItem
                        icon="⚡"
                        label="Especiales"
                        required={quota.totalRequired.special}
                        placed={quota.totalPlaced.special}
                    />
                </div>
            </div>

            {/* Detalle por Ambiente */}
            {quota.environments.length > 0 && (
                <div>
                    <h4 className="font-semibold text-sm mb-2 text-slate-700">🏠 Detalle por Ambiente</h4>
                    <div className="space-y-2">
                        {quota.environments.map(env => (
                            <EnvironmentRow
                                key={env.name}
                                environment={env}
                                isExpanded={expandedEnvs.has(env.name)}
                                onToggle={() => toggleEnv(env.name)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Estado Final */}
            <div className="pt-3 border-t">
                {quota.isComplete ? (
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Instalación Completa ✅</span>
                    </div>
                ) : (
                    <div className="bg-orange-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-orange-700 mb-2">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">Instalación Incompleta</span>
                        </div>
                        {quota.missingItems.length > 0 && (
                            <p className="text-sm text-orange-600 ml-7">
                                Faltan: {quota.missingItems.join(', ')}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ==================== MODO UNIFILAR ====================

const SingleLineQuota: React.FC<{ quota: SingleLineQuota }> = ({ quota }) => {
    return (
        <div className="p-4 space-y-4">
            {/* Alimentación */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-sm text-blue-900">Alimentación</h4>
                </div>
                <div className="space-y-2">
                    <QuotaItem
                        icon="⚡"
                        label="Punto de Alimentación"
                        required={quota.required.feedPoint}
                        placed={quota.placed.feedPoint}
                    />
                    <QuotaItem
                        icon="📊"
                        label="Medidor"
                        required={quota.required.meter}
                        placed={quota.placed.meter}
                    />
                    <QuotaItem
                        icon="🔌"
                        label="Disyuntor General"
                        required={quota.required.mainBreaker}
                        placed={quota.placed.mainBreaker}
                    />
                </div>
            </div>

            {/* Protecciones */}
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <h4 className="font-semibold text-sm text-purple-900">Protecciones</h4>
                </div>
                <div className="space-y-2">
                    <QuotaItem
                        icon="💡"
                        label="Térmicas IUG (10A)"
                        required={quota.required.breakers.IUG}
                        placed={quota.placed.breakers.IUG}
                    />
                    <QuotaItem
                        icon="🔌"
                        label="Térmicas TUG (16A)"
                        required={quota.required.breakers.TUG}
                        placed={quota.placed.breakers.TUG}
                    />
                    <QuotaItem
                        icon="⚡"
                        label="Térmicas TUE (20A)"
                        required={quota.required.breakers.TUE}
                        placed={quota.placed.breakers.TUE}
                    />
                </div>
            </div>

            {/* Distribución */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                    <Cable className="w-4 h-4 text-slate-600" />
                    <h4 className="font-semibold text-sm text-slate-900">Distribución</h4>
                </div>
                <div className="space-y-2">
                    <QuotaItem
                        icon="🔗"
                        label="Borneras"
                        required={quota.required.distBlocks}
                        placed={quota.placed.distBlocks}
                    />
                    <QuotaItem
                        icon="➡️"
                        label="Salidas de Carga"
                        required={quota.required.loadArrows}
                        placed={quota.placed.loadArrows}
                    />
                </div>
            </div>

            {/* Estado Final */}
            <div className="pt-3 border-t">
                {quota.isComplete ? (
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Diagrama Completo ✅</span>
                    </div>
                ) : (
                    <div className="bg-orange-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-orange-700 mb-2">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">Diagrama Incompleto</span>
                        </div>
                        {quota.missingItems.length > 0 && (
                            <p className="text-sm text-orange-600 ml-7">
                                Faltan: {quota.missingItems.join(', ')}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ==================== SUBCOMPONENTES ====================

interface QuotaItemProps {
    icon: string;
    label: string;
    required: number;
    placed: number;
}

const QuotaItem: React.FC<QuotaItemProps> = ({ icon, label, required, placed }) => {
    const isComplete = placed >= required;
    const missing = Math.max(0, required - placed);

    return (
        <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                <span className="text-sm font-medium text-slate-700">{label}</span>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-sm text-slate-600">
                    <span className="font-bold text-slate-900">{placed}</span>
                    <span className="mx-1">/</span>
                    <span>{required}</span>
                </div>
                {isComplete ? (
                    <Check className="w-5 h-5 text-green-600" />
                ) : (
                    <div className="flex items-center gap-1 text-orange-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs font-medium">-{missing}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

interface EnvironmentRowProps {
    environment: EnvironmentQuota;
    isExpanded: boolean;
    onToggle: () => void;
}

const EnvironmentRow: React.FC<EnvironmentRowProps> = ({
    environment,
    isExpanded,
    onToggle
}) => {
    return (
        <div className="border rounded-lg overflow-hidden">
            {/* Header del ambiente */}
            <button
                onClick={onToggle}
                className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-600" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                    )}
                    <span className="font-medium text-slate-900">{environment.name}</span>
                    <span className="text-xs text-slate-500">
                        ({environment.area.toFixed(1)}m²)
                    </span>
                </div>
                {environment.isComplete ? (
                    <Check className="w-5 h-5 text-green-600" />
                ) : (
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                )}
            </button>

            {/* Circuitos del ambiente */}
            {isExpanded && environment.circuits.length > 0 && (
                <div className="p-3 pt-0 space-y-1 bg-slate-50">
                    {environment.circuits.map(circuit => (
                        <div
                            key={circuit.circuitId}
                            className="flex items-center justify-between py-2 px-3 bg-white rounded border border-slate-200"
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: circuit.color }}
                                />
                                <span className="text-sm font-medium text-slate-700">
                                    {circuit.circuitName}
                                </span>
                                <span className="text-xs text-slate-500">
                                    ({getCircuitIcon(circuit.circuitType)})
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">
                                    <span className="font-bold text-slate-900">{circuit.placed}</span>
                                    <span className="mx-1">/</span>
                                    <span>{circuit.required}</span>
                                </span>
                                {circuit.isComplete ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-orange-600" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
