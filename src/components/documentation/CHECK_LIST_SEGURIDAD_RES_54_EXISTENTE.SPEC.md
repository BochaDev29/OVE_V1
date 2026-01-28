# ESPECIFICACIÓN MAESTRA: CHECKLIST DE SEGURIDAD / RES. 54 (OVE V1)

> **Rol del Agente:** Actuar como Auditor de Seguridad y Generador Legal.
> **Objetivo:** Generar el PDF de "Declaración Jurada de Seguridad".
> **Fuente de Datos:** Componente `DocChecklist.tsx` (Estado de los 11 checkboxes + Valor de PAT).

---

## 1. CABECERA INTELIGENTE (Polimorfismo Regional)

**Variable de Control:** `user.province`

| Zona | Título Principal | Subtítulo Legal |
| :--- | :--- | :--- |
| **CÓRDOBA** | **ACREDITACIÓN DE INSTALACIÓN EXISTENTE** | "Declaración Jurada conforme Resolución General ERSeP Nº 54/2018" |
| **NACIONAL** | **INFORME DE AUDITORÍA Y DIAGNÓSTICO** | "Verificación de Condiciones Mínimas de Seguridad - AEA 90364" |

---

## 2. DATOS DEL SUMINISTRO (Bloque Informativo)

Tabla simple con los datos fijos del inmueble (igual a la Memoria Técnica):
*   **Titular:** `{{CLIENT_NAME}}`
*   **Ubicación:** `{{PROJECT_ADDRESS}}`
*   **Destino:** `{{DESTINATION_TYPE}}`
*   **Fecha de Relevamiento:** `{{DATE}}`

---

## 3. GRILLA DE VERIFICACIÓN (El Corazón del Documento)

Esta sección debe renderizarse como una **Tabla de Auditoría**.
Debe contener las 10 exigencias textuales de la **Resolución 54/2018** (Fuente oficial ERSeP).

**Estructura de Columnas:**
[ ITEM # ] | [ CONDICIÓN A VERIFICAR ] | [ CUMPLE (SI/NO) ] | [ OBSERVACIÓN ]

**Filas Obligatorias (Texto Legal Fijo):**

1.  **Tablero Principal:** ¿Posee Doble Aislación (Clase II) y tapa contratapa?
2.  **Grado IP:** ¿El grado de protección es adecuado al ambiente (IP)?
3.  **Protección Directa:** ¿Están inaccesibles todas las partes bajo tensión (sin cables pelados/bornes expuestos)?
4.  **Puesta a Tierra (PAT):** ¿Existe sistema de PAT completo (Jabalina + Conductor PE)?
5.  **Continuidad:** ¿Están todas las masas metálicas conectadas a tierra?
6.  **Protección de Circuitos:** ¿Posee interruptores termomagnéticos (PIA) bipolares en todos los circuitos?
7.  **Protección Diferencial:** ¿Posee Interruptor Diferencial de $\le$ 30mA operativo?
8.  **Fusibles:** ¿Se verificó la **inexistencia** de fusibles en el Tablero Principal?
9.  **Materiales:** ¿Los materiales visibles poseen sello de Seguridad Eléctrica "S" / Normas IRAM?
10. **Tomacorrientes:** ¿Son todos de 3 patas planas (IRAM 2071) y las bocas están cerradas?

**Lógica de Renderizado:**
*   Si el usuario marcó `TRUE` en la App $\rightarrow$ Imprimir "SÍ" con un check (☑).
*   Si el usuario marcó `FALSE` $\rightarrow$ Imprimir "NO" (☒).

---

## 4. MEDICIONES ELÉCTRICAS (Evidencia Dura)

Justo debajo de la grilla, debe haber un recuadro destacado con los valores medidos.

> **MEDICIÓN DE PUESTA A TIERRA**
> *   Instrumento utilizado: Telurómetro / Pinza.
> *   Valor de Resistencia de Dispersión: **`{{PAT_VALUE}}` Ohm**.
> *   Estado: **[ APTO / NO APTO ]** (Apto si Valor $\le$ 40 Ohm).

> **PRUEBA DE DIFERENCIAL**
> *   Prueba de disparo mecánico (Test): **[ OK / FALLA ]**

---

## 5. DICTAMEN FINAL (Automático)

El sistema debe imprimir una conclusión basada en la lógica booleana:
`IF (Todos_Checkboxes == TRUE) AND (PAT <= 40 Ohm)`:

> **CONCLUSIÓN: INSTALACIÓN APTA**
> La instalación CUMPLE con las condiciones mínimas de seguridad exigidas para la reanudación/habilitación del servicio.

`ELSE`:

> **CONCLUSIÓN: NO APTA - REQUIERE ADECUACIÓN**
> La instalación NO CUMPLE con los requisitos de seguridad. Se requiere subsanar los puntos marcados como "NO" antes de solicitar el servicio.

---

## 6. FIRMA Y DECLARACIÓN

Texto legal de cierre (Obligatorio):
> "El Instalador Electricista Habilitado declara bajo juramento que los datos consignados son veraces y surgen de la inspección ocular y mediciones realizadas in-situ, asumiendo la responsabilidad técnica, civil y penal correspondiente."

*   Firma del Matriculado: __________________________
*   Firma del Usuario (Conformidad): __________________
¿Por qué esta estructura?
1. Blindaje Normativo: Los 10 puntos del "Bloque 3" son copia fiel de los requisitos que figuran en el Manual del Instalador. Si falta uno, el ERSeP te rebota el trámite.
2. Valor de la Medición: Al incluir el recuadro de "Medición de PAT" (Puesta a Tierra), diferencias tu documento de un simple papel. Estás mostrando datos de ingeniería.
3. Doble Uso:
    ◦ Para el ERSeP, esto es el documento legal obligatorio para "Existentes".
    ◦ Para un cliente en Buenos Aires, esto es un "Informe de Estado" que justifica por qué el electricista le tiene que cobrar una reparación ("Mire, señora, su casa dio NO APTA en el punto 7, no tiene Diferencial").
    