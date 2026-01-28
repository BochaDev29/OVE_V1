// Tipos para sistema de cotas/dimensiones

/**
 * Cota/Dimensión - Medida entre dos puntos
 */
export interface Dimension {
    id: string;
    type: 'dimension';

    // Puntos de medición (coordenadas absolutas en el canvas)
    startPoint: { x: number; y: number };
    endPoint: { x: number; y: number };

    // Distancia calculada
    distanceMeters: number;  // Distancia real en metros
    distancePixels: number;  // Distancia en píxeles

    // Offset para el texto (perpendicular a la línea)
    textOffset: number; // píxeles, default: 20

    // Metadata
    layerId: string; // 'layer-0' o 'layer-medidas'
}

/**
 * Estilo visual de cotas
 */
export const DIMENSION_STYLE = {
    lineColor: '#000000',
    lineWidth: 1.5,
    arrowSize: 8,
    textColor: '#000000',
    textSize: 16, // Legible en tablet
    textFont: 'Arial',
    textBold: true,
    extensionLineLength: 20, // píxeles
    textOffset: 20 // píxeles desde la línea
} as const;

/**
 * Función helper para crear una cota
 */
export const createDimension = (
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number },
    pixelsPerMeter: number,
    layerId: string = 'layer-0'
): Dimension => {
    // Calcular distancia
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const distancePixels = Math.sqrt(dx * dx + dy * dy);
    const distanceMeters = distancePixels / pixelsPerMeter;

    return {
        id: `dimension-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'dimension',
        startPoint,
        endPoint,
        distanceMeters,
        distancePixels,
        textOffset: DIMENSION_STYLE.textOffset,
        layerId
    };
};

/**
 * Calcular posición del texto de la cota
 */
export const getDimensionTextPosition = (
    dimension: Dimension
): { x: number; y: number; angle: number } => {
    const { startPoint, endPoint, textOffset } = dimension;

    // Punto medio
    const midX = (startPoint.x + endPoint.x) / 2;
    const midY = (startPoint.y + endPoint.y) / 2;

    // Ángulo de la línea
    const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);

    // Perpendicular para offset
    const perpAngle = angle + Math.PI / 2;
    const textX = midX + Math.cos(perpAngle) * textOffset;
    const textY = midY + Math.sin(perpAngle) * textOffset;

    return { x: textX, y: textY, angle };
};

/**
 * Calcular puntos de flecha en un extremo
 */
export const getArrowPoints = (
    point: { x: number; y: number },
    angle: number,
    size: number = DIMENSION_STYLE.arrowSize
): number[] => {
    // Triángulo apuntando hacia el punto
    const angle1 = angle + Math.PI - Math.PI / 6; // 30 grados
    const angle2 = angle + Math.PI + Math.PI / 6;

    return [
        point.x, point.y,
        point.x + Math.cos(angle1) * size, point.y + Math.sin(angle1) * size,
        point.x + Math.cos(angle2) * size, point.y + Math.sin(angle2) * size
    ];
};

/**
 * Formatear distancia para mostrar
 */
export const formatDistance = (meters: number): string => {
    return `${meters.toFixed(2)}m`;
};
