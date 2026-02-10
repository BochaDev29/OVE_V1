import { EditorShape } from '../../../components/admin/symbolEditorTypes';

/**
 * Genera el código SVG completo a partir de las formas dibujadas
 */
export function generateFullSVG(
    shapes: EditorShape[],
    _canvasSize: { width: number; height: number },
    origin?: { x: number; y: number }
): string {
    if (shapes.length === 0) return '';

    // Calcular bounding box de todas las formas
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    shapes.forEach(shape => {
        if (shape.type === 'rect') {
            minX = Math.min(minX, shape.x);
            minY = Math.min(minY, shape.y);
            maxX = Math.max(maxX, shape.x + shape.width);
            maxY = Math.max(maxY, shape.y + shape.height);
        } else if (shape.type === 'circle') {
            minX = Math.min(minX, shape.cx - shape.r);
            minY = Math.min(minY, shape.cy - shape.r);
            maxX = Math.max(maxX, shape.cx + shape.r);
            maxY = Math.max(maxY, shape.cy + shape.r);
        } else if (shape.type === 'line') {
            minX = Math.min(minX, shape.x1, shape.x2);
            minY = Math.min(minY, shape.y1, shape.y2);
            maxX = Math.max(maxX, shape.x1, shape.x2);
            maxY = Math.max(maxY, shape.y1, shape.y2);
        } else if (shape.type === 'text') {
            minX = Math.min(minX, shape.x);
            minY = Math.min(minY, shape.y - shape.fontSize);
            maxX = Math.max(maxX, shape.x + shape.text.length * shape.fontSize * 0.6);
            maxY = Math.max(maxY, shape.y);
        }
    });

    // Agregar padding
    const padding = 10;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    // Generar elementos SVG
    const elements = shapes.map(shape => {
        const ox = origin ? origin.x : minX;
        const oy = origin ? origin.y : minY;

        if (shape.type === 'rect') {
            return `  <rect x="${shape.x - ox}" y="${shape.y - oy}" width="${shape.width}" height="${shape.height}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" fill="${shape.fill}" />`;
        } else if (shape.type === 'circle') {
            return `  <circle cx="${shape.cx - ox}" cy="${shape.cy - oy}" r="${shape.r}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" fill="${shape.fill}" />`;
        } else if (shape.type === 'line') {
            return `  <line x1="${shape.x1 - ox}" y1="${shape.y1 - oy}" x2="${shape.x2 - ox}" y2="${shape.y2 - oy}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" />`;
        } else if (shape.type === 'text') {
            return `  <text x="${shape.x - ox}" y="${shape.y - oy}" fill="${shape.stroke}" font-size="${shape.fontSize}" font-family="Arial">${shape.text}</text>`;
        }
        return '';
    }).join('\n');

    return `<svg width="${Math.round(width)}" height="${Math.round(height)}" viewBox="0 0 ${Math.round(width)} ${Math.round(height)}" xmlns="http://www.w3.org/2000/svg">
${elements}
</svg>`;
}

/**
 * Genera lista de path data para cada forma
 */
export function generatePathDataList(
    shapes: EditorShape[],
    origin?: { x: number; y: number }
): string {
    if (shapes.length === 0) return '';

    return shapes.map((shape, index) => {
        let pathData = '';
        const ox = origin ? origin.x : 0;
        const oy = origin ? origin.y : 0;

        if (shape.type === 'rect') {
            pathData = `M ${shape.x - ox} ${shape.y - oy} L ${shape.x + shape.width - ox} ${shape.y - oy} L ${shape.x + shape.width - ox} ${shape.y + shape.height - oy} L ${shape.x - ox} ${shape.y + shape.height - oy} Z`;
        } else if (shape.type === 'circle') {
            const r = shape.r;
            const cx = shape.cx - ox;
            const cy = shape.cy - oy;
            pathData = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
        } else if (shape.type === 'line') {
            pathData = `M ${shape.x1 - ox} ${shape.y1 - oy} L ${shape.x2 - ox} ${shape.y2 - oy}`;
        }
        return `// Shape ${index + 1} (${shape.type})\n${pathData}`;
    }).join('\n\n');
}

/**
 * Guarda las formas en localStorage
 */
export function saveToLocalStorage(shapes: EditorShape[]): void {
    try {
        localStorage.setItem('ove_symbol_editor_shapes', JSON.stringify(shapes));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

/**
 * Carga las formas desde localStorage
 */
export function loadFromLocalStorage(): EditorShape[] {
    try {
        const saved = localStorage.getItem('ove_symbol_editor_shapes');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
    return [];
}
