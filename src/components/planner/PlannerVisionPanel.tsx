import React, { useState } from 'react';
import {
    Layers,
    Home,
    ClipboardCheck,
    Info,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';
import { QuotaPanel } from './QuotaPanel';
import { EnvironmentBlocks } from './EnvironmentBlocks';
import CalculationSidebar from './CalculationSidebar';
import { LayersPanel } from './LayersPanel';

interface PlannerVisionPanelProps {
    calculationData: any;
    symbols: any[];
    activeMode: 'floorPlan' | 'singleLine';
    layers: any[];
    currentLayerId: string;
    onLayerChange: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock: (id: string) => void;
    onColorChange: (id: string, color: string) => void;
    onRoomDragStart: (room: any) => void;
    onRoomSelect?: (room: any) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
}

type TabId = 'layers' | 'environments' | 'control' | 'help';

export const PlannerVisionPanel: React.FC<PlannerVisionPanelProps> = ({
    calculationData,
    symbols,
    activeMode,
    layers,
    currentLayerId,
    onLayerChange,
    onToggleVisibility,
    onToggleLock,
    onColorChange,
    onRoomDragStart,
    onRoomSelect,
    isCollapsed,
    onToggleCollapse,
    activeTab,
    onTabChange
}) => {

    const tabs: { id: TabId; icon: any; label: string }[] = [
        { id: 'layers', icon: Layers, label: 'CAPAS' },
        { id: 'environments', icon: Home, label: 'AMBIENTES' },
        { id: 'control', icon: ClipboardCheck, label: 'CONTROL' },
        { id: 'help', icon: Info, label: 'TÉCNICO' }
    ];

    return (
        <div className={`h-full flex flex-col bg-white border-l border-slate-200 transition-all duration-500 ease-in-out shadow-2xl relative ${isCollapsed ? 'w-12' : 'w-full md:w-[35%]'}`}>

            {/* BOTÓN COLAPSO (FLOTANTE) */}
            <button
                onClick={onToggleCollapse}
                className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-50 transition-all active:scale-90 z-50 text-slate-500"
            >
                {isCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>

            {/* HEADER PESTAÑAS (MÍNIMO) */}
            <div className={`flex border-b border-slate-100 overflow-hidden ${isCollapsed ? 'flex-col items-center pt-4' : 'px-2'}`}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            onTabChange(tab.id);
                            if (isCollapsed) onToggleCollapse();
                        }}
                        className={`flex flex-col items-center py-3 px-1 transition-all relative ${activeTab === tab.id
                            ? 'text-blue-600'
                            : 'text-slate-400 hover:text-slate-600'
                            } ${isCollapsed ? 'mb-4 w-8' : 'flex-1'}`}
                    >
                        <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                        {!isCollapsed && <span className="text-[9px] font-black mt-1.5 uppercase tracking-tighter">{tab.label}</span>}
                        {activeTab === tab.id && !isCollapsed && (
                            <div className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-blue-600 rounded-t-full shadow-[0_0_10px_rgba(37,99,235,0.3)]"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* CONTENIDO (DIVERSAS PESTAÑAS) */}
            {!isCollapsed && (
                <div className="flex-1 overflow-hidden relative bg-slate-50/30">
                    <div className="absolute inset-0 overflow-y-auto no-scrollbar">

                        {activeTab === 'layers' && (
                            <div className="p-4">
                                <LayersPanel
                                    layers={layers}
                                    currentLayerId={currentLayerId}
                                    onLayerChange={onLayerChange}
                                    onToggleVisibility={onToggleVisibility}
                                    onToggleLock={onToggleLock}
                                    onColorChange={onColorChange}
                                />
                            </div>
                        )}

                        {activeTab === 'environments' && (
                            <div className="p-4">
                                <EnvironmentBlocks
                                    calculationData={calculationData}
                                    onDragStart={onRoomDragStart}
                                    onSelect={onRoomSelect}
                                />
                            </div>
                        )}

                        {activeTab === 'control' && (
                            <div className="p-4">
                                <QuotaPanel calculationData={calculationData} symbols={symbols} activeMode={activeMode} />
                            </div>
                        )}

                        {activeTab === 'help' && (
                            <div className="p-4">
                                <CalculationSidebar calculationData={calculationData} symbols={symbols} />
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* FOOTER (BRANDING DISCRETO) */}
            {!isCollapsed && (
                <div className="p-3 border-t border-slate-100 bg-white flex justify-center">
                    <span className="text-[10px] font-bold text-slate-300 tracking-widest uppercase">OVE Taller CAD • El Cerebro v1.0</span>
                </div>
            )}
        </div>
    );
};
