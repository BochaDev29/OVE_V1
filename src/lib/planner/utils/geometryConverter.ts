/**
 * Utilerías de conversión geométrica para el Taller CAD
 * 
 * Basado en una resolución estándar de 96 DPI (píxeles por pulgada).
 */

const DPI = 96;
const MM_PER_INCH = 25.4;

/**
 * Convierte milímetros reales a píxeles de pantalla (96 DPI)
 */
export const mmToPixels = (mm: number): number => {
    return (mm / MM_PER_INCH) * DPI;
};

/**
 * Escalas estándar de dibujo técnico IRAM
 */
const STANDARD_SCALES = [
    1, 2, 5, 10, 20, 25, 50, 75, 100, 200, 250, 500, 1000
];

/**
 * Márgenes estándar IRAM 4508 (en mm)
 */
export const IRAM_MARGINS = {
    left: 25,   // Espacio para encuadernación
    top: 10,
    right: 10,
    bottom: 10
};

/**
 * Calcula las dimensiones útiles (dibujables) de un formato de papel
 */
export const getUsableDimensions = (widthMm: number, heightMm: number) => {
    return {
        width: widthMm - IRAM_MARGINS.left - IRAM_MARGINS.right,
        height: heightMm - IRAM_MARGINS.top - IRAM_MARGINS.bottom
    };
};

/**
 * Calcula la escala técnica más cercana basada en la calibración (ppm)
 * 
 * @param pixelsPerMeter Píxeles que representan 1 metro real en el canvas
 * @returns String formateado (ej: "1:50")
 */
export const calculateStandardScale = (pixelsPerMeter: number): string => {
    if (!pixelsPerMeter || pixelsPerMeter <= 0) return "---";

    // 1 metro = 1000mm. 
    // Los píxeles que ocuparían 1000mm en la pantalla física a 1:1 son:
    const pixelsAtFullScale = mmToPixels(1000);

    // La escala es la relación entre los píxeles ideales (1:1) y los calibrados
    const rawScale = pixelsAtFullScale / pixelsPerMeter;

    // Buscar la escala estándar más cercana
    const closestScale = STANDARD_SCALES.reduce((prev, curr) => {
        return Math.abs(curr - rawScale) < Math.abs(prev - rawScale) ? curr : prev;
    });

    return `1:${closestScale}`;
};
