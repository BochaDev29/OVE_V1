import { Group, Line, Text } from 'react-konva';
import type { Dimension } from '../../types/dimensions';
import {
    DIMENSION_STYLE,
    getDimensionTextPosition,
    getArrowPoints,
    formatDistance
} from '../../types/dimensions';

interface DimensionComponentProps {
    dimension: Dimension;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
    isSelectMode?: boolean;
    pixelsPerMeter?: number; // 🆕 Opcional (usa el de dimension si no se provee)
}

export const DimensionComponent = ({
    dimension,
    isSelected = false,
    onSelect,
    isSelectMode = false,
    pixelsPerMeter // 🆕
}: DimensionComponentProps) => {
    const { startPoint, endPoint } = dimension;

    // Calcular distancia dinámica (Sincronizada con la escala actual del plano)
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const distancePixels = Math.sqrt(dx * dx + dy * dy);

    // Si se pasa ppm por prop, recalcular. Si no, usar el guardado (para preview o compatibilidad)
    const activeDistanceMeters = pixelsPerMeter
        ? distancePixels / pixelsPerMeter
        : (dimension.distanceMeters || distancePixels / 50);

    // Calcular ángulo de la línea
    const angle = Math.atan2(dy, dx);

    // Posición del texto
    const textPos = getDimensionTextPosition({ ...dimension, distanceMeters: activeDistanceMeters });

    // Puntos de las flechas
    const startArrow = getArrowPoints(startPoint, angle);
    const endArrow = getArrowPoints(endPoint, angle + Math.PI); // Invertido

    // Líneas de extensión (perpendiculares a la línea principal)
    const perpAngle = angle + Math.PI / 2;
    const extLength = DIMENSION_STYLE.extensionLineLength;

    const startExt1 = {
        x: startPoint.x + Math.cos(perpAngle) * extLength,
        y: startPoint.y + Math.sin(perpAngle) * extLength
    };
    const startExt2 = {
        x: startPoint.x - Math.cos(perpAngle) * extLength,
        y: startPoint.y - Math.sin(perpAngle) * extLength
    };

    const endExt1 = {
        x: endPoint.x + Math.cos(perpAngle) * extLength,
        y: endPoint.y + Math.sin(perpAngle) * extLength
    };
    const endExt2 = {
        x: endPoint.x - Math.cos(perpAngle) * extLength,
        y: endPoint.y - Math.sin(perpAngle) * extLength
    };

    // Calcular rotación del texto para que siempre sea legible
    let textRotation = (angle * 180) / Math.PI;
    if (textRotation > 90 || textRotation < -90) {
        textRotation += 180;
    }

    // Color dinámico según selección
    const activeColor = isSelected ? '#2563eb' : DIMENSION_STYLE.lineColor; // Azul si seleccionado

    return (
        <Group
            onClick={() => onSelect?.(dimension.id)}
            onTap={() => onSelect?.(dimension.id)}
            cursor={isSelectMode ? 'pointer' : 'default'}
        >
            {/* Hitbox invisible (Fácil de cliquear) */}
            <Line
                points={[startPoint.x, startPoint.y, endPoint.x, endPoint.y]}
                stroke="transparent"
                strokeWidth={20}
                hitStrokeWidth={20}
            />

            {/* Líneas de extensión en punto inicial */}
            <Line
                points={[startExt1.x, startExt1.y, startExt2.x, startExt2.y]}
                stroke={activeColor}
                strokeWidth={DIMENSION_STYLE.lineWidth}
                opacity={0.5}
            />

            {/* Líneas de extensión en punto final */}
            <Line
                points={[endExt1.x, endExt1.y, endExt2.x, endExt2.y]}
                stroke={activeColor}
                strokeWidth={DIMENSION_STYLE.lineWidth}
                opacity={0.5}
            />

            {/* Línea principal de cota */}
            <Line
                points={[startPoint.x, startPoint.y, endPoint.x, endPoint.y]}
                stroke={activeColor}
                strokeWidth={DIMENSION_STYLE.lineWidth}
            />

            {/* Flecha en punto inicial */}
            <Line
                points={startArrow}
                stroke={activeColor}
                strokeWidth={DIMENSION_STYLE.lineWidth}
                fill={activeColor}
                closed={true}
            />

            {/* Flecha en punto final */}
            <Line
                points={endArrow}
                stroke={activeColor}
                strokeWidth={DIMENSION_STYLE.lineWidth}
                fill={activeColor}
                closed={true}
            />

            {/* Texto con medida */}
            <Text
                x={textPos.x}
                y={textPos.y}
                text={formatDistance(activeDistanceMeters)}
                fontSize={DIMENSION_STYLE.textSize}
                fontFamily={DIMENSION_STYLE.textFont}
                fontStyle={DIMENSION_STYLE.textBold ? 'bold' : 'normal'}
                fill={activeColor}
                rotation={textRotation}
                offsetX={0}
                offsetY={DIMENSION_STYLE.textSize / 2}
                align="center"
                shadowColor="white"
                shadowBlur={4}
                shadowOpacity={1}
                shadowOffsetX={0}
                shadowOffsetY={0}
            />
        </Group>
    );
};
