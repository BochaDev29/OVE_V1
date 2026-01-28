import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { saveToLocalStorage, markAsSynced, generateTempId } from '../lib/offline-storage';

interface UseAutoSaveOptions {
    data: any;
    projectId: string | null;
    onSave: (data: any) => Promise<string | null>;
    debounceMs?: number;
    enabled?: boolean;
}

interface AutoSaveStatus {
    isSaving: boolean;
    lastSaved: Date | null;
    error: string | null;
    isOffline: boolean;
}

/**
 * Hook para auto-guardado híbrido (Supabase + localStorage)
 */
export function useAutoSave({
    data,
    projectId,
    onSave,
    debounceMs = 30000, // 30 segundos por defecto
    enabled = true
}: UseAutoSaveOptions): AutoSaveStatus {

    const isOnline = useOnlineStatus();
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const currentProjectIdRef = useRef<string | null>(projectId);
    const saveTimeoutRef = useRef<NodeJS.Timeout>();

    // Actualizar ref cuando cambia projectId
    useEffect(() => {
        currentProjectIdRef.current = projectId;
    }, [projectId]);

    // Auto-guardado con debounce
    useEffect(() => {
        if (!enabled || !data) return;

        // Limpiar timeout anterior
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Programar nuevo guardado
        saveTimeoutRef.current = setTimeout(async () => {
            await performSave();
        }, debounceMs);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [data, enabled, debounceMs, isOnline]);

    // Auto-sincronizar al recuperar conexión
    useEffect(() => {
        if (isOnline && currentProjectIdRef.current) {
            // Intentar sincronizar si hay datos pendientes
            performSave();
        }
    }, [isOnline]);

    const performSave = async () => {
        if (isSaving) return;

        setIsSaving(true);
        setError(null);

        try {
            let currentId = currentProjectIdRef.current;

            if (isOnline) {
                // Con internet: Guardar en Supabase
                console.log('💾 Auto-guardando en Supabase...');
                const savedId = await onSave(data);

                if (savedId) {
                    currentProjectIdRef.current = savedId;

                    // Marcar como sincronizado en localStorage
                    if (currentId) {
                        markAsSynced(currentId);
                    }

                    setLastSaved(new Date());
                    console.log('✅ Auto-guardado en Supabase exitoso');
                }
            } else {
                // Sin internet: Guardar en localStorage
                console.log('📡 Sin conexión - Guardando localmente...');

                if (!currentId) {
                    currentId = generateTempId();
                    currentProjectIdRef.current = currentId;
                }

                saveToLocalStorage(currentId, data);
                setLastSaved(new Date());
                console.log('✅ Guardado local exitoso');
            }
        } catch (err: any) {
            console.error('❌ Error en auto-guardado:', err);
            setError(err.message || 'Error al guardar');

            // Fallback a localStorage si falla Supabase
            if (isOnline) {
                console.log('⚠️ Fallback a localStorage por error en Supabase');
                const fallbackId = currentProjectIdRef.current || generateTempId();
                saveToLocalStorage(fallbackId, data);
                setLastSaved(new Date());
            }
        } finally {
            setIsSaving(false);
        }
    };

    return {
        isSaving,
        lastSaved,
        error,
        isOffline: !isOnline
    };
}
