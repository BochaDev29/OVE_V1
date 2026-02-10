// Symbol Editor Types
export type ShapeType = 'rect' | 'circle' | 'line' | 'text' | 'select';

export interface BaseShape {
    id: string;
    type: ShapeType;
    stroke: string;
    strokeWidth: number;
    fill: string;
}

export interface RectShape extends BaseShape {
    type: 'rect';
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface CircleShape extends BaseShape {
    type: 'circle';
    cx: number;
    cy: number;
    r: number;
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

export type EditorShape = RectShape | CircleShape | LineShape | TextShape;

export interface Point {
    x: number;
    y: number;
}
