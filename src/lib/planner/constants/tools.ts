import {
    Square, Zap, Lightbulb, ToggleLeft, Box, Fan, Snowflake,
    FileText, Table, Minus, PenTool, LayoutTemplate,
    ArrowDownToLine, StopCircle, LampWallUp, Bell, DoorOpen, ScanLine, Ruler,
    Cpu, Radar, Sun, MoveUp, GitMerge, ToggleRight, Triangle, ArrowUpRight, Circle
} from 'lucide-react';
import { Tool } from '../components/planner/PlannerToolbar';

export interface ToolDef {
    id: Tool;
    icon: any;
    label: string;
}

export const ARCHI_TOOLS: ToolDef[] = [
    { id: 'wall', icon: Square, label: 'Pared' },
    { id: 'door', icon: DoorOpen, label: 'Puerta' },
    { id: 'window', icon: ScanLine, label: 'Ventana' },
    { id: 'passage', icon: Square, label: 'Vano' },
    { id: 'dimension', icon: Ruler, label: 'Cota' },
    { id: 'aux_line', icon: Minus, label: 'Auxiliar' },
    { id: 'text', icon: FileText, label: 'Texto' },
];

export const ELEC_TOOLS: ToolDef[] = [
    { id: 'pipe', icon: PenTool, label: 'Cañería' },
    { id: 'light', icon: Lightbulb, label: 'Boca' },
    { id: 'wall_light', icon: LampWallUp, label: 'Aplique' },
    { id: 'outlet', icon: Zap, label: 'Toma' },
    { id: 'double_outlet', icon: Zap, label: 'T. Doble' },
    { id: 'switch', icon: ToggleLeft, label: 'Llave' },
    { id: 'switch_2e', icon: Zap, label: 'Llave 2E' },
    { id: 'switch_3e', icon: Zap, label: 'Llave 3E' },
    { id: 'switch_3way', icon: GitMerge, label: 'Combin.' },
    { id: 'board', icon: Box, label: 'Tablero' },
    { id: 'cp', icon: StopCircle, label: 'CP/D' },
    { id: 'ac', icon: Snowflake, label: 'Aire' },
    { id: 'fan', icon: Fan, label: 'Vent.' },
    { id: 'motor_1p', icon: Cpu, label: 'Mot. 1~' },
    { id: 'motor_3p', icon: Cpu, label: 'Mot. 3~' },
    { id: 'motion_sensor', icon: Radar, label: 'Sensor' },
    { id: 'photo_cell', icon: Sun, label: 'Fotoc.' },
    { id: 'riser', icon: MoveUp, label: 'Montante' },
    { id: 'meter', icon: Box, label: 'Medidor' },
    { id: 'bell_button', icon: Bell, label: 'Timbre' },
    { id: 'tpu', icon: LayoutTemplate, label: 'TPU' },
    { id: 'ground', icon: ArrowDownToLine, label: 'PAT' },
];

export const UNIFILAR_TOOLS: ToolDef[] = [
    { id: 'pipe', icon: PenTool, label: 'Conexión' },
    { id: 'feed_point', icon: ArrowDownToLine, label: 'Red' },
    { id: 'meter', icon: Box, label: 'Medidor' },
    { id: 'main_breaker', icon: ToggleLeft, label: 'Disy.Gral' },
    { id: 'tm_2p', icon: Square, label: 'TM 2P' },
    { id: 'diff_switch', icon: StopCircle, label: 'Dif/ID' },
    { id: 'tm_1p', icon: Square, label: 'TM 1P' },
    { id: 'tm_4p', icon: LayoutTemplate, label: 'TM 4P' },
    { id: 'dist_block', icon: Table, label: 'Bornes' },
    { id: 'load_arrow', icon: ArrowDownToLine, label: 'Salida' },
    { id: 'ground', icon: ArrowDownToLine, label: 'PAT' },
];

export const GEOM_TOOLS: ToolDef[] = [
    { id: 'rect', icon: Square, label: 'Rectáng.' },
    { id: 'circle', icon: Circle, label: 'Círculo' },
    { id: 'triangle', icon: Triangle, label: 'Triáng.' },
    { id: 'line', icon: Minus, label: 'Línea' },
    { id: 'arrow', icon: ArrowUpRight, label: 'Flecha' },
];
