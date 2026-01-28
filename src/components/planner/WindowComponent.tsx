import { Group, Line } from 'react-konva';
import type { WindowOpening } from '../../types/openings';
import type { Wall } from '../../types/planner';
import { getOpeningPosition } from '../../lib/planner/utils/openingGeometry';

interface WindowComponentProps {
    window: WindowOpening;
    wall: Wall;
    roomGroupX: number;
    roomGroupY: number;
    roomGroupRotation: number;
    roomGroupScaleX: number;
    roomGroupScaleY: number;
    pixelsPerMeter: number;
}

export const WindowComponent = ({
    window,
    wall,
    roomGroupX,
    roomGroupY,
    roomGroupRotation,
    roomGroupScaleX,
    roomGroupScaleY,
    pixelsPerMeter
}: WindowComponentProps) => {
    // Calcular posición absoluta de la ventana
    const { x, y, angle } = getOpeningPosition(
        wall,
        window.position,
        roomGroupX,
        roomGroupY,
        roomGroupRotation,
        roomGroupScaleX,
        roomGroupScaleY
    );

    // Ancho de la ventana en píxeles
    const windowWidthPx = window.width * pixelsPerMeter;

    // Calcular puntos de las líneas paralelas
    const halfWidth = windowWidthPx / 2;

    // Puntos a lo largo del muro
    const lineStart = {
        x: x - Math.cos(angle) * halfWidth,
        y: y - Math.sin(angle) * halfWidth
    };
    const lineEnd = {
        x: x + Math.cos(angle) * halfWidth,
        y: y + Math.sin(angle) * halfWidth
    };

    // Ángulo perpendicular al muro para las líneas paralelas
    const perpAngle = angle + Math.PI / 2;
    const separation = 5; // Separación entre las dos líneas (píxeles)

    // Primera línea (exterior)
    const line1Start = {
        x: lineStart.x + Math.cos(perpAngle) * separation,
        y: lineStart.y + Math.sin(perpAngle) * separation
    };
    const line1End = {
        x: lineEnd.x + Math.cos(perpAngle) * separation,
        y: lineEnd.y + Math.sin(perpAngle) * separation
    };

    // Segunda línea (interior)
    const line2Start = {
        x: lineStart.x - Math.cos(perpAngle) * separation,
        y: lineStart.y - Math.sin(perpAngle) * separation
    };
    const line2End = {
        x: lineEnd.x - Math.cos(perpAngle) * separation,
        y: lineEnd.y - Math.sin(perpAngle) * separation
    };

    return (
        <Group>
            {/* Primera línea paralela */}
            <Line
                points={[line1Start.x, line1Start.y, line1End.x, line1End.y]}
                stroke="#333333"
                strokeWidth={2}
                lineCap="round"
            />

            {/* Segunda línea paralela */}
            <Line
                points={[line2Start.x, line2Start.y, line2End.x, line2End.y]}
                stroke="#333333"
                strokeWidth={2}
                lineCap="round"
            />

            {/* Líneas de conexión en los extremos (opcional, para mejor visualización) */}
            <Line
                points={[line1Start.x, line1Start.y, line2Start.x, line2Start.y]}
                stroke="#333333"
                strokeWidth={1.5}
            />
            <Line
                points={[line1End.x, line1End.y, line2End.x, line2End.y]}
                stroke="#333333"
                strokeWidth={1.5}
            />
        </Group>
    );
};
