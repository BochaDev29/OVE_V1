import React from 'react';
import { Home } from 'lucide-react';

/**
 * Componente para mostrar ambientes del Wizard como elementos arrastrables
 * 
 * Lee los datos de environments del calculationData (Paso 2 del Wizard)
 * y permite arrastrarlos al canvas para generar automáticamente
 * rectángulos con las dimensiones especificadas.
 */

interface RoomData {
    name: string;
    width: number;  // Ancho en metros
    length: number; // Largo en metros
    area: number;
}

interface EnvironmentBlocksProps {
    calculationData: any;
    onDragStart: (room: RoomData) => void;
}

export const EnvironmentBlocks: React.FC<EnvironmentBlocksProps> = ({
    calculationData,
    onDragStart
}) => {
    // Extraer ambientes del calculation data
    const environments = calculationData?.environments || [];

    // Filtrar solo ambientes con dimensiones válidas
    const validRooms: RoomData[] = environments
        .filter((env: any) => env.width && env.length)
        .map((env: any) => ({
            name: env.name || 'Ambiente',
            width: parseFloat(env.width) || 0,
            length: parseFloat(env.length) || 0,
            area: env.area || 0
        }))
        .filter((room: RoomData) => room.width > 0 && room.length > 0);

    if (validRooms.length === 0) {
        return (
            <div className="p-4 text-sm text-gray-500 text-center">
                <Home className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No hay ambientes con dimensiones</p>
                <p className="text-xs mt-1">Completa el Paso 2 del Wizard</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-600 px-2 mb-2">
                AMBIENTES DEL PROYECTO
            </div>

            {validRooms.map((room, index) => (
                <div
                    key={index}
                    draggable
                    onDragStart={() => onDragStart(room)}
                    className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-3 cursor-move hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Home className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-sm text-gray-800">
                            {room.name}
                        </span>
                    </div>

                    <div className="text-xs text-gray-600 space-y-0.5">
                        <div className="flex justify-between">
                            <span>Ancho:</span>
                            <span className="font-mono font-semibold">{room.width.toFixed(2)}m</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Largo:</span>
                            <span className="font-mono font-semibold">{room.length.toFixed(2)}m</span>
                        </div>
                        <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                            <span>Área:</span>
                            <span className="font-mono font-semibold text-blue-700">{room.area.toFixed(2)}m²</span>
                        </div>
                    </div>

                    <div className="mt-2 text-xs text-blue-600 font-medium">
                        ⤢ Arrastra al canvas
                    </div>
                </div>
            ))}
        </div>
    );
};
