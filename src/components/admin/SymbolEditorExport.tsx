import React from 'react';
import { Copy, Check, Code } from 'lucide-react';
import { EditorShape } from './symbolEditorTypes';
import { generateFullSVG } from '../../lib/planner/utils/svgHelper';
import styles from './SymbolEditorExport.module.css';

interface ExportViewProps {
    shapes: EditorShape[];
    canvasSize: { width: number; height: number };
    origin?: { x: number; y: number };
}

const SymbolEditorExport: React.FC<ExportViewProps> = ({ shapes, canvasSize, origin }) => {
    const [copied, setCopied] = React.useState(false);
    const [relativeToOrigin, setRelativeToOrigin] = React.useState(true);

    const exportOrigin = relativeToOrigin ? origin : undefined;
    const svgContent = generateFullSVG(shapes, canvasSize, exportOrigin);

    const handleCopy = () => {
        navigator.clipboard.writeText(svgContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={styles.exportContainer}>
            <div className={styles.exportHeader}>
                <div className={styles.exportTitle}>
                    <Code size={16} />
                    <span>Código SVG</span>
                </div>

                <button
                    onClick={handleCopy}
                    className={styles.copyButton}
                    title="Copiar código SVG"
                >
                    {copied ? <Check size={18} className={styles.checkIcon} /> : <Copy size={18} />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
            </div>

            <div className={styles.exportOptions}>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={relativeToOrigin}
                        onChange={(e) => setRelativeToOrigin(e.target.checked)}
                    />
                    <span>Relativo al centro (0,0)</span>
                </label>
            </div>

            <div className={styles.codeContainer}>
                <pre className={styles.codeBlock}>
                    <code>{svgContent || '// Dibuja algo para ver el código SVG aquí'}</code>
                </pre>
            </div>
        </div>
    );
};

export default SymbolEditorExport;
