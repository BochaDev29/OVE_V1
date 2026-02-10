
import { Shape } from '../types';

export const shapeToPathData = (shape: Shape): string => {
  switch (shape.type) {
    case 'rect':
      return `M ${shape.x} ${shape.y} h ${shape.width} v ${shape.height} h ${-shape.width} z`;
    case 'circle':
      const { cx, cy, r } = shape;
      return `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`;
    case 'line':
      return `M ${shape.x1} ${shape.y1} L ${shape.x2} ${shape.y2}`;
    case 'text':
      return ''; // Text doesn't translate to a simple path easily
    default:
      return '';
  }
};

export const generateFullSVG = (shapes: Shape[], viewBoxSize: { width: number; height: number }): string => {
  const elements = shapes.map((shape) => {
    switch (shape.type) {
      case 'rect':
        return `  <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" fill="${shape.fill}" />`;
      case 'circle':
        return `  <circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" fill="${shape.fill}" />`;
      case 'line':
        return `  <line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" />`;
      case 'text':
        return `  <text x="${shape.x}" y="${shape.y}" font-family="Arial" font-size="${shape.fontSize}" fill="${shape.stroke}">${shape.text}</text>`;
      default:
        return '';
    }
  }).join('\n');

  return `<svg width="${viewBoxSize.width}" height="${viewBoxSize.height}" viewBox="0 0 ${viewBoxSize.width} ${viewBoxSize.height}" xmlns="http://www.w3.org/2000/svg">\n${elements}\n</svg>`;
};

export const generatePathDataList = (shapes: Shape[]): string => {
  return shapes
    .map(s => shapeToPathData(s))
    .filter(p => p !== '')
    .join('\n');
};
