import { Group, Line, Arc, Circle } from 'react-konva';
import type { DoorOpening } from '../../types/openings';
import type { Wall } from '../../types/planner';
import { getOpeningPosition } from '../../lib/planner/utils/openingGeometry';

interface DoorComponentProps {
    door: DoorOpening;
    wall: Wall;
    roomGroupX: number;
    roomGroupY: number;
    roomGroupRotation: number;
    roomGroupScaleX: number;
    roomGroupScaleY: number;
    pixelsPerMeter: number;
}

export const DoorComponent = ({
    door,
    wall,
    roomGroupX,
    roomGroupY,
    roomGroupRotation,
    roomGroupScaleX,
    roomGroupScaleY,
    pixelsPerMeter
}: DoorComponentProps) => {
    // Calcular posición absoluta de la puerta
    const { x, y, angle } = getOpeningPosition(
        wall,
        door.position,
        roomGroupX,
        roomGroupY,
        roomGroupRotation,
        roomGroupScaleX,
        roomGroupScaleY
    );

    // Ancho de la puerta en píxeles
    const doorWidthPx = door.width * pixelsPerMeter;

    // Convertir ángulo a grados
    const angleDeg = (angle * 180) / Math.PI;

    // Calcular puntos del trazo blanco (perpendicular al muro)
    const halfWidth = doorWidthPx / 2;
    const perpAngle = angle + Math.PI / 2; // Perpendicular al muro

    // Trazo blanco que "rompe" el muro
    const whiteLineStart = {
        x: x - Math.cos(angle) * halfWidth,
        y: y - Math.sin(angle) * halfWidth
    };
    const whiteLineEnd = {
        x: x + Math.cos(angle) * halfWidth,
        y: y + Math.sin(angle) * halfWidth
    };

    // Radio del arco de apertura (igual al ancho de la puerta)
    const arcRadius = doorWidthPx;

    // Ángulo de inicio del arco según el sentido de apertura
    const arcStartAngle = door.doorSwing === 'right' ? angleDeg : angleDeg + 180;
    const arcEndAngle = arcStartAngle + 90;

    // Posición de la bisagra
    const hingeX = door.doorSwing === 'right' ? whiteLineEnd.x : whiteLineStart.x;
    const hingeY = door.doorSwing === 'right' ? whiteLineEnd.y : whiteLineStart.y;

    return (
        <Group>
            {/* Trazo blanco que rompe el muro */}
            <Line
                points={[whiteLineStart.x, whiteLineStart.y, whiteLineEnd.x, whiteLineEnd.y]}
                stroke="white"
                strokeWidth={6}
                lineCap="round"
            />

            {/* Arco de apertura de 90° */}
            <Arc
                x={hingeX}
                y={hingeY}
                innerRadius={0}
                outerRadius={arcRadius}
                angle={90}
                rotation={arcStartAngle}
                stroke="#666666"
                strokeWidth={1.5}
                dash={[4, 4]}
            />

            {/* Línea de la puerta (hoja) */}
            <Line
                points={[
                    hingeX,
                    hingeY,
                    hingeX + arcRadius * Math.cos((arcStartAngle * Math.PI) / 180),
                    hingeY + arcRadius * Math.sin((arcStartAngle * Math.PI) / 180)
                ]}
                stroke="#666666"
                strokeWidth={2}
            />

            {/* Punto de bisagra (opcional, para mejor visualización) */}
            <Circle
                x={hingeX}
                y={hingeY}
                radius={3}
                fill="#666666"
            />
        </Group>
    );
};
