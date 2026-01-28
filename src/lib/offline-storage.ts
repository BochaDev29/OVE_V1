/**
 * Sistema de almacenamiento offline híbrido
 * Guarda en localStorage cuando no hay internet y sincroniza con Supabase al recuperar conexión
 */

const OFFLINE_PROJECTS_KEY = 'ove_offline_projects';
const PENDING_SYNC_KEY = 'ove_pending_sync';

export interface OfflineProject {
    id: string; // UUID temporal o ID de Supabase
    data: any; // Datos del proyecto
    timestamp: number; // Cuándo se guardó
    needsSync: boolean; // Si necesita sincronizarse con Supabase
}

/**
 * Detecta si hay conexión a internet
 */
export function isOnline(): boolean {
    return navigator.onLine;
}

/**
 * Guarda un proyecto en localStorage
 */
export function saveToLocalStorage(projectId: string, projectData: any): void {
    try {
        const projects = getOfflineProjects();

        const offlineProject: OfflineProject = {
            id: projectId,
            data: projectData,
            timestamp: Date.now(),
            needsSync: true
        };

        // Actualizar o agregar proyecto
        const index = projects.findIndex(p => p.id === projectId);
        if (index >= 0) {
            projects[index] = offlineProject;
        } else {
            projects.push(offlineProject);
        }

        localStorage.setItem(OFFLINE_PROJECTS_KEY, JSON.stringify(projects));
        console.log('💾 Proyecto guardado en localStorage:', projectId);
    } catch (error) {
        console.error('❌ Error guardando en localStorage:', error);
    }
}

/**
 * Obtiene todos los proyectos offline
 */
export function getOfflineProjects(): OfflineProject[] {
    try {
        const data = localStorage.getItem(OFFLINE_PROJECTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('❌ Error leyendo localStorage:', error);
        return [];
    }
}

/**
 * Obtiene un proyecto específico de localStorage
 */
export function getOfflineProject(projectId: string): OfflineProject | null {
    const projects = getOfflineProjects();
    return projects.find(p => p.id === projectId) || null;
}

/**
 * Obtiene proyectos que necesitan sincronización
 */
export function getPendingSyncProjects(): OfflineProject[] {
    return getOfflineProjects().filter(p => p.needsSync);
}

/**
 * Marca un proyecto como sincronizado
 */
export function markAsSynced(projectId: string): void {
    try {
        const projects = getOfflineProjects();
        const project = projects.find(p => p.id === projectId);

        if (project) {
            project.needsSync = false;
            localStorage.setItem(OFFLINE_PROJECTS_KEY, JSON.stringify(projects));
            console.log('✅ Proyecto marcado como sincronizado:', projectId);
        }
    } catch (error) {
        console.error('❌ Error marcando como sincronizado:', error);
    }
}

/**
 * Elimina un proyecto de localStorage
 */
export function removeFromLocalStorage(projectId: string): void {
    try {
        const projects = getOfflineProjects();
        const filtered = projects.filter(p => p.id !== projectId);
        localStorage.setItem(OFFLINE_PROJECTS_KEY, JSON.stringify(filtered));
        console.log('🗑️ Proyecto eliminado de localStorage:', projectId);
    } catch (error) {
        console.error('❌ Error eliminando de localStorage:', error);
    }
}

/**
 * Limpia todos los proyectos offline
 */
export function clearOfflineStorage(): void {
    localStorage.removeItem(OFFLINE_PROJECTS_KEY);
    localStorage.removeItem(PENDING_SYNC_KEY);
    console.log('🧹 Almacenamiento offline limpiado');
}

/**
 * Genera un ID temporal para proyectos offline
 */
export function generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
