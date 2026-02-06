import { Group, Line, Arc, Circle } from 'react-konva';
import type { DoorOpening } from '../../types/openings';
import type { Wall } from '../../types/planner';
import { getOpeningPosition, getRelativePositionOnWall, validateOpeningPosition } from '../../lib/planner/utils/openingGeometry';

interface DoorComponentProps {
    door: DoorOpening;
    wall: Wall;
    roomGroupX: number;
    roomGroupY: number;
    roomGroupRotation: number;
    roomGroupScaleX: number;
    roomGroupScaleY: number;
    pixelsPerMeter: number;
    isSelectMode?: boolean;
    isSelected?: boolean;
    onUpdatePosition?: (newPosition: number) => void;
    onSelect?: (openingId: string) => void;
    onEdit?: (opening: DoorOpening) => void;
}

export const DoorComponent = ({
    door,
    wall,
    roomGroupX,
    roomGroupY,
    roomGroupRotation,
    roomGroupScaleX,
    roomGroupScaleY,
    pixelsPerMeter,
    isSelectMode,
    isSelected,
    onUpdatePosition,
    onSelect,
    onEdit
}: DoorComponentProps) => {
    // 1. Calcular longitud del muro en píxeles locales
    const lx1 = wall.points[0];
    const ly1 = wall.points[1];
    const lx2 = wall.points[2];
    const ly2 = wall.points[3];
    const wallLengthPx = Math.sqrt((lx2 - lx1) ** 2 + (ly2 - ly1) ** 2);

    // 2. Calcular posición de la abertura
    const { localX, localY, localAngle } = getOpeningPosition(
        wall,
        door.position,
        roomGroupX,
        roomGroupY,
        roomGroupRotation,
        roomGroupScaleX,
        roomGroupScaleY
    );

    // 3. Escala del ambiente (para hitboxes y grosores)
    const parentScaleX = Math.abs(roomGroupScaleX) || 1;
    const parentScaleY = Math.abs(roomGroupScaleY) || 1;
    const isVertical = Math.abs(Math.sin(localAngle)) > 0.5;
    const effectiveScale = isVertical ? parentScaleY : parentScaleX;

    // 4. Determinar ancho en píxeles (Sincronizado con escala global y compensado por Transformer)
    const doorWidthPx = (door.width * pixelsPerMeter) / effectiveScale;

    // Convertir ángulo a grados
    const localAngleDeg = (localAngle * 180) / Math.PI;

    // Calcular puntos del trazo blanco
    const halfWidth = doorWidthPx / 2;

    // Trazo blanco que "rompe" el muro
    const whiteLineStart = {
        x: localX - Math.cos(localAngle) * halfWidth,
        y: localY - Math.sin(localAngle) * halfWidth
    };
    const whiteLineEnd = {
        x: localX + Math.cos(localAngle) * halfWidth,
        y: localY + Math.sin(localAngle) * halfWidth
    };

    // Radio del arco de apertura
    const arcRadius = doorWidthPx;

    // 4. Configuración de los 4 estados de apertura (Sentido y Bisagra)
    // El arco comienza en el muro (corte) y se barre hacia la hoja
    const startAngle = door.doorSwing === 'right' ? localAngleDeg + 180 : localAngleDeg;

    // Sweep: En Konva, positivo es horario (CW). 
    // Si hinge es DER (180), Out (Arriba/270) es +90. In (Abajo/90) es -90.
    // Si hinge es IZQ (0), Out (Arriba/270 o -90) es -90. In (Abajo/90) es +90.
    let sweepAngle = 90;
    if (door.doorSwing === 'right') {
        sweepAngle = (door.openingDirection === 'out') ? 90 : -90;
    } else {
        sweepAngle = (door.openingDirection === 'out') ? -90 : 90;
    }

    // Posición QUIRÚRGICA de la bisagra
    const hingeX = door.doorSwing === 'right' ? whiteLineEnd.x : whiteLineStart.x;
    const hingeY = door.doorSwing === 'right' ? whiteLineEnd.y : whiteLineStart.y;

    // Ángulo de la hoja (al final del barrido del arco)
    const leafAngleDeg = startAngle + sweepAngle;

    return (
        <Group
            x={0}
            y={0}
            draggable={isSelectMode}
            onDragStart={(e) => {
                e.cancelBubble = true;
            }}
            onDragMove={(e) => {
                e.cancelBubble = true;
                if (!onUpdatePosition) return;

                const group = e.target;
                const roomGroup = group.getParent();
                if (!roomGroup) return;

                const relPos = roomGroup.getRelativePointerPosition();
                if (!relPos) return;

                const result = getRelativePositionOnWall(wall, relPos.x, relPos.y);

                // Validar usando el PPM global para que el clamping sea sincrónico
                const validPos = validateOpeningPosition(result.position, door.width, wallLengthPx, pixelsPerMeter);

                onUpdatePosition(validPos);

                // Forzar posición local a 0 para no acumular offsets de Konva
                group.position({ x: 0, y: 0 });
            }}
            onDragEnd={(e) => {
                e.cancelBubble = true;
                e.target.position({ x: 0, y: 0 });
            }}
            onClick={(e) => {
                e.cancelBubble = true;
                if (onSelect) onSelect(door.id);
            }}
            onDblClick={(e) => {
                e.cancelBubble = true;
                if (onEdit) onEdit(door);
            }}
            onTap={(e) => {
                e.cancelBubble = true;
                if (onSelect) onSelect(door.id);
            }}
        >
            {/* Hitbox táctil (Invisible por defecto) */}
            <Circle
                x={localX}
                y={localY}
                radius={30 / effectiveScale}
                fill="transparent"
                stroke="transparent"
                strokeWidth={2 / effectiveScale}
            />

            {/* Vano (Trazo blanco) */}
            <Line
                points={[whiteLineStart.x, whiteLineStart.y, whiteLineEnd.x, whiteLineEnd.y]}
                stroke="white"
                strokeWidth={6 / effectiveScale}
                lineCap="round"
                strokeScaleEnabled={false}
            />

            {/* Arco de Apertura (Pivote EXACTO en la bisagra) */}
            <Arc
                x={hingeX}
                y={hingeY}
                innerRadius={0}
                outerRadius={arcRadius}
                angle={90}
                rotation={sweepAngle < 0 ? startAngle + sweepAngle : startAngle}
                stroke={isSelected ? "#3b82f6" : "#666666"}
                strokeWidth={1.5 / effectiveScale}
                dash={[4, 4]}
                strokeScaleEnabled={false}
            />

            {/* Hoja de la puerta */}
            <Line
                points={[
                    hingeX,
                    hingeY,
                    hingeX + arcRadius * Math.cos((leafAngleDeg * Math.PI) / 180),
                    hingeY + arcRadius * Math.sin((leafAngleDeg * Math.PI) / 180)
                ]}
                stroke={isSelected ? "#3b82f6" : "#444444"}
                strokeWidth={2.5 / effectiveScale}
                strokeScaleEnabled={false}
            />

            {/* Punto de Bisagra */}
            <Circle
                x={hingeX}
                y={hingeY}
                radius={3 / effectiveScale}
                fill={isSelected ? "#3b82f6" : "#666666"}
            />
        </Group>
    );
};
