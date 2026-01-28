import { useEffect, useState } from 'react';
import { WifiOff, CloudOff, Check, Loader2 } from 'lucide-react';

interface ConnectionStatusProps {
    isOnline: boolean;
    isSaving: boolean;
    lastSaved: Date | null;
    error: string | null;
}

export function ConnectionStatus({ isOnline, isSaving, lastSaved, error }: ConnectionStatusProps) {
    const [showSuccess, setShowSuccess] = useState(false);

    // Mostrar mensaje de éxito por 3 segundos después de guardar
    useEffect(() => {
        if (lastSaved && !isSaving) {
            setShowSuccess(true);
            const timer = setTimeout(() => {
                setShowSuccess(false);
            }, 3000); // 3 segundos

            return () => clearTimeout(timer);
        }
    }, [lastSaved, isSaving]);

    // No mostrar nada si está guardando y todo va bien
    if (isSaving && !error) {
        return (
            <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-300 z-50">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">
                    {isOnline ? 'Guardando en la nube...' : 'Guardando localmente...'}
                </span>
            </div>
        );
    }

    // Mostrar error si existe
    if (error) {
        return (
            <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
                <CloudOff className="w-4 h-4" />
                <span className="text-sm font-medium">Error: {error}</span>
            </div>
        );
    }

    // Mostrar estado offline
    if (!isOnline && lastSaved) {
        return (
            <div className="fixed bottom-4 right-4 bg-amber-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-medium">
                    Sin conexión - Guardado local
                    <span className="ml-2 text-xs opacity-90">
                        {lastSaved.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </span>
            </div>
        );
    }

    // Mostrar confirmación de guardado (solo por 3 segundos)
    if (showSuccess && lastSaved) {
        return (
            <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-300 z-50">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">
                    Guardado {lastSaved.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        );
    }

    return null;
}
