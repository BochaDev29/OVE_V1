 Listado de Materiales (El Presupuesto Técnico)
Este documento es vital para la compra y para demostrar "Calidad Normativa" (Sello S).
Archivo: LISTADO_MATERIALES_SPEC.md
# ESPECIFICACIÓN MAESTRA: CÓMPUTO Y MATERIALES (OVE V1)

> **Objetivo:** Generar la lista de compras y especificaciones técnicas.
> **Fuente de Datos:** Componente `MaterialReportModal` (Cómputo del Taller CAD + Wizard).

## 1. ENCABEZADO
- Título: "PLANILLA DE MATERIALES Y ESPECIFICACIONES TÉCNICAS".
- Subtítulo: "Listado orientativo según proyecto - AEA 90364".

## 2. GRILLA DE MATERIALES (TABLA)
La tabla debe tener las siguientes columnas obligatorias para cumplir con ERSeP/Norma:

| ÍTEM | CANT. | UNIDAD | DESCRIPCIÓN DEL MATERIAL | NORMA TÉCNICA / CERTIFICACIÓN |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 100 | m | Cable Unipolar 2.5mm² (Marrón) | IRAM NM 247-3 / Sello "S" |
| 2 | 1 | un | Interruptor Diferencial 2x40A 30mA | IEC 61008 / Sello "S" |
| 3 | 15 | un | Llave de 1 punto (Módulo) | IRAM 2071 / Sello "S" |

> **Regla de Negocio:** La columna "Norma Técnica" debe autocompletarse con los valores por defecto del sistema (ej: siempre que sea cable, poner 
IRAM NM 247-3). El usuario no debe escribir esto para evitar errores legales.

## 3. AGRUPACIÓN INTELIGENTE
El listado debe estar dividido en secciones para facilitar la lectura:
1.  **Protecciones y Tableros** (Térmicas, Diferenciales, Gabinetes).
2.  **Cables y Conductores**.
3.  **Canalizaciones y Accesorios** (Caños, Cajas, Conectores).
4.  **Módulos y Bastidores** (Tomas, Teclas, Tapas).

## 4. NOTA AL PIE (DISCLAIMER COMERCIAL)
"Las cantidades expresadas surgen del cómputo métrico digital. Se recomienda verificar en obra antes de realizar la compra definitiva. 
Todos los materiales adquiridos deben exhibir el Sello de Seguridad Eléctrica según Res. 169/2018."
