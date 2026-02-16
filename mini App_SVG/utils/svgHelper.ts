
import { Shape } from '../types';

export const shapeToPathData = (shape: Shape, origin?: { x: number; y: number }): string => {
  const ox = origin?.x || 0;
  const oy = origin?.y || 0;

  switch (shape.type) {
    case 'rect':
      return `M ${shape.x - ox} ${shape.y - oy} h ${shape.width || 0} v ${shape.height || 0} h ${-(shape.width || 0)} z`;
    case 'circle': {
      const el = shape as any;
      const rx = el.rx || el.r || 0;
      const ry = el.ry || el.r || 0;
      const cx = el.cx || 0;
      const cy = el.cy || 0;
      if (rx === 0 || ry === 0) return '';
      // Representación de elipse compacta
      return `M ${cx - ox - rx},${cy - oy} a ${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 -${rx * 2},0`;
    }
    case 'line':
      return `M ${shape.x1 - ox} ${shape.y1 - oy} L ${shape.x2 - ox} ${shape.y2 - oy}`;
    case 'arrow': {
      const x1 = Math.round(shape.x1 - ox), y1 = Math.round(shape.y1 - oy);
      const x2 = Math.round(shape.x2 - ox), y2 = Math.round(shape.y2 - oy);
      const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
      const size = 10;
      const ax1 = Math.round(x2 - size * Math.cos(angle - Math.PI / 6));
      const ay1 = Math.round(y2 - size * Math.sin(angle - Math.PI / 6));
      const ax2 = Math.round(x2 - size * Math.cos(angle + Math.PI / 6));
      const ay2 = Math.round(y2 - size * Math.sin(angle + Math.PI / 6));
      return `M ${x1} ${y1} L ${x2} ${y2} M ${ax1} ${ay1} L ${x2} ${y2} L ${ax2} ${ay2}`;
    }
    case 'curve':
      return `M ${shape.x1 - ox} ${shape.y1 - oy} Q ${shape.qx - ox} ${shape.qy - oy} ${shape.x2 - ox} ${shape.y2 - oy}`;
    default:
      return '';
  }
};

export const generateFullSVG = (
  shapes: Shape[],
  viewBoxSize: { width: number; height: number },
  origin?: { x: number; y: number }
): string => {
  const width = viewBoxSize.width || 800;
  const height = viewBoxSize.height || 600;
  const ox = origin?.x || 0;
  const oy = origin?.y || 0;

  const elements = shapes.map((shape) => {
    const rot = shape.rotation ? ` transform="rotate(${shape.rotation} ${shape.type === 'rect' ? shape.x - ox + (shape.width || 0) / 2 : (shape as any).cx - ox} ${shape.type === 'rect' ? shape.y - oy + (shape.height || 0) / 2 : (shape as any).cy - oy})"` : '';

    switch (shape.type) {
      case 'rect':
        return `  <rect x="${shape.x - ox}" y="${shape.y - oy}" width="${shape.width || 0}" height="${shape.height || 0}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" fill="${shape.fill}"${rot} />`;
      case 'circle': {
        const el = shape as any;
        const rx = el.rx || el.r || 0;
        const ry = el.ry || el.r || 0;
        return `  <ellipse cx="${el.cx - ox}" cy="${el.cy - oy}" rx="${rx}" ry="${ry}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" fill="${shape.fill}"${rot} />`;
      }
      case 'line':
        return `  <line x1="${shape.x1 - ox}" y1="${shape.y1 - oy}" x2="${shape.x2 - ox}" y2="${shape.y2 - oy}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" />`;
      case 'arrow': {
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
      }
      case 'curve':
        return `  <path d="M ${shape.x1 - ox} ${shape.y1 - oy} Q ${shape.qx - ox} ${shape.qy - oy} ${shape.x2 - ox} ${shape.y2 - oy}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" fill="none" />`;
      case 'text':
        return `  <text x="${shape.x - ox}" y="${shape.y - oy}" font-family="Arial" font-size="${shape.fontSize}" fill="${shape.stroke}">${shape.text}</text>`;
      default:
        return '';
    }
  }).join('\n');

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n${elements}\n</svg>`;
};

const SHAPE_LABELS: Record<string, string> = {
  rect: 'Rectángulo',
  circle: 'Elipse',
  line: 'Línea',
  arrow: 'Flecha',
  curve: 'Curva',
  text: 'Texto',
};

export const generatePathDataList = (shapes: Shape[], origin?: { x: number; y: number }): string => {
  if (shapes.length === 0) return '';
  const lines: string[] = [];
  shapes.forEach((s, i) => {
    const p = shapeToPathData(s, origin);
    if (!p) return;
    const label = SHAPE_LABELS[s.type] || s.type;
    lines.push(`/* ${i + 1}. ${label} */`);
    lines.push(p);
  });
  return lines.join('\n');
};

export const generateCombinedPathData = (shapes: Shape[], origin?: { x: number; y: number }): string => {
  return shapes
    .map(s => shapeToPathData(s, origin))
    .filter(p => p !== '')
    .join(' ');
};

export const saveToLocalStorage = (shapes: Shape[], origin: { x: number; y: number }): void => {
  try {
    const data = { shapes, origin };
    localStorage.setItem('ove_mini_app_svg_data', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const loadFromLocalStorage = (): { shapes: Shape[]; origin: { x: number; y: number } | null } => {
  try {
    const saved = localStorage.getItem('ove_mini_app_svg_data');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }
  return { shapes: [], origin: null };
};
