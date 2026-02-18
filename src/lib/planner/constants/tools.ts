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
    { id: 'aux_line', icon: Minus, label: 'Auxiliar' },
    // Alimentación
    { id: 'meter', icon: Box, label: 'Medidor' },
    // Líneas y Circuitos
    { id: 'lp_220', icon: Zap, label: 'LP 220V' },
    { id: 'lp_380', icon: Zap, label: 'LP 380V' },
    { id: 'cs_220', icon: Zap, label: 'CS 220V' },
    { id: 'cs_380', icon: Zap, label: 'CS 380V' },
    { id: 'ct_220', icon: Zap, label: 'CT 220V' },
    { id: 'ct_380', icon: Zap, label: 'CT 380V' },
    // Borneras
    { id: 'dist_block_2', icon: Table, label: '2 Bornes' },
    { id: 'dist_block_3', icon: Table, label: '3 Bornes' },
    { id: 'dist_block_4', icon: Table, label: '4 Bornes' },
    { id: 'dist_block_5', icon: Table, label: '5 Bornes' },
    { id: 'dist_block_6', icon: Table, label: '6 Bornes' },
    { id: 'dist_block_7', icon: Table, label: '7 Bornes' },
    { id: 'dist_block_8', icon: Table, label: '8 Bornes' },
    { id: 'dist_block_9', icon: Table, label: '9 Bornes' },
    { id: 'dist_block_10', icon: Table, label: '10 Bornes' },
    // Protecciones
    { id: 'pia_1p', icon: ToggleRight, label: 'PIA 1P' },
    { id: 'pia_3p', icon: ToggleRight, label: 'PIA 3P' },
    { id: 'diff_switch', icon: StopCircle, label: 'ID Mono' },
    { id: 'id_3p', icon: StopCircle, label: 'ID Trif.' },
    // Motores y arranque
    { id: 'gm_thermo', icon: Cpu, label: 'GM Therm' },
    { id: 'gm_mag', icon: Cpu, label: 'GM Mag' },
    { id: 'contactor', icon: ToggleLeft, label: 'Contactor' },
    { id: 'thermal_relay', icon: Cpu, label: 'R.Térmico' },
    // Otros
    { id: 'ground', icon: ArrowDownToLine, label: 'PAT' },
    // Geometrías para tableros y anotaciones
    { id: 'rect', icon: Square, label: 'Rectáng.' },
    { id: 'circle', icon: Circle, label: 'Círculo' },
    { id: 'line', icon: Minus, label: 'Línea' },
    { id: 'arrow', icon: ArrowUpRight, label: 'Flecha' },
    { id: 'text', icon: FileText, label: 'Texto' },
    { id: 'table', icon: Table, label: 'Tabla' },
];

export const GEOM_TOOLS: ToolDef[] = [
    { id: 'rect', icon: Square, label: 'Rectáng.' },
    { id: 'circle', icon: Circle, label: 'Círculo' },
    { id: 'triangle', icon: Triangle, label: 'Triáng.' },
    { id: 'line', icon: Minus, label: 'Línea' },
    { id: 'arrow', icon: ArrowUpRight, label: 'Flecha' },
];
