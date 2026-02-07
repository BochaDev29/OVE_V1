import React from 'react';
import { Home } from 'lucide-react';

/**
 * Componente para mostrar ambientes del Wizard como elementos accionables (Drag o Tap)
 */

interface RoomData {
    name: string;
    width: number;  // Ancho en metros
    length: number; // Largo en metros
    area: number;   // Superficie en m2
}

interface EnvironmentBlocksProps {
    calculationData: any;
    onDragStart: (room: RoomData) => void;
    onSelect?: (room: RoomData) => void;
}

export const EnvironmentBlocks: React.FC<EnvironmentBlocksProps> = ({
    calculationData,
    onDragStart,
    onSelect
}) => {
    // Extraer ambientes del cálculo (Step 2 del Wizard) e inyectar fallbacks para visualización
    const rawEnvironments = calculationData?.environments || [];
    const environments: RoomData[] = rawEnvironments.map((env: any) => ({
        name: env.name || 'Sin nombre',
        width: env.width || 0,
        length: env.length || 0,
        area: env.surface || 0 // Mapear surface del motor de reglas a area para el bloque
    }));

    if (environments.length === 0) {
        return (
            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                <p className="text-xs text-slate-400 font-medium">No hay ambientes configurados en el Wizard.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1 flex items-center gap-2">
                <Home className="w-3 h-3" /> Insertar Ambiente
            </h4>

            {environments.map((room, index) => (
                <div
                    key={index}
                    draggable
                    onDragStart={() => onDragStart(room)}
                    onClick={() => onSelect && onSelect(room)}
                    className="group flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Home className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700">{room.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium tracking-tight">
                                {room.width}m x {room.length}m • {room.area}m²
                            </span>
                        </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase">Toca para colocar</span>
                    </div>
                </div>
            ))}

            <p className="text-[9px] text-center text-slate-400 mt-2 italic px-2">
                * Arrastra al lienzo o toca para activar el modo de colocación.
            </p>
        </div>
    );
};
