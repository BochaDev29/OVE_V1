import React from 'react';
import { MousePointer2, Square, Circle, Minus, Type, Trash2, Undo, Spline, MoveUpRight } from 'lucide-react';
import { ShapeType } from '../symbolEditorTypes';
import styles from './SymbolEditorToolbar.module.css';

interface ToolbarProps {
    activeTool: ShapeType;
    setActiveTool: (tool: ShapeType) => void;
    onClear: () => void;
    onUndo: () => void;
    canUndo: boolean;
}

const SymbolEditorToolbar: React.FC<ToolbarProps> = ({
    activeTool,
    setActiveTool,
    onClear,
    onUndo,
    canUndo
}) => {
    const tools = [
        { id: 'select' as ShapeType, icon: MousePointer2, label: 'Seleccionar (V)', key: 'V' },
        { id: 'rect' as ShapeType, icon: Square, label: 'Rectángulo (R)', key: 'R' },
        { id: 'circle' as ShapeType, icon: Circle, label: 'Círculo (C)', key: 'C' },
        { id: 'line' as ShapeType, icon: Minus, label: 'Línea (L)', key: 'L' },
        { id: 'curve' as ShapeType, icon: Spline, label: 'Curva (A)', key: 'A' },
        { id: 'arrow' as ShapeType, icon: MoveUpRight, label: 'Flecha (F)', key: 'F' },
        { id: 'text' as ShapeType, icon: Type, label: 'Texto (T)', key: 'T' },
    ];

    return (
        <div className={styles.toolbar}>
            <div className={styles.toolbarHeader}>
                <h3 className={styles.toolbarTitle}>Herramientas</h3>
            </div>

            <div className={styles.toolList}>
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        className={`${styles.toolButton} ${activeTool === tool.id ? styles.toolButtonActive : ''}`}
                        title={tool.label}
                    >
                        <tool.icon size={20} />
                        <span className={styles.toolKey}>{tool.key}</span>
                    </button>
                ))}
            </div>

            <div className={styles.toolbarDivider} />

            <div className={styles.actionButtons}>
                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`${styles.actionButton} ${!canUndo ? styles.actionButtonDisabled : ''}`}
                    title="Deshacer (Ctrl+Z)"
                >
                    <Undo size={18} />
                    <span>Deshacer</span>
                </button>
                <button
                    onClick={onClear}
                    className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                    title="Limpiar todo"
                >
                    <Trash2 size={18} />
                    <span>Limpiar</span>
                </button>
            </div>
        </div>
    );
};

export default SymbolEditorToolbar;
