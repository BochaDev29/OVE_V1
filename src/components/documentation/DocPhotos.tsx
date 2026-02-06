import React, { useRef, useState } from 'react';
import { Upload, X, Download, Image as ImageIcon, Loader2, Eye, GripVertical } from 'lucide-react';
import { PDFPreview } from '../common/PDFPreview';
import jsPDF from 'jspdf';
import { addPDFCoverPage } from '../../lib/pdf-utils';

interface DocPhotosProps {
    project: any; // To get header info for PDF
    value: PhotoItem[];
    onChange: (val: PhotoItem[]) => void;
}

interface PhotoItem {
    id: string;
    base64: string;
    caption: string;
    category: 'tablero' | 'pat' | 'conductores' | 'general';
}

export default function DocPhotos({ project, value, onChange }: DocPhotosProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [processing, setProcessing] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // --- COMPRESSION LOGIC ---
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1024;
                    const MAX_HEIGHT = 1024;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG 0.7
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
            };
        });
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setProcessing(true);
        const newPhotos: PhotoItem[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const compressedBase64 = await compressImage(files[i]);
                newPhotos.push({
                    id: Math.random().toString(36).substr(2, 9),
                    base64: compressedBase64,
                    caption: '',
                    category: 'general'
                });
            }
            onChange([...(value || []), ...newPhotos]);
        } catch (err) {
            console.error("Error compressing images:", err);
            alert("Error al procesar las imágenes.");
        } finally {
            setProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = (id: string) => {
        onChange((value || []).filter(p => p.id !== id));
    };

    const handleCaptionChange = (id: string, text: string) => {
        const newData = (value || []).map(p => p.id === id ? { ...p, caption: text } : p);
        onChange(newData);
    };

    const handleCategoryChange = (id: string, category: PhotoItem['category']) => {
        const newData = (value || []).map(p => p.id === id ? { ...p, category } : p);
        onChange(newData);
    };

    const getCategoryColor = (category: PhotoItem['category']) => {
        const colors = {
            tablero: 'bg-blue-100 text-blue-700 border-blue-200',
            pat: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            conductores: 'bg-purple-100 text-purple-700 border-purple-200',
            general: 'bg-slate-100 text-slate-700 border-slate-200'
        };
        return colors[category];
    };

    // --- DRAG & DROP LOGIC ---
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newData = [...value];
        const itemToMove = newData.splice(draggedIndex, 1)[0];
        newData.splice(index, 0, itemToMove);
        setDraggedIndex(index);
        onChange(newData);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const renderPreviewContent = () => {
        const photosByCategory = {
            tablero: (value || []).filter(p => p.category === 'tablero'),
            pat: (value || []).filter(p => p.category === 'pat'),
            conductores: (value || []).filter(p => p.category === 'conductores'),
            general: (value || []).filter(p => p.category === 'general')
        };

        const categories = [
            { key: 'tablero' as const, title: '📋 TABLERO ELÉCTRICO' },
            { key: 'pat' as const, title: '⚡ PUESTA A TIERRA (PAT)' },
            { key: 'conductores' as const, title: '🔌 CONDUCTORES Y CABLEADO' },
            { key: 'general' as const, title: '📷 GENERAL' }
        ];

        return (
            <div className="space-y-8 p-2">
                <div className="text-center border-b pb-6">
                    <h1 className="text-2xl font-bold mb-1 uppercase text-slate-900 leading-tight">Registro Fotográfico de Obra</h1>
                    <p className="text-slate-600 text-sm">Evidencia técnica de seguridad según AEA 90364</p>
                </div>

                {categories.map(category => {
                    const photos = photosByCategory[category.key];
                    if (photos.length === 0) return null;

                    return (
                        <div key={category.key} className="space-y-4">
                            <h3 className="font-black text-slate-800 border-l-4 border-blue-600 pl-3 text-sm uppercase tracking-wider">{category.title}</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {photos.map((photo, idx) => (
                                    <div key={photo.id} className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex flex-col gap-2 break-inside-avoid">
                                        <div className="aspect-video bg-black rounded overflow-hidden">
                                            <img src={photo.base64} className="w-full h-full object-contain" alt="Evidencia" />
                                        </div>
                                        {photo.caption ? (
                                            <p className="text-[10px] text-slate-600 italic leading-tight px-1">
                                                {photo.caption}
                                            </p>
                                        ) : (
                                            <p className="text-[10px] text-slate-400 italic px-1">Sin descripción (Foto #{idx + 1})</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // --- PDF GENERATION ---
    const handleDownloadPDF = () => {
        if (!value || value.length === 0) return;
        setGeneratingPdf(true);

        try {
            const doc = new jsPDF();
            const clientName = project?.wizardData?.config?.clientName || 'Proyecto';

            addPDFCoverPage(doc, "REGISTRO FOTOGRÁFICO", project, null);

            const photosByCategory = {
                tablero: value.filter(p => p.category === 'tablero'),
                pat: value.filter(p => p.category === 'pat'),
                conductores: value.filter(p => p.category === 'conductores'),
                general: value.filter(p => p.category === 'general')
            };

            const categories = [
                { key: 'tablero' as const, title: '📋 TABLERO ELÉCTRICO' },
                { key: 'pat' as const, title: '⚡ PUESTA A TIERRA (PAT)' },
                { key: 'conductores' as const, title: '🔌 CONDUCTORES Y CABLEADO' },
                { key: 'general' as const, title: '📷 GENERAL' }
            ];

            let yCursor = 20;
            const marginX = 15;
            const columnWidth = 85; // mm
            const columnSpacing = 10; // mm
            const maxPhotoHeight = 65; // mm
            const captionHeight = 10; // mm
            const blockHeight = maxPhotoHeight + captionHeight + 10; // total block space

            categories.forEach(category => {
                const photos = photosByCategory[category.key];
                if (photos.length === 0) return;

                // Título de categoría (siempre nueva fila si no cabe)
                if (yCursor + 15 > 270) {
                    doc.addPage();
                    yCursor = 20;
                }

                doc.setFont("helvetica", "bold");
                doc.setFontSize(12);
                doc.setTextColor(44, 62, 80);
                doc.text(category.title, marginX, yCursor);
                yCursor += 10;

                // Fotos en 2 columnas
                for (let i = 0; i < photos.length; i += 2) {
                    // Verificar si esta FILA entra en la página
                    if (yCursor + blockHeight > 275) {
                        doc.addPage();
                        yCursor = 20;
                    }

                    // Foto Izquierda
                    const photoL = photos[i];
                    doc.addImage(photoL.base64, 'JPEG', marginX, yCursor, columnWidth, maxPhotoHeight, undefined, 'FAST');
                    doc.setFontSize(8);
                    doc.setFont("helvetica", "italic");
                    doc.setTextColor(100);
                    const captionL = photoL.caption || `Evidencia #${i + 1}`;
                    const splitL = doc.splitTextToSize(captionL, columnWidth);
                    doc.text(splitL, marginX, yCursor + maxPhotoHeight + 4);

                    // Foto Derecha (si existe)
                    if (photos[i + 1]) {
                        const photoR = photos[i + 1];
                        const xR = marginX + columnWidth + columnSpacing;
                        doc.addImage(photoR.base64, 'JPEG', xR, yCursor, columnWidth, maxPhotoHeight, undefined, 'FAST');
                        const captionR = photoR.caption || `Evidencia #${i + 2}`;
                        const splitR = doc.splitTextToSize(captionR, columnWidth);
                        doc.text(splitR, xR, yCursor + maxPhotoHeight + 4);
                    }

                    // Avanzar cursor basándose en cuántas líneas de texto hay (máximo de las dos columnas)
                    const textLHeight = (splitL.length * 4);
                    const textRHeight = photos[i + 1] ? (doc.splitTextToSize(photos[i + 1].caption || '', columnWidth).length * 4) : 0;
                    yCursor += maxPhotoHeight + Math.max(textLHeight, textRHeight, 8) + 12;
                }

                yCursor += 5;
            });

            // Footer info
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`OVE - Informe Técnico Digital | Página ${i} de ${pageCount}`, 105, 290, { align: "center" });
            }

            const projectName = project?.name || project?.wizardData?.config?.clientName || 'Proyecto';
            doc.save(`Registro_Fotografico_${projectName}.pdf`);

        } catch (err) {
            console.error("Error creating PDF:", err);
            alert("Error al generar el PDF de fotos.");
        } finally {
            setGeneratingPdf(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header / Actions */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center gap-2">
                    <ImageIcon className="text-blue-600" size={24} />
                    <h2 className="text-lg font-bold text-slate-700">Registro de Obra</h2>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={processing}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium border border-blue-200 disabled:opacity-50"
                    >
                        {processing ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                        {processing ? 'Procesando...' : 'Subir Fotos'}
                    </button>
                    <button
                        onClick={() => setShowPreview(true)}
                        disabled={!value || value.length === 0}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium disabled:opacity-50"
                    >
                        <Eye size={18} /> Vista Previa
                    </button>
                    {(value && value.length > 0) && (
                        <button
                            onClick={handleDownloadPDF}
                            disabled={generatingPdf}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm disabled:opacity-50"
                        >
                            {generatingPdf ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                            Descargar Reporte
                        </button>
                    )}
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                />
            </div>

            {/* Empty State */}
            {(!value || value.length === 0) && !processing && (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-500"
                >
                    <Upload size={48} className="mb-4 opacity-50" />
                    <p className="font-medium">Haz click aquí para subir fotos</p>
                    <p className="text-sm">Se comprimirán automáticamente para optimizar el reporte.</p>
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(value || []).map((photo: PhotoItem, index: number) => (
                    <div
                        key={photo.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col group relative transition-all duration-200 ${draggedIndex === index ? 'opacity-40 scale-95 border-blue-400 border-2 dashed' : 'opacity-100'}`}
                    >
                        {/* Drag Handle Overlay */}
                        <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <div className="bg-white/90 p-1.5 rounded shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing text-slate-500 hover:text-blue-600 transition-colors">
                                <GripVertical size={16} />
                            </div>
                        </div>

                        <div className="relative aspect-video bg-slate-100 cursor-grab active:cursor-grabbing">
                            <img src={photo.base64} alt="Obra" className="w-full h-full object-contain bg-black pointer-events-none" />
                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-[10px] text-white font-medium backdrop-blur-sm">
                                Posición #{index + 1}
                            </div>
                        </div>

                        <div className="p-3 bg-white border-t border-slate-100 space-y-2">
                            <input
                                type="text"
                                placeholder="Describa qué se ve en esta foto..."
                                className="w-full text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                                value={photo.caption}
                                onChange={(e) => handleCaptionChange(photo.id, e.target.value)}
                            />

                            {/* Selector de Categoría */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-medium">Categoría:</span>
                                <select
                                    value={photo.category}
                                    onChange={(e) => handleCategoryChange(photo.id, e.target.value as PhotoItem['category'])}
                                    className={`text-xs px-2 py-1 rounded border font-medium ${getCategoryColor(photo.category)}`}
                                >
                                    <option value="general">📷 General</option>
                                    <option value="tablero">📋 Tablero</option>
                                    <option value="pat">⚡ PAT</option>
                                    <option value="conductores">🔌 Conductores</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={() => handleDelete(photo.id)}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 transform hover:scale-105"
                            title="Eliminar foto"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal de Vista Previa */}
            {showPreview && (
                <PDFPreview
                    title="Registro Fotográfico"
                    content={renderPreviewContent()}
                    onClose={() => setShowPreview(false)}
                    onDownload={() => {
                        setShowPreview(false);
                        handleDownloadPDF();
                    }}
                />
            )}
        </div>
    );
}
