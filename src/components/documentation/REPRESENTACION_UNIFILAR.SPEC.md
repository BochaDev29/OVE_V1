# ESPECIFICACIÓN MAESTRA: ESQUEMA UNIFILAR (OVE V1)

> **Objetivo:** Generar el diagrama de árbol de potencias y protecciones.
> **Fuente de Datos:** Objeto `circuitInventory` y configuración de Tableros del Wizard.

## 1. ESTRUCTURA VISUAL (ARBOL)
El PDF debe dibujar líneas y símbolos estándar (IEC) conectando:
`Red (Medidor)` -> `Tablero Principal` -> `Tableros Seccionales` -> `Circuitos`.

## 2. COMPONENTES Y ETIQUETAS (LABELS)
Cada símbolo debe tener sus datos técnicos al lado (Data Binding directo del motor de cálculo).

### A. Acometida y Medición
- Símbolo de Medidor (kWh).
- Línea Principal: Cable `{{MAIN_CABLE_SECTION}}` mm².
- Fusible aéreo o Protección de cabecera (Si aplica).

### B. Tablero Principal (TP)
- **Interruptor de Cabecera:**
  - Símbolo: Interruptor Termomagnético.
  - Etiqueta: `{{MAIN_BREAKER_AMP}}`A (Curva C) - Icc `{{ICC_VALUE}}`kA.
- **Diferencial (OBLIGATORIO):**
  - Símbolo: Interruptor Diferencial.
  - Etiqueta: In `{{DIFF_AMP}}`A - Sensibilidad 30mA (0.03A) - Clase AC/A.
- **Puesta a Tierra:**
  - Dibujar línea de PE conectada a la barra de tierra.

### C. Circuitos de Salida (Iterativo)
Por cada circuito en el inventario, dibujar una rama con:
- Símbolo de la Protección (PIA).
- Etiqueta de la Protección: `{{CIRCUIT_BREAKER}}`A.
- Etiqueta del Cable: `{{CIRCUIT_CABLE}}` mm² + PE.
- Nombre del Circuito: (Ej: "IUG-1 Dormitorio").

## 3. TABLA DE CARGAS (BALANCE)
Al pie del diagrama, insertar una tabla resumen:
| Circuito | Fase | Destino | Bocas | I. Proyecto (Ib) | Protección (In) | Cable (Iz) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| C1 | R | Iluminación | 8 | 2.5 A | 10 A | 15 A |
*Esta tabla es fundamental para validar la coordinación (Ib <= In <= Iz).*

## 4. RÓTULO
Idéntico al del Plano de Planta, pero en el campo "Plano" debe decir: "ESQUEMA UNIFILAR Y TABLA DE POTENCIAS".
