import { Group, Line, Circle } from 'react-konva';
import type { Opening } from '../../types/openings';
import type { Wall } from '../../types/planner';
import { getOpeningPosition, getRelativePositionOnWall, validateOpeningPosition } from '../../lib/planner/utils/openingGeometry';

interface PassageComponentProps {
    passage: Opening;
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
    onEdit?: (opening: Opening) => void;
}

export const PassageComponent = ({
    passage,
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
}: PassageComponentProps) => {
    // 1. Longitud local del muro
    const lx1 = wall.points[0];
    const ly1 = wall.points[1];
    const lx2 = wall.points[2];
    const ly2 = wall.points[3];
    const wallLengthPx = Math.sqrt((lx2 - lx1) ** 2 + (ly2 - ly1) ** 2);

    // 2. Calcular posición del paso (usaremos las locales ya que estamos dentro de un Group)
    const { localX, localY, localAngle } = getOpeningPosition(
        wall,
        passage.position,
        roomGroupX,
        roomGroupY,
        roomGroupRotation,
        roomGroupScaleX,
        roomGroupScaleY
    );

    // 3. Escala para hitboxes y compensación
    const parentScaleX = Math.abs(roomGroupScaleX) || 1;
    const parentScaleY = Math.abs(roomGroupScaleY) || 1;
    const isVertical = Math.abs(Math.sin(localAngle)) > 0.5;
    const effectiveScale = isVertical ? parentScaleY : parentScaleX;

    // 4. Determinar ancho en píxeles (Sincronizado con escala global y compensado por Transformer)
    const passageWidthPx = (passage.width * pixelsPerMeter) / effectiveScale;
    const halfWidth = passageWidthPx / 2;

    // Puntos del trazo blanco
    const whiteLineStart = {
        x: localX - Math.cos(localAngle) * halfWidth,
        y: localY - Math.sin(localAngle) * halfWidth
    };
    const whiteLineEnd = {
        x: localX + Math.cos(localAngle) * halfWidth,
        y: localY + Math.sin(localAngle) * halfWidth
    };

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

                const validPos = validateOpeningPosition(result.position, passage.width, wallLengthPx, pixelsPerMeter);

                onUpdatePosition(validPos);
                group.position({ x: 0, y: 0 });
            }}
            onDragEnd={(e) => {
                e.cancelBubble = true;
                e.target.position({ x: 0, y: 0 });
            }}
            onClick={(e) => {
                e.cancelBubble = true;
                if (onSelect) onSelect(passage.id);
            }}
            onDblClick={(e) => {
                e.cancelBubble = true;
                if (onEdit) onEdit(passage);
            }}
            onTap={(e) => {
                e.cancelBubble = true;
                if (onSelect) onSelect(passage.id);
            }}
        >
            {/* Hitbox táctil (Invisible por defecto) */}
            <Circle
                x={localX}
                y={localY}
                radius={25 / effectiveScale}
                fill="transparent"
                stroke="transparent"
                strokeWidth={2 / effectiveScale}
            />

            {/* Trazo blanco que rompe el muro (Corte limpio) */}
            <Line
                points={[whiteLineStart.x, whiteLineStart.y, whiteLineEnd.x, whiteLineEnd.y]}
                stroke="white"
                strokeWidth={(isSelected ? 10 : 7) / effectiveScale}
                lineCap="square"
                strokeScaleEnabled={false}
            />

            {/* Marcador de selección (Dashed blue) */}
            {isSelected && (
                <Line
                    points={[whiteLineStart.x, whiteLineStart.y, whiteLineEnd.x, whiteLineEnd.y]}
                    stroke="#3b82f6"
                    strokeWidth={2 / effectiveScale}
                    dash={[4, 4]}
                    lineCap="square"
                    strokeScaleEnabled={false}
                />
            )}
        </Group>
    );
};

