// Utilidades geométricas para aberturas (puertas y ventanas)

import type { Wall } from '../../../types/planner';
import type { Opening } from '../../../types/openings';

/**
 * Calcula la posición de una abertura en el canvas (tanto absoluta como local)
 */
export function getOpeningPosition(
    wall: Wall,
    position: number, // 0-1 normalizado
    roomGroupX: number,
    roomGroupY: number,
    roomGroupRotation: number,
    roomGroupScaleX: number,
    roomGroupScaleY: number
): { x: number; y: number; angle: number; localX: number; localY: number; localAngle: number } {
    // 1. CÁLCULO LOCAL (Relativo al origen del Group, sin escalas ni rotación del grupo)
    const lx1 = wall.points[0];
    const ly1 = wall.points[1];
    const lx2 = wall.points[2];
    const ly2 = wall.points[3];

    const localX = lx1 + (lx2 - lx1) * position;
    const localY = ly1 + (ly2 - ly1) * position;
    const localAngle = Math.atan2(ly2 - ly1, lx2 - lx1);

    // 2. CÁLCULO ABSOLUTO (Para compatibilidad o usos fuera del Group)
    const x1 = lx1 * roomGroupScaleX;
    const y1 = ly1 * roomGroupScaleY;
    const x2 = lx2 * roomGroupScaleX;
    const y2 = ly2 * roomGroupScaleY;

    const localX_scaled = x1 + (x2 - x1) * position;
    const localY_scaled = y1 + (y2 - y1) * position;
    const wallAngle_scaled = Math.atan2(y2 - y1, x2 - x1);

    const rotRad = (roomGroupRotation * Math.PI) / 180;
    const rotatedX = localX_scaled * Math.cos(rotRad) - localY_scaled * Math.sin(rotRad);
    const rotatedY = localX_scaled * Math.sin(rotRad) + localY_scaled * Math.cos(rotRad);

    return {
        x: roomGroupX + rotatedX,
        y: roomGroupY + rotatedY,
        angle: wallAngle_scaled + rotRad,
        localX,
        localY,
        localAngle
    };
}

/**
 * Calcula la distancia de un punto a un segmento de línea (muro)
 */
export function distanceToWall(
    wall: Wall,
    mouseX: number,
    mouseY: number,
    roomGroupX: number,
    roomGroupY: number,
    roomGroupRotation: number,
    roomGroupScaleX: number,
    roomGroupScaleY: number
): { distance: number; position: number } {
    // Puntos del muro escalados
    const x1 = wall.points[0] * roomGroupScaleX;
    const y1 = wall.points[1] * roomGroupScaleY;
    const x2 = wall.points[2] * roomGroupScaleX;
    const y2 = wall.points[3] * roomGroupScaleY;

    // Rotar puntos según rotación del grupo
    const rotRad = (roomGroupRotation * Math.PI) / 180;

    const rx1 = x1 * Math.cos(rotRad) - y1 * Math.sin(rotRad) + roomGroupX;
    const ry1 = x1 * Math.sin(rotRad) + y1 * Math.cos(rotRad) + roomGroupY;
    const rx2 = x2 * Math.cos(rotRad) - y2 * Math.sin(rotRad) + roomGroupX;
    const ry2 = x2 * Math.sin(rotRad) + y2 * Math.cos(rotRad) + roomGroupY;

    // Vector del muro
    const dx = rx2 - rx1;
    const dy = ry2 - ry1;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
        // Muro de longitud cero
        const dist = Math.sqrt((mouseX - rx1) ** 2 + (mouseY - ry1) ** 2);
        return { distance: dist, position: 0 };
    }

    // Proyección del punto sobre la línea
    let t = ((mouseX - rx1) * dx + (mouseY - ry1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t)); // Clamp entre 0 y 1

    // Punto más cercano en el muro
    const closestX = rx1 + t * dx;
    const closestY = ry1 + t * dy;

    // Distancia al punto más cercano
    const distance = Math.sqrt((mouseX - closestX) ** 2 + (mouseY - closestY) ** 2);

    return { distance, position: t };
}

/**
 * CALCULA LA PROYECCIÓN LOCAL de un punto sobre un muro.
 * Útil para arrastre suave dentro de un RoomGroup sin importar zoom/rotación.
 */
export function getRelativePositionOnWall(
    wall: Wall,
    localX: number,
    localY: number
): { distance: number; position: number } {
    const x1 = wall.points[0];
    const y1 = wall.points[1];
    const x2 = wall.points[2];
    const y2 = wall.points[3];

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
        return { distance: 0, position: 0 };
    }

    // Proyección del punto sobre la línea (Local)
    let t = ((localX - x1) * dx + (localY - y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t)); // Clamp entre 0 y 1

    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    const distance = Math.sqrt((localX - closestX) ** 2 + (localY - closestY) ** 2);

    return { distance, position: t };
}

/**
 * Encuentra el muro más cercano al cursor en un RoomGroup
 */
export function findNearestWall(
    walls: Wall[],
    mouseX: number,
    mouseY: number,
    roomGroupX: number,
    roomGroupY: number,
    roomGroupRotation: number,
    roomGroupScaleX: number,
    roomGroupScaleY: number,
    maxDistance: number = 20 // píxeles
): { wallIndex: number; position: number } | null {
    let minDistance = Infinity;
    let bestWallIndex = -1;
    let bestPosition = 0;

    walls.forEach((wall, index) => {
        const { distance, position } = distanceToWall(
            wall,
            mouseX,
            mouseY,
            roomGroupX,
            roomGroupY,
            roomGroupRotation,
            roomGroupScaleX,
            roomGroupScaleY
        );

        if (distance < minDistance && distance <= maxDistance) {
            minDistance = distance;
            bestWallIndex = index;
            bestPosition = position;
        }
    });

    if (bestWallIndex === -1) {
        return null;
    }

    return {
        wallIndex: bestWallIndex,
        position: bestPosition
    };
}

/**
 * Valida que una posición en el muro sea válida.
 * Permite deslizamiento libre restando solo el medio ancho de la abertura.
 */
export function validateOpeningPosition(
    position: number,
    openingWidth: number,
    wallLength: number,
    pixelsPerMeter: number,
    minMargin: number = 0.0 // Deslizamiento libre total
): number {
    // Convertir ancho de abertura a proporción del muro
    const openingWidthPx = openingWidth * pixelsPerMeter;
    const openingProportion = openingWidthPx / wallLength;

    // Margen mínimo en cada extremo (0% por defecto ahora)
    const minPos = minMargin;
    const maxPos = 1 - minMargin;

    // Clamp posición inicial
    let validPosition = Math.max(minPos, Math.min(maxPos, position));

    // ASEGURAR que la abertura no se salga físicamente del muro (rail)
    const halfOpening = openingProportion / 2;
    if (validPosition - halfOpening < 0) {
        validPosition = halfOpening;
    }
    if (validPosition + halfOpening > 1) {
        validPosition = 1 - halfOpening;
    }

    return validPosition;
}

/**
 * Verifica si dos aberturas se superponen en el mismo muro
 */
export function checkOpeningOverlap(
    opening1: Opening,
    opening2: Opening,
    wallLength: number,
    pixelsPerMeter: number
): boolean {
    if (opening1.wallIndex !== opening2.wallIndex) {
        return false; // Diferentes muros, no se superponen
    }

    // Convertir anchos a proporción del muro
    const width1Px = opening1.width * pixelsPerMeter;
    const width2Px = opening2.width * pixelsPerMeter;
    const prop1 = width1Px / wallLength;
    const prop2 = width2Px / wallLength;

    // Calcular rangos
    const start1 = opening1.position - prop1 / 2;
    const end1 = opening1.position + prop1 / 2;
    const start2 = opening2.position - prop2 / 2;
    const end2 = opening2.position + prop2 / 2;

    // Verificar superposición
    return !(end1 < start2 || end2 < start1);
}
