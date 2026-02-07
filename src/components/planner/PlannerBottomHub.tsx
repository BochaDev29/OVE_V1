import React, { useRef } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Square, Type, Palette, MousePointer2 } from 'lucide-react';
import { SymbolItem } from '../../types/planner';
import { ARCHI_TOOLS, ELEC_TOOLS, UNIFILAR_TOOLS, GEOM_TOOLS, ToolDef } from '../../lib/planner/constants/tools';
import { Tool } from './PlannerToolbar';

interface PlannerBottomHubProps {
    tool: Tool;
    setTool: (tool: Tool) => void;
    activeMode: 'floorPlan' | 'singleLine';
    activeCategory: 'architecture' | 'electricity' | 'geometry';
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    onOpeningTool?: (type: 'door' | 'window' | 'passage') => void;
    selectedSymbol?: SymbolItem | null;
    onUpdateSymbol?: (id: string, updates: Partial<SymbolItem>) => void;
}

export const PlannerBottomHub: React.FC<PlannerBottomHubProps> = ({
    tool,
    setTool,
    activeMode,
    activeCategory,
    isCollapsed,
    setIsCollapsed,
    onOpeningTool,
    selectedSymbol,
    onUpdateSymbol
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Determinar qué herramientas mostrar
    const tools: ToolDef[] = activeMode === 'singleLine'
        ? UNIFILAR_TOOLS
        : (activeCategory === 'architecture' ? ARCHI_TOOLS : (activeCategory === 'electricity' ? ELEC_TOOLS : GEOM_TOOLS));

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const amount = 200;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -amount : amount,
                behavior: 'smooth'
            });
        }
    };

    const isGeometrySelected = selectedSymbol && ['rect', 'circle', 'triangle', 'line', 'arrow'].includes(selectedSymbol.type);

    return (
        <div className={`fixed bottom-4 left-[76px] z-40 transition-all duration-300 ${isCollapsed ? 'translate-y-[85%]' : 'translate-y-0'
            }`}>
            {/* PESTAÑA DE CARGA / COLLAPSE */}
            <div className={`flex mb-1 transition-all duration-300 ${isCollapsed ? 'justify-start ml-4' : 'justify-center'}`}>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="bg-slate-900 border border-white/20 text-white px-4 py-1 rounded-full shadow-2xl flex items-center gap-2 active:scale-95 transition-all backdrop-blur-md bg-opacity-80"
                >
                    {isCollapsed ? (
                        <>
                            <ChevronUp className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {isGeometrySelected ? 'PROPIEDADES' : 'SÍMBOLOS'}
                            </span>
                        </>
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* CONTENEDOR PRINCIPAL - GLASSMORPHISM UI */}
            <div className="bg-white/80 backdrop-blur-2xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl p-1.5 md:p-2 min-w-[320px] max-w-[calc(95vw-80px)] md:max-w-[800px] overflow-hidden group">
                {isGeometrySelected ? (
                    /* PANEL DE PROPIEDADES DE GEOMETRÍA */
                    <div className="flex items-center gap-4 py-1 px-3">
                        <div className="flex flex-col items-center border-r border-slate-200 pr-4">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Tipo</span>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <span className="text-xs font-bold uppercase">{selectedSymbol.type}</span>
                            </div>
                        </div>

                        {/* RELLENO */}
                        {['rect', 'circle', 'triangle'].includes(selectedSymbol.type) && (
                            <div className="flex flex-col items-center border-r border-slate-200 pr-4">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Relleno</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onUpdateSymbol?.(selectedSymbol.id, { isSolid: false })}
                                        className={`p-2 rounded-lg transition-all ${!selectedSymbol.isSolid ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                                        title="Contorno"
                                    >
                                        <Square className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onUpdateSymbol?.(selectedSymbol.id, { isSolid: true })}
                                        className={`p-2 rounded-lg transition-all ${selectedSymbol.isSolid ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                                        title="Sólido"
                                    >
                                        <div className="w-4 h-4 bg-current rounded-sm" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TRAZO */}
                        <div className="flex flex-col items-center pr-2">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Trazo</span>
                            <div className="flex gap-1">
                                {(['solid', 'dashed', 'dotted', 'symmetry'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => onUpdateSymbol?.(selectedSymbol.id, { lineType: type })}
                                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedSymbol.lineType === type || (!selectedSymbol.lineType && type === 'solid') ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                                    >
                                        {type === 'solid' ? '—' : type === 'dashed' ? '- -' : type === 'dotted' ? '· ·' : '- ·'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1" />

                        <button
                            onClick={() => onUpdateSymbol?.(selectedSymbol.id, {})} // Trigger re-render or similar if needed
                            className="p-2 text-slate-400 hover:text-slate-600"
                        >
                            <MousePointer2 className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    /* SELECTOR DE HERRAMIENTAS CORRIENTE */
                    <div className="relative flex items-center">
                        {/* Botones de Scroll (Solo visibles en Hover en Desktop) */}
                        <button
                            onClick={() => scroll('left')}
                            className="absolute left-0 z-20 p-1 bg-white/50 backdrop-blur-sm rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center -translate-x-1"
                        >
                            <ChevronLeft size={20} className="text-slate-700" />
                        </button>

                        <div
                            ref={scrollRef}
                            className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 scroll-smooth scrollbar-thin scrollbar-thumb-slate-200"
                        >
                            {tools.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        if (['door', 'window', 'passage'].includes(item.id) && onOpeningTool) {
                                            onOpeningTool(item.id as any);
                                        } else {
                                            setTool(item.id);
                                        }
                                    }}
                                    className={`flex flex-col items-center justify-center min-w-[56px] md:min-w-[64px] h-[56px] md:h-[64px] rounded-xl transition-all relative shrink-0 ${tool === item.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105 z-10'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                    title={item.label}
                                >
                                    <item.icon className={`w-5 h-5 md:w-6 md:h-6 ${tool === item.id ? 'animate-in fade-in zoom-in duration-300' : ''}`} />
                                    <span className={`text-[8px] md:text-[9px] font-bold uppercase mt-1 tracking-tight truncate w-full px-1 text-center ${tool === item.id ? 'opacity-100' : 'opacity-60'
                                        }`}>
                                        {item.label}
                                    </span>

                                    {/* INDICADOR ACTIVO */}
                                    {tool === item.id && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-blue-600 flex items-center justify-center shadow-sm">
                                            <div className="w-1 h-1 bg-blue-600 rounded-full animate-ping"></div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => scroll('right')}
                            className="absolute right-0 z-20 p-1 bg-white/50 backdrop-blur-sm rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center translate-x-1"
                        >
                            <ChevronRight size={20} className="text-slate-700" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
