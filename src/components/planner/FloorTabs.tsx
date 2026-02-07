import { Plus, Settings } from 'lucide-react';
import type { Floor } from '../../types/floors';

interface FloorTabsProps {
    floors: Floor[];
    currentFloorId: string;
    onFloorChange: (floorId: string) => void;
    onAddFloor: () => void;
    onEditFloor?: (floorId: string) => void;
    activeLayer?: { name: string; color: string };
    onClickIndicator?: () => void;
}

export const FloorTabs = ({
    floors,
    currentFloorId,
    onFloorChange,
    onAddFloor,
    onEditFloor,
    activeLayer,
    onClickIndicator
}: FloorTabsProps) => {
    return (
        <div className="flex items-center gap-1.5 bg-slate-50 border-b border-slate-200 p-1 overflow-x-auto no-scrollbar text-xs">
            {floors.map(floor => (
                <div
                    key={floor.id}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold whitespace-nowrap transition-all ${currentFloorId === floor.id
                        ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                        : 'text-slate-500 hover:bg-slate-100'
                        }`}
                >
                    <button
                        onClick={() => onFloorChange(floor.id)}
                        className="flex-1"
                    >
                        {floor.name.toUpperCase()}
                    </button>
                    {onEditFloor && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditFloor(floor.id);
                            }}
                            className="p-0.5 hover:bg-slate-200 rounded transition-colors"
                            title="Editar planta"
                        >
                            <Settings size={12} />
                        </button>
                    )}
                </div>
            ))}
            <button
                onClick={onAddFloor}
                className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                title="Agregar nueva planta"
            >
                <Plus size={14} />
                <span className="hidden md:inline text-[10px] font-black uppercase tracking-tighter">Nueva</span>
            </button>

            {/* TESTIGO DE CAPA ACTIVA (INDICADOR DINÁMICO) */}
            {activeLayer && (
                <button
                    onClick={onClickIndicator}
                    className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full transition-all group ml-2 active:scale-95 shadow-inner max-w-[140px] md:max-w-[200px]"
                    title={`Capa Activa: ${activeLayer.name}`}
                >
                    <div
                        className="w-2.5 h-2.5 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.1)] group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: activeLayer.color }}
                    />
                    <span className="text-[10px] font-black uppercase text-slate-600 tracking-tighter truncate">
                        {activeLayer.name}
                    </span>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ml-1 animate-pulse" />
                </button>
            )}
        </div>
    );
};
