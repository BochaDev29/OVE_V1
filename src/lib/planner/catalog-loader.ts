import { TradeCatalog } from '../../types/planner';

/**
 * CatalogLoader - Sistema de carga dinámica de catálogos multi-oficio
 * 
 * Permite cargar catálogos de símbolos y cálculos específicos por oficio
 * (Electricidad, Gas, Plomería, etc.) de forma modular.
 */
export class CatalogLoader {
    private catalogs: Map<string, TradeCatalog> = new Map();

    /**
     * Carga un catálogo de forma dinámica
     * @param tradeId - ID del oficio ('electrical', 'gas', 'plumbing')
     * @returns Catálogo cargado
     */
    async loadCatalog(tradeId: string): Promise<TradeCatalog> {
        // Si ya está cargado, retornar desde cache
        if (this.catalogs.has(tradeId)) {
            return this.catalogs.get(tradeId)!;
        }

        try {
            // Carga dinámica del módulo
            const module = await import(`./catalogs/${tradeId}/index.ts`);
            const catalog: TradeCatalog = module.default;

            // Validar estructura del catálogo
            if (!this.validateCatalog(catalog)) {
                throw new Error(`Catálogo inválido: ${tradeId}`);
            }

            // Guardar en cache
            this.catalogs.set(tradeId, catalog);

            console.log(`✅ Catálogo "${catalog.name}" v${catalog.version} cargado`);
            return catalog;
        } catch (error) {
            console.error(`❌ Error cargando catálogo ${tradeId}:`, error);
            throw error;
        }
    }

    /**
     * Obtiene un catálogo ya cargado
     */
    getCatalog(tradeId: string): TradeCatalog | undefined {
        return this.catalogs.get(tradeId);
    }

    /**
     * Obtiene una definición de símbolo específica
     */
    getSymbol(tradeId: string, symbolId: string) {
        const catalog = this.catalogs.get(tradeId);
        return catalog?.symbols.find(s => s.id === symbolId);
    }

    /**
     * Lista todos los catálogos cargados
     */
    listLoadedCatalogs(): string[] {
        return Array.from(this.catalogs.keys());
    }

    /**
     * Valida la estructura de un catálogo
     */
    private validateCatalog(catalog: TradeCatalog): boolean {
        if (!catalog.id || !catalog.name || !catalog.version) {
            return false;
        }

        if (!Array.isArray(catalog.symbols) || catalog.symbols.length === 0) {
            return false;
        }

        if (!catalog.calculations || typeof catalog.calculations.materials !== 'function') {
            return false;
        }

        return true;
    }

    /**
     * Limpia el cache de catálogos
     */
    clearCache(): void {
        this.catalogs.clear();
    }
}

// Instancia singleton
export const catalogLoader = new CatalogLoader();
