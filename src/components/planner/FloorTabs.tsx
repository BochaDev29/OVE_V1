import { Plus, Settings } from 'lucide-react';
import type { Floor } from '../../types/floors';

interface FloorTabsProps {
    floors: Floor[];
    currentFloorId: string;
    onFloorChange: (floorId: string) => void;
    onAddFloor: () => void;
    onEditFloor?: (floorId: string) => void;
}

export const FloorTabs = ({
    floors,
    currentFloorId,
    onFloorChange,
    onAddFloor,
    onEditFloor
}: FloorTabsProps) => {
    return (
        <div className="flex items-center gap-2 bg-gray-100 p-2 overflow-x-auto border-b border-gray-300">
            {floors.map(floor => (
                <div
                    key={floor.id}
                    className={`flex items-center gap-1 px-3 py-2 rounded-t-lg font-medium whitespace-nowrap transition-colors ${currentFloorId === floor.id
                            ? 'bg-white text-blue-600 border-t-2 border-blue-600 shadow-sm'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                >
                    <button
                        onClick={() => onFloorChange(floor.id)}
                        className="flex-1"
                    >
                        {floor.name}
                    </button>
                    {onEditFloor && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditFloor(floor.id);
                            }}
                            className="p-1 hover:bg-gray-300 rounded transition-colors"
                            title="Editar planta"
                        >
                            <Settings size={14} />
                        </button>
                    )}
                </div>
            ))}
            <button
                onClick={onAddFloor}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1 transition-colors"
                title="Agregar nueva planta"
            >
                <Plus size={16} />
                <span className="hidden sm:inline">Nueva Planta</span>
            </button>
        </div>
    );
};
