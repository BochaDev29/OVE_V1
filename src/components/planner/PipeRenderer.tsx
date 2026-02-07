import React from 'react';
import { Path, Line } from 'react-konva';
import type { Pipe } from '../../types/planner';

interface PipeRendererProps {
    pipe: Pipe;
    strokeColor: string;
    opacity: number;
    dash?: number[];
}

/**
 * Componente modular para renderizar cañerías
 * Soporta curvas y rectas con strokeDash configurable
 */
export const PipeRenderer: React.FC<PipeRendererProps> = ({
    pipe,
    strokeColor,
    opacity,
    dash
}) => {
    const cp = pipe.controlPoint || {
        x: (pipe.points[0] + pipe.points[2]) / 2,
        y: (pipe.points[1] + pipe.points[3]) / 2 + 30
    };

    return pipe.type === 'curved' ? (
        <Path
            data={`M${pipe.points[0]},${pipe.points[1]} Q${cp.x},${cp.y} ${pipe.points[2]},${pipe.points[3]}`}
            stroke={strokeColor}
            strokeWidth={2}
            dash={dash}
            lineCap="round"
            opacity={opacity}
        />
    ) : (
        <Line
            points={pipe.points}
            stroke={strokeColor}
            strokeWidth={2}
            dash={dash}
            lineCap="round"
            opacity={opacity}
        />
    );
};
