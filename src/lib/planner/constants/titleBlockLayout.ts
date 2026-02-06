/**
 * Configuración centralizada del rótulo IRAM 4508
 * Todas las medidas están expresadas en milímetros (mm).
 */

export interface TitleBlockCell {
    id: string;
    label: string;
    dataKey?: string; // Mapeo a projectData o profileData
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    isBold?: boolean;
    align?: 'left' | 'center' | 'right';
}

const TOTAL_WIDTH = 175;
const TOTAL_HEIGHT = 51;

// Definición de columnas y filas (relativas al origen del rótulo)
const COL = {
    A: 0,
    B: 70,    // Fin de col 1 (Ancho 70)
    C: 135,   // Fin de col 2 (Ancho 65)
    END: 175  // Fin de col 3 (Ancho 40)
};

const ROW = {
    R1: 0,
    R2: 15,
    R3: 24,
    R4: 33,
    R5: 42,
    END: 51
};

export const TITLE_BLOCK_CONFIG = {
    width: TOTAL_WIDTH,
    height: TOTAL_HEIGHT,
    cells: [
        // COLUMNA IZQUIERDA (Acompaña toda la altura para logos/datos inmueble)
        { id: 'logo_inmueble', label: 'INMUEBLE / LOGO', dataKey: 'address', x: COL.A, y: ROW.R1, width: 70, height: ROW.END - ROW.R1, fontSize: 8, align: 'left' },

        // COLUMNA CENTRAL
        { id: 'denominacion', label: 'PROYECTO: DENOMINACIÓN', dataKey: 'projectName', x: COL.B, y: ROW.R1, width: 65, height: ROW.R2 - ROW.R1, fontSize: 12, isBold: true, align: 'center' },
        { id: 'instalador', label: 'DIBUJO / INSTALADOR', dataKey: 'installer', x: COL.B, y: ROW.R2, width: 65, height: ROW.R3 - ROW.R2, fontSize: 10, align: 'left' },
        { id: 'matricula', label: 'MATRÍCULA / HABILITACIÓN', dataKey: 'licenseNumber', x: COL.B, y: ROW.R3, width: 65, height: ROW.R4 - ROW.R3, fontSize: 10, align: 'left' },
        { id: 'propietario', label: 'PROPIETARIO', dataKey: 'clientName', x: COL.B, y: ROW.R4, width: 65, height: ROW.R5 - ROW.R4, fontSize: 10, align: 'left' },
        { id: 'revision', label: 'REVISIÓN / FIRMA', x: COL.B, y: ROW.R5, width: 65, height: ROW.END - ROW.R5, fontSize: 7, align: 'left' },

        // COLUMNA DERECHA
        { id: 'fecha', label: 'FECHA', dataKey: 'date', x: COL.C, y: ROW.R1, width: 40, height: ROW.R2 - ROW.R1, fontSize: 10, align: 'center' },
        { id: 'escala', label: 'ESCALA', dataKey: 'calculatedScale', x: COL.C, y: ROW.R2, width: 40, height: ROW.R4 - ROW.R2, fontSize: 12, isBold: true, align: 'center' },
        { id: 'nro_plano', label: 'Nº PLANO', dataKey: 'planNumber', x: COL.C, y: ROW.R4, width: 40, height: ROW.END - ROW.R4, fontSize: 14, isBold: true, align: 'center' }
    ] as TitleBlockCell[]
};
