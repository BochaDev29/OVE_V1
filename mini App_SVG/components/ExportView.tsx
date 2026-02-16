
import React, { useState } from 'react';
import { Copy, Check, Code, FileText, Layers } from 'lucide-react';
import { generateFullSVG, generatePathDataList, generateCombinedPathData } from '../utils/svgHelper';
import { Shape } from '../types';

type ExportTab = 'combined' | 'detail' | 'svg';

interface ExportViewProps {
  shapes: Shape[];
  canvasSize: { width: number; height: number };
  origin?: { x: number; y: number };
}

const TAB_CONFIG: { key: ExportTab; label: string; icon: React.ReactNode; hint: string }[] = [
  { key: 'combined', label: 'd=""', icon: <Layers size={13} />, hint: 'Path unificado — copiar directo' },
  { key: 'detail', label: 'Detalle', icon: <FileText size={13} />, hint: 'Path por forma con comentarios' },
  { key: 'svg', label: 'SVG', icon: <Code size={13} />, hint: 'SVG completo exportable' },
];

const ExportView: React.FC<ExportViewProps> = ({ shapes, canvasSize, origin }) => {
  const [tab, setTab] = useState<ExportTab>('combined');
  const [copied, setCopied] = useState(false);
  const [useRelative, setUseRelative] = useState(true);

  const exportOrigin = useRelative ? origin : undefined;

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
  const activeHint = TAB_CONFIG.find(t => t.key === tab)!.hint;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const blob = new Blob([currentContent], { type: tab === 'svg' ? 'image/svg+xml' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = tab === 'svg' ? 'symbol.svg' : 'paths.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 flex flex-col h-full bg-slate-50 border-t border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex bg-slate-200 p-0.5 rounded-lg gap-0.5">
          {TAB_CONFIG.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all ${tab === t.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              title={t.hint}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${copied
              ? 'bg-emerald-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }`}
            title="Copiar al portapapeles"
            disabled={!currentContent}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '✓' : 'Copiar'}
          </button>
          <button
            onClick={downloadFile}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-md border border-slate-200 transition-colors"
            disabled={!currentContent}
          >
            Descargar
          </button>
        </div>
      </div>

      {/* Options Row */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useRelative}
            onChange={(e) => setUseRelative(e.target.checked)}
            className="w-3.5 h-3.5 accent-blue-600"
          />
          Relativo al (0,0)
        </label>
        <span className="text-[10px] text-slate-400 italic">{activeHint}</span>
      </div>

      <div className="flex-1 bg-slate-950 rounded-lg overflow-hidden shadow-inner border border-slate-800">
        <pre className="p-3 text-[11px] leading-relaxed font-mono text-slate-200 overflow-auto h-full max-h-[300px] whitespace-pre selection:bg-blue-500 selection:text-white" style={{ tabSize: 2 }}>
          <code>{currentContent || '// Dibuja algo para ver el código aquí'}</code>
        </pre>
      </div>
    </div>
  );
};

export default ExportView;
