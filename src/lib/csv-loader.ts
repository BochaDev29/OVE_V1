// csv-loader.ts - Sistema de Carga de Datos CSV con Fallback
// Permite externalizar configuraciones a archivos CSV editables en Excel

/**
 * Interfaz genérica para datos CSV cargados
 */
export interface CSVData {
    [key: string]: string | number;
}

/**
 * Resultado de carga de CSV con información de estado
 */
export interface CSVLoadResult<T> {
    data: T[];
    source: 'csv' | 'fallback';
    error?: string;
}

/**
 * Clase principal para cargar y parsear archivos CSV
 */
export class CSVLoader {
    private cache: Map<string, CSVData[]> = new Map();
    private loadAttempts: Map<string, number> = new Map();

    /**
     * Carga un archivo CSV desde /public/data/ con sistema de fallback
     * @param filename Nombre del archivo CSV (ej: 'grados_electrificacion.csv')
     * @param fallbackData Datos de respaldo en caso de error
     * @param validateFn Función opcional de validación personalizada
     * @returns Promesa con los datos cargados o fallback
     */
    async loadCSV<T extends CSVData>(
        filename: string,
        fallbackData: T[],
        validateFn?: (data: T[]) => boolean
    ): Promise<CSVLoadResult<T>> {
        // Incrementar contador de intentos
        const attempts = (this.loadAttempts.get(filename) || 0) + 1;
        this.loadAttempts.set(filename, attempts);

        try {
            // 1. Verificar caché
            if (this.cache.has(filename)) {
                console.log(`✅ CSV cargado desde caché: ${filename}`);
                return {
                    data: this.cache.get(filename) as T[],
                    source: 'csv'
                };
            }

            // 2. Intentar cargar desde /public/data/
            const response = await fetch(`/data/${filename}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // 3. Leer contenido del archivo
            const csvText = await response.text();

            if (!csvText || csvText.trim().length === 0) {
                throw new Error('Archivo CSV vacío');
            }

            // 4. Parsear CSV a objetos JSON
            const parsedData = this.parseCSV<T>(csvText);

            // 5. Validar estructura
            if (parsedData.length === 0) {
                throw new Error('CSV no contiene datos válidos');
            }

            // 6. Validación personalizada (si existe)
            if (validateFn && !validateFn(parsedData)) {
                throw new Error('Validación personalizada falló');
            }

            // 7. Cachear datos
            this.cache.set(filename, parsedData);

            console.log(`✅ CSV cargado exitosamente: ${filename} (${parsedData.length} registros)`);

            return {
                data: parsedData,
                source: 'csv'
            };

        } catch (error) {
            // 8. FALLBACK: usar datos hardcodeados
            const errorMsg = error instanceof Error ? error.message : 'Error desconocido';

            console.warn(
                `⚠️ Error cargando ${filename} (intento ${attempts}): ${errorMsg}\n` +
                `   Usando valores por defecto (${fallbackData.length} registros)`
            );

            return {
                data: fallbackData,
                source: 'fallback',
                error: errorMsg
            };
        }
    }

    /**
     * Parsea texto CSV a array de objetos
     * @param csvText Contenido del archivo CSV
     * @returns Array de objetos con los datos
     */
    private parseCSV<T extends CSVData>(csvText: string): T[] {
        const lines = csvText.trim().split(/\r?\n/);

        if (lines.length < 2) {
            throw new Error('CSV debe tener al menos encabezado y una fila de datos');
        }

        // Primera línea = nombres de columnas
        const headers = lines[0].split(',').map(h => h.trim());

        if (headers.length === 0) {
            throw new Error('CSV no tiene columnas definidas');
        }

        // Parsear filas de datos
        const data: T[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();

            // Ignorar líneas vacías
            if (!line) continue;

            const values = line.split(',').map(v => v.trim());

            // Validar que tenga el mismo número de columnas
            if (values.length !== headers.length) {
                console.warn(
                    `⚠️ Línea ${i + 1} tiene ${values.length} columnas, ` +
                    `esperadas ${headers.length}. Ignorando fila.`
                );
                continue;
            }

            // Crear objeto con los datos
            const row: any = {};

            for (let j = 0; j < headers.length; j++) {
                const key = headers[j];
                const value = values[j];

                // Intentar convertir a número si es posible
                const numValue = parseFloat(value);
                row[key] = isNaN(numValue) ? value : numValue;
            }

            data.push(row as T);
        }

        return data;
    }

    /**
     * Limpia la caché de un archivo específico o toda la caché
     * @param filename Nombre del archivo (opcional, si no se provee limpia todo)
     */
    clearCache(filename?: string): void {
        if (filename) {
            this.cache.delete(filename);
            console.log(`🗑️ Caché limpiado para: ${filename}`);
        } else {
            this.cache.clear();
            console.log('🗑️ Caché completo limpiado');
        }
    }

    /**
     * Obtiene estadísticas de uso del loader
     */
    getStats(): { filename: string; attempts: number; cached: boolean }[] {
        const stats: { filename: string; attempts: number; cached: boolean }[] = [];

        this.loadAttempts.forEach((attempts, filename) => {
            stats.push({
                filename,
                attempts,
                cached: this.cache.has(filename)
            });
        });

        return stats;
    }
}

// Instancia singleton del loader
const csvLoader = new CSVLoader();

export default csvLoader;
