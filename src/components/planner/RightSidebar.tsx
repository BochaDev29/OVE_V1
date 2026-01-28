import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import CalculationSidebar from './CalculationSidebar';
import { EnvironmentBlocks } from './EnvironmentBlocks';
import { QuotaPanel } from './QuotaPanel';

/**
 * Sidebar derecho con paneles apilados verticalmente
 * 
 * - Panel superior: Ambientes (colapsable)
 * - Panel inferior: Cálculos (siempre visible)
 */

interface RoomData {
    name: string;
    width: number;
    length: number;
    area: number;
}

interface RightSidebarProps {
    calculationData: any;
    symbols: any[];
    activeMode: 'floorPlan' | 'singleLine';
    onRoomDragStart: (room: RoomData) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
    calculationData,
    symbols,
    activeMode,
    onRoomDragStart
}) => {
    const [isEnvironmentsOpen, setIsEnvironmentsOpen] = useState(true);

    // Verificar si hay ambientes disponibles
    const hasEnvironments = calculationData?.environments?.some(
        (env: any) => env.width && env.length
    );

    return (
        <div className="w-80 bg-white border-l border-slate-200 shadow-lg flex flex-col overflow-hidden">
            {/* Panel Superior: Ambientes (Colapsable) */}
            {hasEnvironments && (
                <div className="border-b border-slate-200">
                    {/* Header Colapsable */}
                    <button
                        onClick={() => setIsEnvironmentsOpen(!isEnvironmentsOpen)}
                        className="w-full p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-colors flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <h3 className="font-bold text-slate-900 text-sm">
                                🏠 Ambientes del Proyecto
                            </h3>
                        </div>
                        {isEnvironmentsOpen ? (
                            <ChevronUp className="w-5 h-5 text-blue-600" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-blue-600" />
                        )}
                    </button>

                    {/* Contenido Colapsable */}
                    {isEnvironmentsOpen && (
                        <div className="max-h-80 overflow-y-auto p-4 bg-gradient-to-b from-blue-50/50 to-white">
                            <p className="text-xs text-slate-600 mb-3 italic">
                                Arrastra un ambiente al canvas para generar automáticamente las paredes
                            </p>
                            <EnvironmentBlocks
                                calculationData={calculationData}
                                onDragStart={onRoomDragStart}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Panel Inferior: Control y Cálculos */}
            <div className="flex-1 overflow-y-auto">
                {/* QuotaPanel - Control Wizard-Taller */}
                {calculationData && (
                    <div className="p-4 border-b border-slate-200">
                        <QuotaPanel
                            calculationData={calculationData}
                            symbols={symbols}
                            activeMode={activeMode}
                        />
                    </div>
                )}

                {/* CalculationSidebar - Datos del Cálculo */}
                <CalculationSidebar
                    calculationData={calculationData}
                    symbols={symbols}
                />
            </div>
        </div>
    );
};
