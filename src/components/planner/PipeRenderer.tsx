import React from 'react';
import { Path, Line } from 'react-konva';
import type { Pipe } from '../../types/planner';

interface PipeRendererProps {
    pipe: Pipe;
    selectedId: string | null;
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
    selectedId,
    strokeColor,
    opacity,
    dash
}) => {
    return pipe.type === 'curved' ? (
        <Path
            data={`M${pipe.points[0]},${pipe.points[1]} Q${(pipe.points[0] + pipe.points[2]) / 2},${(pipe.points[1] + pipe.points[3]) / 2 + 30} ${pipe.points[2]},${pipe.points[3]}`}
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
