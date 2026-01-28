# OVE – Antigravity Full System Technical Overview

## 1. Arquitectura General
El proyecto **OVE (Oficina Eléctrica Virtual)** es una aplicación web SPA (Single Page Application) diseñada para instaladores electricistas, que permite gestionar el ciclo de vida completo de un proyecto eléctrico residencial o comercial, desde el cálculo inicial hasta la generación de documentación técnica y planos.

*   **Framework Principal:** React 18 con TypeScript.
*   **Herramienta de Construcción:** Vite.
*   **Estilado:** Tailwind CSS para una interfaz moderna y responsiva.
*   **Backend & Persistencia:** Supabase (Auth, PostgreSQL, JSONB para datos complejos).
*   **Gráficos (CAD):** Konva.js via `react-konva`.
*   **Generación de Reportes:** jsPDF y jspdf-autotable.

### Estructura de Carpetas
*   `/src/components/wizard`: Contiene la lógica del motor de cálculo y los pasos del formulario.
*   `/src/components/planner`: Contiene el núcleo del taller CAD.
*   `/src/components/documentation`: Módulos para la generación de la carpeta técnica.
*   `/src/services`: Capa de abstracción para la interacción con Supabase.
*   `/src/lib`: Reglas de negocio eléctricas y configuración de Supabase.

---

## 2. Mapa de Componentes React
La aplicación se estructura en torno a un flujo de datos centralizado gestionado principalmente a través de rutas y estados locales persistentes.

*   **`App.tsx`**: Orquestador principal. Maneja las rutas, el estado de autenticación y los modales globales (Wizard de Proyecto).
*   **`Dashboard.tsx`**: Centro de control del usuario. Permite listar proyectos, ver estadísticas rápidas y disparar la creación/edición de proyectos.
*   **`ProjectWizard.tsx`**: Componente multi-paso que guía al usuario en el relevamiento de datos.
    *   `WizardStep1_General`: Datos del cliente, tipo de obra, ubicación.
    *   `WizardStep2_Ambientes`: Carga de superficies y bocas por ambiente.
    *   `WizardStep3_Tableros`: Resultados de DPMS y elección de protecciones.
    *   `WizardStep4_Resultados`: Resumen final y acciones (Ir al Taller, Documentación).
*   **`PlannerCanvas.tsx`**: El motor CAD. Gestiona el canvas de Konva, herramientas de dibujo, dualidad de planos (Planta/Unifilar) y exportación a PDF.
*   **`ProjectDocumentation.tsx`**: Interfaz para gestionar la Memoria Descriptiva, Listado de Materiales y Registro Fotográfico.

---

## 3. Mapa del Planner/CAD
El **OVE Taller de Dibujo** es un croquizador vectorial técnico de baja/media precisión.

*   **Librerías:** `konva` y `react-konva`.
*   **Estructura del Canvas:**
    *   **Layer de Fondo:** Soporta la carga de imágenes (Blueprints) que el usuario puede escalar mediante una herramienta de calibración.
    *   **Layer de Dibujo:** Maneja arrays de estados para `walls` (paredes), `pipes` (cañerías), `symbols` (bocas/protecciones) y `auxLines`.
*   **Dual Mode:** Implementa una lógica de `activeMode` ('floorPlan' | 'singleLine'). Cada modo tiene su propio almacén de objetos en un `useRef` para alternar sin perder datos.
*   **Funciones Críticas:**
    *   `handleCalibrateEnd`: Calcula la escala `pixelsPerMeter` basándose en una medida real ingresada por el usuario.
    *   `handleSaveProject`: Empaqueta el estado del dibujo y lo persiste en la columna `drawing_data` de Supabase.
    *   `handleDownloadPDF`: Renderiza el canvas a una imagen y la inserta en un PDF A4 con un rótulo técnico generado en tiempo de ejecución.

---

## 4. Motor de Cálculo Eléctrico
Implementado en `src/lib/electrical-rules.ts`, sigue estrictamente la reglamentación **AEA 90364-7-770**.

*   **Proceso de Cálculo:**
    1.  **Grado de Electrificación:** Determinado automáticamente por la superficie y el destino (Mínimo, Medio, Elevado, Superior).
    2.  **Cálculo de Potencia IUG:** `(Bocas * 60VA) * (2/3)`.
    3.  **Cálculo de Potencia TUG:** 2200 VA por circuito (máx. 15 bocas por circuito).
    4.  **Demanda Máxima de Potencia Simultánea (DPMS):** Aplica coeficientes de simultaneidad según la cantidad de circuitos generales.
    5.  **Potencia Especial (ACU/TUE):** Se suma de forma aritmética a la DPMS general.
    6.  **Dimensionamiento:** Sugiere sección de conductores y calibre de protecciones (PIA y Diferencial) basándose en la corriente de proyecto e Iz (capacidad de carga).
*   **Interacción UI:** Los componentes `WizardStep` consumen la función `calculateProjectDemand` de forma reactiva, actualizando los resultados en tiempo real mientras el usuario carga ambientes.

---

## 5. Flujo de Proyecto (Concepto OVE)
El flujo en el código refleja el documento "Concepto OVE":

1.  **Creación (Draft):** El usuario inicia el Wizard. Los datos se guardan temporalmente en `sessionStorage`.
2.  **Visita Técnica / Presupuesto:** El usuario carga datos reales en el Wizard. Al finalizar, puede guardar el proyecto en la base de datos.
3.  **Trabajo (CAD):** Desde el proyecto, accede al Taller CAD para dibujar el esquema de planta y el tablero unifilar.
4.  **Documentación:** En el módulo de Documentación, se completa la memoria descriptiva y se adjuntan fotos de la obra.
5.  **Cierre:** Generación de PDFs para entrega al cliente o colegio profesional.

---

## 6. Legislación y Normativas (AEA/ERSeP)
*   **AEA 770:** El motor de cálculo utiliza los límites de bocas, superficies y tipos de circuitos definidos en esta norma.
*   **ERSeP (Córdoba):** El sistema incluye campos específicos requeridos para la Certificación de Instalación Eléctrica Apta (CIE), como DNI/CUIT del propietario, nomenclatura catastral y tipología de acometida.

---

## 7. Integración con Supabase
*   **Auth:** Manejado vía `@supabase/supabase-js`. Registro y Login de instaladores.
*   **Database Schema:**
    *   `profiles`: Información profesional del instalador (Logo, Matrícula).
    *   `projects`:
        *   `calculation_data` (JSONB): Valija completa con la configuración, ambientes y resultados del cálculo.
        *   `drawing_data` (JSONB): Objeto complejo con las coordenadas de todos los elementos del CAD para ambos modos.
        *   `documentation_data` (JSONB): Texto de la memoria, listado de materiales y links a fotos.

---

## 8. Auditoría Técnica: Problemas y Alertas
*   **Monolitos de UI:** `PlannerCanvas.tsx` excede las 900 líneas. Se recomienda refactorizar la lógica de dibujo a hooks personalizados.
*   **Falta de Deshacer (Undo):** El CAD no tiene historial de acciones. Un error de borrado es irreversible sin recargar.
*   **Exportación Raster:** El PDF del plano es una imagen insertada. Los textos pequeños pueden perder nitidez en impresiones de alta calidad.
*   **Inconsistencias de Estado:** El cambio entre modo Planta/Unifilar en el CAD depende de una sincronización manual de `refs`, lo cual es propenso a bugs visuales ("objetos fantasma").

---

## 9. Roadmap Recomendado
1.  **Refactor de CAD:** Mover lógica de Konva a componentes pequeños y usar un Store (Zustand) para el estado del plano.
2.  **Módulo de Materiales:** Integrar el listado de materiales con el motor de cálculo para generar cómputos automáticos.
3.  **Mejora de Exportación:** Implementar generación de PDF vectorial o SVG para los planos.
4.  **Soporte Offline:** Implementar Service Workers para permitir la carga de datos en zonas de obra sin conectividad.

---
**Este informe sirve como referencia completa para que un desarrollador o agente externo comprenda la estructura y lógica de OVE de forma inmediata.**
