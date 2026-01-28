import React from 'react';
import { X, Download } from 'lucide-react';

interface PDFPreviewProps {
    title: string;
    content: React.ReactNode;
    onClose: () => void;
    onDownload?: () => void;
    showDownload?: boolean;
}

export function PDFPreview({
    title,
    content,
    onClose,
    onDownload,
    showDownload = true
}: PDFPreviewProps) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        👁️ Vista Previa: {title}
                    </h2>
                    <div className="flex items-center gap-2">
                        {showDownload && onDownload && (
                            <button
                                onClick={onDownload}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors"
                            >
                                <Download size={18} />
                                Descargar PDF
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Cerrar vista previa"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 bg-slate-50">
                    {/* Simulación de página A4 */}
                    <div
                        className="bg-white shadow-lg mx-auto"
                        style={{
                            width: '210mm',
                            minHeight: '297mm',
                            padding: '20mm'
                        }}
                    >
                        {content}
                    </div>
                </div>

                {/* Footer con info */}
                <div className="border-t border-slate-200 p-3 bg-slate-50">
                    <p className="text-xs text-slate-500 text-center">
                        💡 Esta es una vista previa. El PDF final puede tener ligeras diferencias de formato.
                    </p>
                </div>
            </div>
        </div>
    );
}
