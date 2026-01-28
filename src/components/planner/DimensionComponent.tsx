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
}

export const DimensionComponent = ({ dimension }: DimensionComponentProps) => {
    const { startPoint, endPoint, distanceMeters } = dimension;

    // Calcular ángulo de la línea
    const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);

    // Posición del texto
    const textPos = getDimensionTextPosition(dimension);

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

    return (
        <Group>
            {/* Líneas de extensión en punto inicial */}
            <Line
                points={[startExt1.x, startExt1.y, startExt2.x, startExt2.y]}
                stroke={DIMENSION_STYLE.lineColor}
                strokeWidth={DIMENSION_STYLE.lineWidth}
                opacity={0.5}
            />

            {/* Líneas de extensión en punto final */}
            <Line
                points={[endExt1.x, endExt1.y, endExt2.x, endExt2.y]}
                stroke={DIMENSION_STYLE.lineColor}
                strokeWidth={DIMENSION_STYLE.lineWidth}
                opacity={0.5}
            />

            {/* Línea principal de cota */}
            <Line
                points={[startPoint.x, startPoint.y, endPoint.x, endPoint.y]}
                stroke={DIMENSION_STYLE.lineColor}
                strokeWidth={DIMENSION_STYLE.lineWidth}
            />

            {/* Flecha en punto inicial */}
            <Line
                points={startArrow}
                stroke={DIMENSION_STYLE.lineColor}
                strokeWidth={DIMENSION_STYLE.lineWidth}
                fill={DIMENSION_STYLE.lineColor}
                closed={true}
            />

            {/* Flecha en punto final */}
            <Line
                points={endArrow}
                stroke={DIMENSION_STYLE.lineColor}
                strokeWidth={DIMENSION_STYLE.lineWidth}
                fill={DIMENSION_STYLE.lineColor}
                closed={true}
            />

            {/* Texto con medida */}
            <Text
                x={textPos.x}
                y={textPos.y}
                text={formatDistance(distanceMeters)}
                fontSize={DIMENSION_STYLE.textSize}
                fontFamily={DIMENSION_STYLE.textFont}
                fontStyle={DIMENSION_STYLE.textBold ? 'bold' : 'normal'}
                fill={DIMENSION_STYLE.textColor}
                rotation={textRotation}
                offsetX={0} // Se ajustará con align
                offsetY={DIMENSION_STYLE.textSize / 2} // Centrar verticalmente
                align="center"
                // Fondo blanco para mejor legibilidad
                shadowColor="white"
                shadowBlur={4}
                shadowOpacity={1}
                shadowOffsetX={0}
                shadowOffsetY={0}
            />
        </Group>
    );
};
