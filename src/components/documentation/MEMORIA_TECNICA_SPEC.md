# ESPECIFICACIÓN MAESTRA: GENERADOR DE MEMORIA TÉCNICA (OVE V1)

> **Rol del Agente:** Actuar como Ingeniero de Documentación.
> **Objetivo:** Generar el PDF "Memoria Técnica" fusionando datos del Wizard con una narrativa profesional estandarizada.
> **Estrategia:** "Estructura Rígida, Contenido Dinámico". El usuario NO redacta libremente; el sistema ensambla el texto usando
 selectores y variables calculadas.

---

## 1. REGLAS DE LOCALIZACIÓN (EL SWITCH JURISDICCIONAL)

El documento debe adaptar su Título y Marco Legal según la provincia del usuario.

**Variable de Control:** `user.province`

| Zona | Título del Documento | Subtítulo / Marco Legal |
| :--- | :--- | :--- |
| **CÓRDOBA** | **CERTIFICADO DE INSTALACIÓN ELÉCTRICA APTA** | "Ley Provincial de Seguridad Eléctrica Nº 10.281" |
| **RESTO PAÍS** | **MEMORIA TÉCNICA DESCRIPTIVA** | "Reglamentación AEA 90364 - Sección 770/771" |

---

## 2. ESTRUCTURA DE SECCIONES (LAYOUT)

El PDF debe generarse siguiendo estrictamente este orden de bloques.

### BLOQUE A: ENCABEZADO Y DATOS DEL PROYECTO
**Formato:** Tabla o Grilla clara.
- **Datos:**
  - Solicitante: `{{CLIENT_NAME}}`
  - Ubicación: `{{PROJECT_ADDRESS}}` - `{{PROJECT_CITY}}`
  - Destino: `{{DESTINATION_TYPE}}` (Vivienda / Local / Industria)
  - Superficie: `{{SURFACE_M2}}` m²
- **Identificación del Profesional:** Nombre, Matrícula, Email (Footer o Header).

### BLOQUE B: OBJETO (Narrativa Híbrida)
Este párrafo cambia según si la obra es Nueva o Existente.

*   **Si `estadoObra == 'nueva'`:**
    > "El objeto de la presente es describir las características técnicas del proyecto y ejecución de la instalación eléctrica destinada a **{{DESTINATION_TYPE}}**, propiedad del Sr./Sra. **{{CLIENT_NAME}}**."

*   **Si `estadoObra == 'existente'`:**
    > "El objeto de la presente es describir el relevamiento y verificación de las condiciones de seguridad de la instalación existente, a los fines de su regularización conforme a la normativa vigente."

### BLOQUE C: SÍNTESIS DEL PROYECTO (Datos Duros)
Esta sección es OBLIGATORIA por norma AEA. Debe ser una tabla generada por el motor.

| Parámetro | Valor (Variable) |
| :--- | :--- |
| Grado de Electrificación | **{{ELECTRIFICATION_GRADE}}** |
| Demanda de Potencia (DPMS) | **{{TOTAL_KVA}}** kVA |
| Tensión de Suministro | **{{VOLTAGE}}** (220V / 380V) |
| Esquema de Conexión a Tierra | **TT** (Valor fijo por defecto) |
| Corriente de Cortocircuito (Icc) | **3000 A** (o valor configurado) |

---

### BLOQUE D: DESCRIPCIÓN TÉCNICA (Inyección de Variables + Notas)

Aquí se aplica el "Estilo Celsius". Usa frases pre-armadas e inyecta los valores del Wizard y las Notas del usuario.

#### 1. Acometida y Medición
> "El Punto de Conexión y Medición es del tipo **{{ACOMETIDA_TYPE}}** (Ej: Aéreo/Subterráneo), ejecutado en **{{ACOMETIDA_MATERIAL}}** con configuración de Doble Aislación (Clase II), conforme a los requerimientos de la Distribuidora local y la reglamentación vigente."
> *Inyección de Nota:* `{{USER_NOTE_ACOMETIDA}}`

#### 2. Tablero Principal y Seccionales
> "La instalación cuenta con un Tablero Principal de material aislante, grado de protección IP **{{IP_RATING}}**, ubicado en **{{TP_LOCATION}}**. Los dispositivos de maniobra y protección se encuentran instalados sobre riel DIN, garantizando la protección contra contactos accidentales."
> *Inyección de Nota:* `{{USER_NOTE_PANELS}}`

#### 3. Puesta a Tierra (PAT)
> "Se ha ejecutado/verificado un sistema de puesta a tierra de protección compuesto por jabalina cilíndrica de acero-cobre (IRAM 2309) y conductor de protección bicolor (verde-amarillo) que recorre toda la instalación, asegurando la equipotencialidad de las masas."

#### 4. Distribución y Circuitos (Iterador)
Generar una lista narrativa basada en `circuitInventory`:
*   "El sistema se distribuye en los siguientes circuitos terminales:"
    *   **Circuito {{ID}}:** Destinado a **{{USAGE}}** (Ej: Iluminación). Cable de **{{CABLE_MM}}** mm². Protección Termomagnética de **{{BREAKER_AMP}}** A. *{{USER_NOTE_CIRCUIT}}*
    *   *(Repetir para cada circuito)*

---

### BLOQUE E: ESPECIFICACIONES DE MATERIALES (Texto Legal Fijo)

**IMPORTANTE:** Este texto debe ser estático (Hardcoded). NO permitir edición del usuario para garantizar protección legal.

> **Cumplimiento Normativo:**
> Todos los materiales utilizados responden a las normas IRAM correspondientes y cuentan con Sello de Seguridad Eléctrica (Res. SC 169/2018):
> *   **Conductores:** IRAM NM 247-3 (No propagantes de llama).
> *   **Canalizaciones:** IRAM 62386 / IEC 61386 (Ignífugos).
> *   **Protecciones:** IEC 60898 (Termomagnéticas) e IEC 61008 (Diferenciales).
> *   **Tableros:** IRAM 62670 / IEC 60670.

---

### BLOQUE F: DISCLAIMER (Responsabilidad)

> "Este documento ha sido generado mediante el software OVE (Oficina Virtual Eléctrica) en base a los datos suministrados por el usuario. La verificación física de la obra, la dirección técnica y la veracidad de los datos declarados son responsabilidad exclusiva del Instalador Habilitado firmante."

---

## 3. INSTRUCCIONES DE IMPLEMENTACIÓN

1.  **Mapeo de Datos:** Asegurar que `projectConfig`, `calculationResults` y `circuitInventory` estén disponibles en el componente `DocMemoria.tsx`.
2.  **Renderizado Condicional:** Utilizar ternarios `isCordoba ? ... : ...` para los títulos.
3.  **Manejo de Vacíos:** Si una variable como `{{USER_NOTE}}` está vacía, no imprimir nada (ni espacio en blanco).
4.  **Estilo Visual:** Utilizar fuente tipo *Roboto* o *Helvetica*, tamaño 10pt para cuerpo, 12pt para títulos. Encabezado y Pie de página en todas las hojas.
