import { useState, useEffect } from 'react';

/**
 * Hook para detectar el estado de conexión a internet
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => {
            console.log('🟢 Conexión restaurada');
            setIsOnline(true);
        };

        const handleOffline = () => {
            console.log('🔴 Conexión perdida');
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}
