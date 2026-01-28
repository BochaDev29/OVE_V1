import type { Wall } from '../../types/planner';

/**
 * Utilidad para generar automáticamente un rectángulo (4 paredes)
 * a partir de dimensiones en metros y escala del canvas
 */

interface RoomDimensions {
    width: number;  // Ancho en metros
    length: number; // Largo en metros
}

interface RoomPosition {
    x: number; // Posición X en el canvas (píxeles)
    y: number; // Posición Y en el canvas (píxeles)
}

/**
 * Genera 4 paredes formando un rectángulo
 * 
 * @param dimensions - Dimensiones del ambiente en metros
 * @param position - Posición inicial en el canvas (esquina superior izquierda)
 * @param pixelsPerMeter - Escala de conversión metros → píxeles
 * @returns Array de 4 paredes (Wall[])
 */
export const generateRoomWalls = (
    dimensions: RoomDimensions,
    position: RoomPosition,
    pixelsPerMeter: number
): Wall[] => {
    const { width, length } = dimensions;
    const { x, y } = position;

    // Convertir metros a píxeles
    const widthPx = width * pixelsPerMeter;
    const lengthPx = length * pixelsPerMeter;

    // Calcular puntos del rectángulo
    const topLeft = { x, y };
    const topRight = { x: x + widthPx, y };
    const bottomRight = { x: x + widthPx, y: y + lengthPx };
    const bottomLeft = { x, y: y + lengthPx };

    // Generar 4 paredes
    const timestamp = Date.now();

    return [
        // Pared superior (izquierda → derecha)
        {
            id: `wall-top-${timestamp}`,
            points: [topLeft.x, topLeft.y, topRight.x, topRight.y]
        },
        // Pared derecha (arriba → abajo)
        {
            id: `wall-right-${timestamp}`,
            points: [topRight.x, topRight.y, bottomRight.x, bottomRight.y]
        },
        // Pared inferior (derecha → izquierda)
        {
            id: `wall-bottom-${timestamp}`,
            points: [bottomRight.x, bottomRight.y, bottomLeft.x, bottomLeft.y]
        },
        // Pared izquierda (abajo → arriba)
        {
            id: `wall-left-${timestamp}`,
            points: [bottomLeft.x, bottomLeft.y, topLeft.x, topLeft.y]
        }
    ];
};

/**
 * Calcula el centro del rectángulo para posicionar etiquetas
 */
export const getRoomCenter = (
    dimensions: RoomDimensions,
    position: RoomPosition,
    pixelsPerMeter: number
): { x: number; y: number } => {
    const widthPx = dimensions.width * pixelsPerMeter;
    const lengthPx = dimensions.length * pixelsPerMeter;

    return {
        x: position.x + widthPx / 2,
        y: position.y + lengthPx / 2
    };
};
