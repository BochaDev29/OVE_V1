import { EditorShape, Point, LineShape, RectShape, CircleShape, BezierCurveShape, ArrowShape } from '../../../components/admin/symbolEditorTypes';
import { v4 as uuidv4 } from 'uuid';

/**
 * Genera el código SVG completo a partir de las formas dibujadas
 */
export function generateFullSVG(
    shapes: EditorShape[],
    viewBoxSize: { width: number; height: number },
    origin?: { x: number; y: number }
): string {
    if (shapes.length === 0) return '';

    // Coordenadas de referencia (si no se pasan, calculamos bounding box)
    let minX = 0, minY = 0, maxX = 800, maxY = 600;

    if (!origin) {
        let actualMinX = 10000, actualMinY = 10000, actualMaxX = -10000, actualMaxY = -10000;
        let hasShapes = false;

        shapes.forEach(shape => {
            hasShapes = true;
            if (shape.type === 'rect') {
                actualMinX = Math.min(actualMinX, shape.x);
                actualMinY = Math.min(actualMinY, shape.y);
                actualMaxX = Math.max(actualMaxX, shape.x + (shape.width || 0));
                actualMaxY = Math.max(actualMaxY, shape.y + (shape.height || 0));
            } else if (shape.type === 'circle') {
                const el = shape as any;
                const rx = el.rx || el.r || 0;
                const ry = el.ry || el.r || 0;
                actualMinX = Math.min(actualMinX, el.cx - rx);
                actualMinY = Math.min(actualMinY, el.cy - ry);
                actualMaxX = Math.max(actualMaxX, el.cx + rx);
                actualMaxY = Math.max(actualMaxY, el.cy + ry);
            } else if (shape.type === 'line' || shape.type === 'arrow') {
                actualMinX = Math.min(actualMinX, shape.x1, shape.x2);
                actualMinY = Math.min(actualMinY, shape.y1, shape.y2);
                actualMaxX = Math.max(actualMaxX, shape.x1, shape.x2);
                actualMaxY = Math.max(actualMaxY, shape.y1, shape.y2);
            } else if (shape.type === 'curve') {
                actualMinX = Math.min(actualMinX, shape.x1, shape.qx, shape.x2);
                actualMinY = Math.min(actualMinY, shape.y1, shape.qy, shape.y2);
                actualMaxX = Math.max(actualMaxX, shape.x1, shape.qx, shape.x2);
                actualMaxY = Math.max(actualMaxY, shape.y1, shape.qy, shape.y2);
            } else if (shape.type === 'text') {
                actualMinX = Math.min(actualMinX, shape.x);
                actualMinY = Math.min(actualMinY, shape.y - shape.fontSize);
                actualMaxX = Math.max(actualMaxX, shape.x + shape.text.length * shape.fontSize * 0.6);
                actualMaxY = Math.max(actualMaxY, shape.y);
            }
        });

        if (hasShapes) {
            const padding = 20;
            minX = actualMinX - padding;
            minY = actualMinY - padding;
            maxX = actualMaxX + padding;
            maxY = actualMaxY + padding;
        }
    }

    const width = origin ? (viewBoxSize.width || 800) : (maxX - minX);
    const height = origin ? (viewBoxSize.height || 600) : (maxY - minY);
    const ox = origin?.x ?? minX;
    const oy = origin?.y ?? minY;

    // Generar elementos SVG
    const elements = shapes.map(shape => {
        const rot = shape.rotation ? ` transform="rotate(${shape.rotation} ${shape.type === 'rect' ? shape.x - ox + (shape.width || 0) / 2 : (shape as any).cx - ox} ${shape.type === 'rect' ? shape.y - oy + (shape.height || 0) / 2 : (shape as any).cy - oy})"` : '';

        if (shape.type === 'rect') {
            return `  <rect x="${shape.x - ox}" y="${shape.y - oy}" width="${shape.width || 0}" height="${shape.height || 0}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" fill="${shape.fill}"${rot} />`;
        } else if (shape.type === 'circle') {
            const el = shape as any;
            const rx = el.rx || el.r || 0;
            const ry = el.ry || el.r || 0;
            return `  <ellipse cx="${el.cx - ox}" cy="${el.cy - oy}" rx="${rx}" ry="${ry}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" fill="${shape.fill}"${rot} />`;
        } else if (shape.type === 'line') {
            return `  <line x1="${shape.x1 - ox}" y1="${shape.y1 - oy}" x2="${shape.x2 - ox}" y2="${shape.y2 - oy}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" />`;
        } else if (shape.type === 'arrow') {
            const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
            const size = 10;
            const ax1 = (shape.x2 - ox) - size * Math.cos(angle - Math.PI / 6);
            const ay1 = (shape.y2 - oy) - size * Math.sin(angle - Math.PI / 6);
            const ax2 = (shape.x2 - ox) - size * Math.cos(angle + Math.PI / 6);
            const ay2 = (shape.y2 - oy) - size * Math.sin(angle + Math.PI / 6);
            return `  <g>
    <line x1="${shape.x1 - ox}" y1="${shape.y1 - oy}" x2="${shape.x2 - ox}" y2="${shape.y2 - oy}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" />
    <path d="M ${ax1} ${ay1} L ${shape.x2 - ox} ${shape.y2 - oy} L ${ax2} ${ay2}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" fill="none" />
  </g>`;
        } else if (shape.type === 'curve') {
            return `  <path d="M ${shape.x1 - ox} ${shape.y1 - oy} Q ${shape.qx - ox} ${shape.qy - oy} ${shape.x2 - ox} ${shape.y2 - oy}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" fill="none" />`;
        } else if (shape.type === 'text') {
            return `  <text x="${shape.x - ox}" y="${shape.y - oy}" fill="${shape.stroke}" font-size="${shape.fontSize}" font-family="Arial">${shape.text}</text>`;
        }
        return '';
    }).join('\n');

    const vbW = Math.round(width);
    const vbH = Math.round(height);

    const lines = [
        `<svg width="${vbW}" height="${vbH}" viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg">`,
        elements,
        `</svg>`
    ];

    return lines.join('\n');
}

/**
 * Genera el path data de una forma individual
 */
function shapeToPathData(shape: EditorShape, ox: number, oy: number): string {
    /** Redondea a entero limpio para pathdata legible */
    const R = (v: number) => Math.round(v);

    if (shape.type === 'rect') {
        const w = R(shape.width || 0);
        const h = R(shape.height || 0);
        return `M ${R(shape.x - ox)} ${R(shape.y - oy)} h ${w} v ${h} h ${-w} z`;
    } else if (shape.type === 'circle') {
        const el = shape as any;
        const rx = R(el.rx || el.r || 0);
        const ry = R(el.ry || el.r || 0);
        const cx = R((el.cx || 0) - ox);
        const cy = R((el.cy || 0) - oy);
        if (rx === 0 || ry === 0) return '';
        return `M ${cx - rx},${cy} a ${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 -${rx * 2},0`;
    } else if (shape.type === 'line') {
        return `M ${R(shape.x1 - ox)} ${R(shape.y1 - oy)} L ${R(shape.x2 - ox)} ${R(shape.y2 - oy)}`;
    } else if (shape.type === 'arrow') {
        const x1 = R(shape.x1 - ox), y1 = R(shape.y1 - oy);
        const x2 = R(shape.x2 - ox), y2 = R(shape.y2 - oy);
        const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
        const size = 10;
        const ax1 = R(x2 - size * Math.cos(angle - Math.PI / 6));
        const ay1 = R(y2 - size * Math.sin(angle - Math.PI / 6));
        const ax2 = R(x2 - size * Math.cos(angle + Math.PI / 6));
        const ay2 = R(y2 - size * Math.sin(angle + Math.PI / 6));
        return `M ${x1} ${y1} L ${x2} ${y2} M ${ax1} ${ay1} L ${x2} ${y2} L ${ax2} ${ay2}`;
    } else if (shape.type === 'curve') {
        return `M ${R(shape.x1 - ox)} ${R(shape.y1 - oy)} Q ${R(shape.qx - ox)} ${R(shape.qy - oy)} ${R(shape.x2 - ox)} ${R(shape.y2 - oy)}`;
    }
    return '';
}

/** Etiqueta legible del tipo de forma */
const SHAPE_LABELS: Record<string, string> = {
    rect: 'Rectángulo',
    circle: 'Elipse',
    line: 'Línea',
    arrow: 'Flecha',
    curve: 'Curva',
    text: 'Texto',
};

/**
 * Genera path data detallado con comentarios por forma (para visualización)
 */
export function generatePathDataList(
    shapes: EditorShape[],
    origin?: { x: number; y: number }
): string {
    if (shapes.length === 0) return '';

    const ox = origin?.x || 0;
    const oy = origin?.y || 0;

    const lines: string[] = [];
    shapes.forEach((shape, i) => {
        const pathData = shapeToPathData(shape, ox, oy);
        if (!pathData) return;
        const label = SHAPE_LABELS[shape.type] || shape.type;
        lines.push(`/* ${i + 1}. ${label} */`);
        lines.push(pathData);
    });

    return lines.join('\n');
}

/**
 * Genera path data combinado en una sola línea (para copiar directo al código)
 */
export function generateCombinedPathData(
    shapes: EditorShape[],
    origin?: { x: number; y: number }
): string {
    if (shapes.length === 0) return '';

    const ox = origin?.x || 0;
    const oy = origin?.y || 0;

    return shapes
        .map(s => shapeToPathData(s, ox, oy))
        .filter(p => p !== '')
        .join(' ');
}

/**
 * Guarda las formas y el origen en localStorage
 */
export function saveToLocalStorage(shapes: EditorShape[], origin: { x: number; y: number }): void {
    try {
        const data = {
            shapes,
            origin
        };
        localStorage.setItem('ove_symbol_editor_data', JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

/**
 * Carga las formas y el origen desde localStorage
 */
export function loadFromLocalStorage(): { shapes: EditorShape[]; origin: { x: number; y: number } | null } {
    try {
        const saved = localStorage.getItem('ove_symbol_editor_data');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Migración para soporte antiguo (cuando solo se guardaban formas)
            if (Array.isArray(parsed)) {
                return { shapes: parsed, origin: null };
            }
            return {
                shapes: parsed.shapes || [],
                origin: parsed.origin || null
            };
        }

        // Intentar cargar desde la key antigua por retrocompatibilidad
        const legacy = localStorage.getItem('ove_symbol_editor_shapes');
        if (legacy) {
            return { shapes: JSON.parse(legacy), origin: null };
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
    return { shapes: [], origin: null };
}
/**
 * Parser de Path SVG a objetos EditorShape
 * Implementación robusta para comandos básicos (M, L, H, V, Q, Z, A)
 */
export function parsePathToShapes(pathData: string): EditorShape[] {
    const shapes: EditorShape[] = [];
    if (!pathData) return shapes;

    // Normalizar: Espacios entre comandos y números
    const normalized = pathData.replace(/([A-Za-z])|(-?\d*\.?\d+(?:[eE][-+]?\d+)?)/g, ' $1$2 ').trim();
    const tokens = normalized.split(/\s+|,/).filter(t => t.length > 0);

    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;
    let i = 0;

    const base = () => ({
        id: uuidv4(),
        stroke: '#000000',
        strokeWidth: 2,
        fill: 'none',
    });

    while (i < tokens.length) {
        const cmd = tokens[i++];
        const isRelative = cmd === cmd.toLowerCase();
        const type = cmd.toUpperCase();

        switch (type) {
            case 'M': {
                const x = parseFloat(tokens[i++]);
                const y = parseFloat(tokens[i++]);
                currentX = isRelative ? currentX + x : x;
                currentY = isRelative ? currentY + y : y;
                startX = currentX;
                startY = currentY;
                // MoveTo solo suele ser el inicio, no genera forma por sí mismo
                break;
            }
            case 'L': {
                const x = parseFloat(tokens[i++]);
                const y = parseFloat(tokens[i++]);
                const targetX = isRelative ? currentX + x : x;
                const targetY = isRelative ? currentY + y : y;
                shapes.push({
                    ...base(),
                    type: 'line',
                    x1: currentX, y1: currentY,
                    x2: targetX, y2: targetY
                } as LineShape);
                currentX = targetX;
                currentY = targetY;
                break;
            }
            case 'H': {
                const x = parseFloat(tokens[i++]);
                const targetX = isRelative ? currentX + x : x;
                shapes.push({
                    ...base(),
                    type: 'line',
                    x1: currentX, y1: currentY,
                    x2: targetX, y2: currentY
                } as LineShape);
                currentX = targetX;
                break;
            }
            case 'V': {
                const y = parseFloat(tokens[i++]);
                const targetY = isRelative ? currentY + y : y;
                shapes.push({
                    ...base(),
                    type: 'line',
                    x1: currentX, y1: currentY,
                    x2: currentX, y2: targetY
                } as LineShape);
                currentY = targetY;
                break;
            }
            case 'Q': {
                const qx = parseFloat(tokens[i++]);
                const qy = parseFloat(tokens[i++]);
                const x = parseFloat(tokens[i++]);
                const y = parseFloat(tokens[i++]);
                const targetQX = isRelative ? currentX + qx : qx;
                const targetQY = isRelative ? currentY + qy : qy;
                const targetX = isRelative ? currentX + x : x;
                const targetY = isRelative ? currentY + y : y;
                shapes.push({
                    ...base(),
                    type: 'curve',
                    x1: currentX, y1: currentY,
                    qx: targetQX, qy: targetQY,
                    x2: targetX, y2: targetY
                } as BezierCurveShape);
                currentX = targetX;
                currentY = targetY;
                break;
            }
            case 'A': {
                const rx = parseFloat(tokens[i++]);
                const ry = parseFloat(tokens[i++]);
                const xAxisRotation = parseFloat(tokens[i++]);
                const largeArcFlag = parseFloat(tokens[i++]);
                const sweepFlag = parseFloat(tokens[i++]);
                const x = parseFloat(tokens[i++]);
                const y = parseFloat(tokens[i++]);
                const targetX = isRelative ? currentX + x : x;
                const targetY = isRelative ? currentY + y : y;

                // Simplificación: Los símbolos eléctricos usan arcos para círculos.
                // Si movemos a (cx-rx, cy) y hacemos arco, detectamos el centro.
                const cx = (currentX + targetX) / 2;
                const cy = (currentY + targetY) / 2;

                shapes.push({
                    ...base(),
                    type: 'circle',
                    cx, cy,
                    rx, ry
                } as CircleShape);
                currentX = targetX;
                currentY = targetY;
                break;
            }
            case 'Z': {
                if (currentX !== startX || currentY !== startY) {
                    shapes.push({
                        ...base(),
                        type: 'line',
                        x1: currentX, y1: currentY,
                        x2: startX, y2: startY
                    } as LineShape);
                }
                currentX = startX;
                currentY = startY;
                break;
            }
        }
    }

    return shapes;
}
