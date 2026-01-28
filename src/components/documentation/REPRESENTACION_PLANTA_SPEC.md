# ESPECIFICACIÓN MAESTRA: PLANO DE PLANTA (OVE V1)

> **Objetivo:** Generar el PDF que contiene la representación gráfica de la instalación sobre la arquitectura.
> **Fuente de Datos:** Captura (Snapshot) del componente `PlannerCanvas` + Datos del Proyecto para el Rótulo.

## 1. LAYOUT DE LA PÁGINA
- **Formato:** A4 Apaisado (Landscape) o A3 (según tamaño del dibujo).
- **Márgenes:** Izquierdo 25mm (para encarpetar), resto 10mm.

## 2. EL LIENZO (CANVAS AREA)
- **Contenido:** Debe renderizar la imagen exportada del Taller CAD.
- **Elementos Obligatorios en el Dibujo (Validar visualmente):**
  - Muros y aberturas (Arquitectura base).
  - Simbología Eléctrica Normalizada (Bocas, Tomas, Llaves).
  - Trazado de cañerías (Curvas suaves o rectas ortogonales).
  - Ubicación del Tablero Principal (TP) y Medidor (M).
  - Ubicación de la Puesta a Tierra (PAT/Jabalina).

## 3. REFERENCIAS (LEYENDA)
En el lateral derecho o inferior, debe generarse dinámicamente una tabla de símbolos usados.
*   *No mostrar todos los símbolos de la librería, solo los usados en este plano.*
*   **Ejemplo:**
    *   (Símbolo Boca) -> Boca de Iluminación en Techo.
    *   (Símbolo Toma) -> Tomacorriente Doble con Tierra (2x10A+T).
    *   (Símbolo TP) -> Tablero Principal.

## 4. EL RÓTULO (TITLE BLOCK) - CRÍTICO
Debe ubicarse en el ángulo inferior derecho (Norma IRAM 4504).
**Datos a inyectar:**
*   **Obra:** Instalación Eléctrica `{{DESTINATION_TYPE}}` (Nueva/Existente).
*   **Propietario:** `{{CLIENT_NAME}}`.
*   **Ubicación:** `{{PROJECT_ADDRESS}}`.
*   **Plano:** "PLANTA DE ILUMINACIÓN Y TOMACORRIENTES".
*   **Escala:** "Sin Escala / Croquis" (Si es existente) o "1:50 / 1:100" (Si es nueva).
*   **Instalador:** `{{USER_NAME}}` - Matrícula: `{{USER_LICENSE}}`.
*   **Firma:** Espacio en blanco para firma hológrafa o digital.
