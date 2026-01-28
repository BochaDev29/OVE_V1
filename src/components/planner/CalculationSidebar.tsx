import React from 'react';
import { X, Zap, Grid, Shield, Cable, Wrench } from 'lucide-react';

interface CalculationSidebarProps {
    calculationData: {
        config: any;
        environments: any[];
        calculation: any;
    } | null;
    symbols?: any[]; // Símbolos del canvas para conteo en tiempo real
    onClose?: () => void;
}

export default function CalculationSidebar({ calculationData, symbols = [], onClose }: CalculationSidebarProps) {
    if (!calculationData) {
        return (
            <div className="w-80 bg-white border-l border-slate-200 shadow-lg p-6 overflow-y-auto">
                <div className="text-center text-slate-500">
                    <Zap className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No hay datos de cálculo disponibles</p>
                    <p className="text-xs mt-2">Primero completa el wizard de cálculo</p>
                </div>
            </div>
        );
    }

    const { config, environments, calculation } = calculationData;

    return (
        <div className="w-80 bg-white border-l border-slate-200 shadow-lg overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50 sticky top-0">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-blue-600" />
                        Datos del Cálculo
                    </h3>
                    {onClose && (
                        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded">
                            <X className="w-4 h-4 text-slate-500" />
                        </button>
                    )}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                    {config.destination === 'vivienda' ? 'Vivienda' : 'Local'} - {config.surfaceArea} m²
                </p>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4 flex-1">
                {/* Demandas */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-blue-600" />
                        <h4 className="font-semibold text-sm text-blue-900">Demandas</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-600">Carga Total Instalada:</span>
                            <span className="font-bold text-purple-900">{Math.round((calculation.totalInstalledLoad || calculation.finalDemand) || 0)} VA</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600">DPMS (Dimensionado):</span>
                            <span className="font-bold text-blue-900">{Math.round((calculation.dpmsTotal || calculation.dpms || calculation.finalDemand) || 0)} VA</span>
                        </div>
                        <div className="flex justify-between text-xs border-t border-blue-200 pt-1 mt-1">
                            <span className="text-slate-500">Coef. Simultaneidad:</span>
                            <span className="font-mono text-slate-700">{(calculation.simultaneityCoefficient ?? 1).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                            <span className="text-slate-600">Corriente ({calculation.voltage}V):</span>
                            <span className="font-mono font-bold text-blue-700">{(calculation.current || 0).toFixed(2)} A</span>
                        </div>
                    </div>
                </div>

                {/* Grado de Electrificación */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Grid className="w-4 h-4 text-slate-600" />
                        <h4 className="font-semibold text-sm text-slate-900">Grado de Electrificación</h4>
                    </div>
                    <p className="text-lg font-black text-slate-900 uppercase">{calculation.grade}</p>
                </div>

                {/* Circuitos y Bocas */}
                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Grid className="w-4 h-4 text-green-600" />
                        <h4 className="font-semibold text-sm text-green-900">Circuitos y Bocas</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-600">Circuitos Mínimos:</span>
                            <span className="font-bold text-green-900">{calculation.minCircuits}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600">Circuitos Reales:</span>
                            <span className="font-bold text-green-900">{Math.max(calculation.minCircuits, calculation.actualCircuits)}</span>
                        </div>
                        <div className="flex justify-between border-t border-green-200 pt-1 mt-1">
                            <span className="text-slate-600">Total Bocas:</span>
                            <span className="font-bold text-green-700">{calculation.totalBocas}</span>
                        </div>
                    </div>
                </div>

                {/* Cargas por Tipo */}
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Wrench className="w-4 h-4 text-amber-600" />
                        <h4 className="font-semibold text-sm text-amber-900">Cargas por Tipo</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-600">Iluminación (IUG):</span>
                            <span className="font-medium">{calculation.iluminationPower} VA × {(calculation.simultaneityCoefficient || 1).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600">Tomas (TUG):</span>
                            <span className="font-medium">{calculation.socketsPower} VA × {(calculation.simultaneityCoefficient || 1).toFixed(2)}</span>
                        </div>
                        {calculation.specialPower > 0 && (
                            <div className="flex justify-between text-amber-700 bg-amber-100 px-2 py-1 rounded">
                                <span className="font-medium">Especiales (TUE/ACU):</span>
                                <span className="font-bold">{calculation.specialPower} VA × 1.0</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-amber-200 pt-1 mt-1 text-xs">
                            <span className="text-amber-600">DPMS General:</span>
                            <span className="font-bold text-amber-900">{Math.round(calculation.dpms || 0)} VA</span>
                        </div>
                    </div>
                </div>

                {/* Protecciones y Cables */}
                <div className="bg-slate-900 text-white p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-blue-400" />
                        <h4 className="font-semibold text-sm">Protecciones Principales</h4>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300">Cable Principal:</span>
                            <span className="font-mono font-bold text-yellow-400">{calculation.suggestedCable}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300">Térmica:</span>
                            <span className="font-mono font-bold text-blue-300">{calculation.suggestedBreaker}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300">Disyuntor:</span>
                            <span className="font-mono font-bold text-green-300">{calculation.suggestedDifferential}</span>
                        </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-700">
                        <h5 className="text-xs font-semibold text-slate-400 mb-2">Circuitos Terminales</h5>
                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-300">IUG (Iluminación):</span>
                                <span className="font-mono text-yellow-400">1.5mm² / TM 10A</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-300">TUG (Tomas):</span>
                                <span className="font-mono text-blue-300">2.5mm² / TM 16A</span>
                            </div>
                            {calculation.specialPower > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-300">TUE (Especial):</span>
                                    <span className="font-mono text-amber-300">2.5mm² / TM 20A</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bocas en Canvas (NUEVO - Actualización Bidireccional) */}
                {symbols.length > 0 && (
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-purple-600" />
                            <h4 className="font-semibold text-sm text-purple-900">Bocas en Canvas 🎨</h4>
                        </div>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-600">💡 Luces dibujadas:</span>
                                <span className="font-bold text-purple-900">
                                    {symbols.filter(s => s.type === 'light' || s.type === 'wall_light').length}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">🔌 Tomas dibujadas:</span>
                                <span className="font-bold text-purple-900">
                                    {symbols.filter(s => s.type === 'outlet').length}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-purple-200 pt-1 mt-1">
                                <span className="text-slate-600">⚡ Especiales:</span>
                                <span className="font-bold text-purple-700">
                                    {symbols.filter(s => s.type === 'ac' || s.type === 'fan').length}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-purple-200 pt-1 mt-1">
                                <span className="text-xs text-purple-600">📊 Total Símbolos:</span>
                                <span className="font-bold text-purple-900">{symbols.length}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bocas por Ambiente */}
                <div className="bg-white p-3 rounded-lg border border-slate-300">
                    <div className="flex items-center gap-2 mb-2">
                        <Cable className="w-4 h-4 text-slate-600" />
                        <h4 className="font-semibold text-sm text-slate-900">Bocas por Ambiente</h4>
                    </div>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {environments.map((env, idx) => (
                            <div key={idx} className="text-xs p-2 bg-slate-50 rounded border border-slate-200">
                                <p className="font-medium text-slate-900 mb-1">{env.name || `Ambiente ${idx + 1}`}</p>
                                <div className="flex gap-3 text-slate-600">
                                    <span>💡 {env.lights || 0}</span>
                                    <span>🔌 {env.regularOutlets || 0}</span>
                                    {(env.specialOutlets || 0) > 0 && <span>⚡ {env.specialOutlets}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
