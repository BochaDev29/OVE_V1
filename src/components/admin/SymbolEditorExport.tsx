import React from 'react';
import { Copy, Check, Code, FileText, Layers } from 'lucide-react';
import { EditorShape } from './symbolEditorTypes';
import { generateFullSVG, generatePathDataList, generateCombinedPathData } from '../../lib/planner/utils/svgHelper';
import styles from './SymbolEditorExport.module.css';

type ExportTab = 'combined' | 'detail' | 'svg';

interface ExportViewProps {
    shapes: EditorShape[];
    canvasSize: { width: number; height: number };
    origin?: { x: number; y: number };
}

const TAB_CONFIG: { key: ExportTab; label: string; icon: React.ReactNode; hint: string }[] = [
    { key: 'combined', label: 'd=""', icon: <Layers size={13} />, hint: 'Path unificado — copiar directo' },
    { key: 'detail', label: 'Detalle', icon: <FileText size={13} />, hint: 'Path por forma con comentarios' },
    { key: 'svg', label: 'SVG', icon: <Code size={13} />, hint: 'SVG completo exportable' },
];

const SymbolEditorExport: React.FC<ExportViewProps> = ({ shapes, canvasSize, origin }) => {
    const [tab, setTab] = React.useState<ExportTab>('combined');
    const [copied, setCopied] = React.useState(false);
    const [relativeToOrigin, setRelativeToOrigin] = React.useState(true);

    const exportOrigin = relativeToOrigin ? origin : undefined;

    const getContent = (): string => {
        if (shapes.length === 0) return '';
        switch (tab) {
            case 'combined':
                return generateCombinedPathData(shapes, exportOrigin);
            case 'detail':
                return generatePathDataList(shapes, exportOrigin);
            case 'svg':
                return generateFullSVG(shapes, canvasSize, exportOrigin);
        }
    };

    const currentContent = getContent();
    const activeTabConfig = TAB_CONFIG.find(t => t.key === tab)!;

    const handleCopy = () => {
        navigator.clipboard.writeText(currentContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={styles.exportContainer}>
            {/* Tab Bar */}
            <div className={styles.exportHeader}>
                <div className={styles.tabsContainer}>
                    {TAB_CONFIG.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`${styles.tabButton} ${tab === t.key ? styles.tabActive : ''}`}
                            title={t.hint}
                        >
                            {t.icon}
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleCopy}
                    className={`${styles.copyButton} ${copied ? styles.copyButtonSuccess : ''}`}
                    title="Copiar al portapapeles"
                    disabled={!currentContent}
                >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copied ? '✓' : 'Copiar'}</span>
                </button>
            </div>

            {/* Options */}
            <div className={styles.exportOptions}>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={relativeToOrigin}
                        onChange={(e) => setRelativeToOrigin(e.target.checked)}
                    />
                    <span>Relativo al (0,0)</span>
                </label>
                <span className={styles.tabHint}>{activeTabConfig.hint}</span>
            </div>

            {/* Code Output */}
            <div className={styles.codeContainer}>
                <pre className={styles.codeBlock}>
                    <code>{currentContent || '// Dibuja algo para ver el código aquí'}</code>
                </pre>
            </div>
        </div>
    );
};

export default SymbolEditorExport;
