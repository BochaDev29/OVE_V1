import { TradeCatalog } from '../../../../types/planner';
import { electricalSymbols } from './symbols';
import { calculateElectricalMaterials } from './calculations';

/**
 * Catálogo de Instalaciones Eléctricas
 * 
 * Contiene todos los símbolos, cálculos y metadatos
 * para el diseño de instalaciones eléctricas según AEA.
 */
const electricalCatalog: TradeCatalog = {
    id: 'electrical',
    name: 'Instalaciones Eléctricas',
    version: '1.0.0',
    symbols: electricalSymbols,
    calculations: {
        materials: calculateElectricalMaterials
    }
};

export default electricalCatalog;
