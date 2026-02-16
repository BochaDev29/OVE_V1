// Symbol Editor Types
export type ShapeType = 'rect' | 'circle' | 'line' | 'text' | 'curve' | 'arrow' | 'select';

export interface BaseShape {
    id: string;
    type: ShapeType;
    stroke: string;
    strokeWidth: number;
    fill: string;
    rotation?: number;
}

export interface RectShape extends BaseShape {
    type: 'rect';
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface EllipseShape extends BaseShape {
    type: 'circle';
    cx: number;
    cy: number;
    rx: number;
    ry: number;
}

export interface LineShape extends BaseShape {
    type: 'line';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface TextShape extends BaseShape {
    type: 'text';
    x: number;
    y: number;
    text: string;
    fontSize: number;
}

export interface BezierCurveShape extends BaseShape {
    type: 'curve';
    x1: number;
    y1: number;
    qx: number;
    qy: number;
    x2: number;
    y2: number;
}

export interface ArrowShape extends BaseShape {
    type: 'arrow';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export type EditorShape = RectShape | EllipseShape | LineShape | TextShape | BezierCurveShape | ArrowShape;

export interface Point {
    x: number;
    y: number;
}
