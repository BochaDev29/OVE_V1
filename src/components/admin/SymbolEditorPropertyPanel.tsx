import React from 'react';
import { EditorShape } from './symbolEditorTypes';
import styles from './SymbolEditorPropertyPanel.module.css';

interface PropertyPanelProps {
    selectedShape: EditorShape | null;
    onUpdateShape: (updates: Partial<EditorShape>) => void;
}

const SymbolEditorPropertyPanel: React.FC<PropertyPanelProps> = ({ selectedShape, onUpdateShape }) => {
    if (!selectedShape) {
        return (
            <div className={styles.panel}>
                <h3 className={styles.title}>Propiedades</h3>
                <p className={styles.emptyMessage}>Selecciona una forma para editar sus propiedades</p>
            </div>
        );
    }

    return (
        <div className={styles.panel}>
            <h3 className={styles.title}>Propiedades</h3>

            <div className={styles.section}>
                <label className={styles.label}>Color de Trazo</label>
                <input
                    type="color"
                    value={selectedShape.stroke}
                    onChange={(e) => onUpdateShape({ stroke: e.target.value })}
                    className={styles.colorInput}
                />
            </div>

            <div className={styles.section}>
                <label className={styles.label}>Grosor de Trazo</label>
                <input
                    type="number"
                    min="1"
                    max="20"
                    value={selectedShape.strokeWidth}
                    onChange={(e) => onUpdateShape({ strokeWidth: parseInt(e.target.value) })}
                    className={styles.numberInput}
                />
            </div>

            {selectedShape.type === 'rect' && (
                <>
                    <div className={styles.section}>
                        <label className={styles.label}>Ancho</label>
                        <input
                            type="number"
                            min="1"
                            value={selectedShape.width}
                            onChange={(e) => onUpdateShape({ width: parseInt(e.target.value) })}
                            className={styles.numberInput}
                        />
                    </div>
                    <div className={styles.section}>
                        <label className={styles.label}>Alto</label>
                        <input
                            type="number"
                            min="1"
                            value={selectedShape.height}
                            onChange={(e) => onUpdateShape({ height: parseInt(e.target.value) })}
                            className={styles.numberInput}
                        />
                    </div>
                    <div className={styles.section}>
                        <label className={styles.label}>Relleno</label>
                        <input
                            type="color"
                            value={selectedShape.fill === 'none' ? '#ffffff' : selectedShape.fill}
                            onChange={(e) => onUpdateShape({ fill: e.target.value })}
                            className={styles.colorInput}
                        />
                        <button
                            onClick={() => onUpdateShape({ fill: 'none' })}
                            className={styles.noneButton}
                        >
                            Sin relleno
                        </button>
                    </div>
                </>
            )}

            {selectedShape.type === 'circle' && (
                <>
                    <div className={styles.section}>
                        <label className={styles.label}>Radio</label>
                        <input
                            type="number"
                            min="1"
                            value={Math.round(selectedShape.r)}
                            onChange={(e) => onUpdateShape({ r: parseInt(e.target.value) })}
                            className={styles.numberInput}
                        />
                    </div>
                    <div className={styles.section}>
                        <label className={styles.label}>Relleno</label>
                        <input
                            type="color"
                            value={selectedShape.fill === 'none' ? '#ffffff' : selectedShape.fill}
                            onChange={(e) => onUpdateShape({ fill: e.target.value })}
                            className={styles.colorInput}
                        />
                        <button
                            onClick={() => onUpdateShape({ fill: 'none' })}
                            className={styles.noneButton}
                        >
                            Sin relleno
                        </button>
                    </div>
                </>
            )}

            {selectedShape.type === 'text' && (
                <>
                    <div className={styles.section}>
                        <label className={styles.label}>Texto</label>
                        <input
                            type="text"
                            value={selectedShape.text}
                            onChange={(e) => onUpdateShape({ text: e.target.value })}
                            className={styles.textInput}
                        />
                    </div>
                    <div className={styles.section}>
                        <label className={styles.label}>Tamaño de Fuente</label>
                        <input
                            type="number"
                            min="8"
                            max="72"
                            value={selectedShape.fontSize}
                            onChange={(e) => onUpdateShape({ fontSize: parseInt(e.target.value) })}
                            className={styles.numberInput}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default SymbolEditorPropertyPanel;
