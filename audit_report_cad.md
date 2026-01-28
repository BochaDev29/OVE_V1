# INFORME TÉCNICO CAD – OVE TALLER DE DIBUJO

1️⃣ **Alcance del CAD Detectado**
*   **Tipo de CAD:** Croquizador vectorial técnico (Diagramador). No es un CAD de ingeniería.
*   **Nivel de precisión:** Bajo/Medio (suficiente para esquemas unifilares y plantas a escala aproximada).
*   **Público objetivo real:** Instalador electricista que necesita bocetar rápidamente una instalación en obra o sobre un plano de arquitectura escaneado.

2️⃣ **Funcionalidades EFECTIVAS**
*   **Herramientas de dibujo:** Paredes (líneas simples), Cañerías (curvas Bezier y rectas), Líneas auxiliares.
*   **Inserción de símbolos:** Arrastrar y soltar (drag & drop) implementado para dos modos distintos: Planta (bocas, tomas, llaves) y Unifilar (termomagnéticas, disyuntores).
*   **Escalado:** Función de "Calibrar" con línea de referencia conocida efectiva.
*   **Edición:** Selección, movimiento y rotación básica de elementos. Etiquetas editables con doble clic.
*   **Exportación:** Generación de PDF formato A4 con rótulo automático que incluye datos del proyecto.

3️⃣ **Limitaciones REALES (no teóricas)**
*   **Dibujo:** Falta "snap" (imán) a puntos finales de líneas o paredes, dificultando cerrar habitaciones perfectamente.
*   **Edición:** No existe "Deshacer/Rehacer" (Undo/Redo), lo cual es crítico si se borra algo por error.
*   **Lectura del plano:** Al exportar a PDF, el plano es una IMAGEN (raster), no vectores. Al hacer zoom se ve pixelado y el texto puede perder legibilidad.
*   **Exportación:** El PDF es fijo en tamaño A4 apaisado. Planos grandes de viviendas completas quedarán muy pequeños o ilegibles.

4️⃣ **Riesgos Técnicos**
*   **Complejidad del código:** `PlannerCanvas.tsx` es un monolito de casi 1000 líneas. Mezcla lógica de UI, lógica de dibujo (Konva), gestión de estado y persistencia. Muy difícil de mantener.
*   **Riesgo de bugs:** La gestión de estado "manual" al cambiar entre modos (Planta/Unifilar) y al guardar es propensa a errores de sincronización.
*   **Rendimiento:** `react-konva` es rápido, pero la implementación actual podría sufrir si se agregan cientos de objetos sin optimizar el renderizado (ej. capas estáticas).

5️⃣ **Adecuación para V1**
⚠️ **Aceptable pero con advertencias**
Justificación: Cumple con la promesa básica de "dibujar un esquema rápido". Sin embargo, la falta de "Undo" y la exportación pixelada limitan su uso profesional serio frente a arquitectos, aunque sirve para clientes finales o uso interno.

6️⃣ **Recomendación Técnica**
Congelar como está. (Cualquier intento de agregar "Undo" o "Snap" ahora desestabilizaría el código monolítico antes del lanzamiento).
