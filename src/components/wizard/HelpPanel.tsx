import React from 'react';
import { Info, ArrowRight, Zap } from 'lucide-react';

/**
 * Panel de ayuda contextual para el Paso 3 - Tableros
 * Explica los conceptos clave: LP, CS, CT
 */
export default function HelpPanel() {
    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-blue-200 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-600 p-2 rounded-lg">
                    <Info className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900 text-lg">Guía Rápida - Tipos de Líneas</h4>
                    <p className="text-xs text-blue-700">Entendé la diferencia entre LP, CS y CT</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                {/* LP - Línea Principal */}
                <div className="bg-white p-4 rounded-lg border-2 border-blue-100 hover:border-blue-300 transition-all shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="bg-blue-100 p-1.5 rounded">
                            <ArrowRight className="w-4 h-4 text-blue-700" />
                        </div>
                        <div className="font-bold text-blue-700">LP - Línea Principal</div>
                    </div>
                    <div className="text-sm text-slate-700 space-y-2">
                        <p>Cable desde <strong className="text-blue-900">Medidor (M)</strong> hasta <strong className="text-blue-900">Tablero Principal (TP)</strong></p>
                        <div className="bg-blue-50 p-2 rounded text-xs space-y-1 mt-2">
                            <div className="flex items-center gap-2">
                                <span className="text-blue-600">•</span>
                                <span><strong>Distancia máxima:</strong> 2m</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-blue-600">•</span>
                                <span><strong>Método típico:</strong> B1 (Embutido)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-blue-600">•</span>
                                <span><strong>Normativa:</strong> AEA 770 Cl. 770.4.2</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CS - Circuito Seccional */}
                <div className="bg-white p-4 rounded-lg border-2 border-purple-100 hover:border-purple-300 transition-all shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="bg-purple-100 p-1.5 rounded">
                            <ArrowRight className="w-4 h-4 text-purple-700" />
                        </div>
                        <div className="font-bold text-purple-700">CS - Circuito Seccional</div>
                    </div>
                    <div className="text-sm text-slate-700 space-y-2">
                        <p>Cable desde <strong className="text-purple-900">TP</strong> hasta <strong className="text-purple-900">TSG/TS</strong></p>
                        <div className="bg-purple-50 p-2 rounded text-xs space-y-1 mt-2">
                            <div className="flex items-center gap-2">
                                <span className="text-purple-600">•</span>
                                <span><strong>Distancia:</strong> Variable según proyecto</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-purple-600">•</span>
                                <span><strong>Método:</strong> Configurable (B1, B2, D1, D2)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-purple-600">•</span>
                                <span><strong>Se configura:</strong> En cada tablero hijo</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CT - Circuito Terminal */}
                <div className="bg-white p-4 rounded-lg border-2 border-green-100 hover:border-green-300 transition-all shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="bg-green-100 p-1.5 rounded">
                            <Zap className="w-4 h-4 text-green-700" />
                        </div>
                        <div className="font-bold text-green-700">CT - Circuito Terminal</div>
                    </div>
                    <div className="text-sm text-slate-700 space-y-2">
                        <p>Cable desde <strong className="text-green-900">Tablero</strong> hasta <strong className="text-green-900">Boca/Punto</strong></p>
                        <div className="bg-green-50 p-2 rounded text-xs space-y-1 mt-2">
                            <div className="flex items-center gap-2">
                                <span className="text-green-600">•</span>
                                <span><strong>Longitud promedio:</strong> 10m (editable)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-green-600">•</span>
                                <span><strong>Método:</strong> Configurable por circuito</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-green-600">•</span>
                                <span><strong>Se configura:</strong> Al asignar a tablero</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Nota adicional */}
            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                <div className="text-xs text-slate-600">
                    <strong className="text-blue-900">💡 Tip:</strong> La configuración de CT (método y longitud) afecta el cálculo de <strong>Iz</strong> (corriente admisible) y <strong>ΔV</strong> (caída de tensión). Ajustá estos valores según la realidad de tu instalación.
                </div>
            </div>
        </div>
    );
}
