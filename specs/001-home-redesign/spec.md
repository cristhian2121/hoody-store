# Feature Specification: Nuevo Home de Personalización

**Feature Branch**: `[001-home-redesign]`  
**Created**: 2026-02-14  
**Status**: Draft  
**Input**: User description: "Crear un nuevo Home para la aplicación, manteniendo el Home actual pero marcándolo como deprecated. El nuevo Home debe ser más práctico, moderno y alineado visualmente con la imagen de referencia. Enfocado en personalización inmediata (hoodie/camiseta) sin pasos intermedios."

## Visual Reference

- Referencia principal de layout/jerarquía visual: [`assets/home-reference.png`](./assets/home-reference.png)
- Regla: mantener el tema/colores actuales del sistema; la referencia guía principalmente estructura, espaciados, alineaciones y jerarquía tipográfica.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Personalizar inmediatamente al ingresar (Priority: P1)

Como usuario que ingresa a la aplicación, quiero poder empezar a personalizar una prenda de inmediato (sin pasos intermedios), para llegar rápido a un diseño listo para comprar.

**Why this priority**: Reduce fricción inicial y maximiza intención de compra desde el primer momento.

**Independent Test**: Se puede probar únicamente desde el Home: al ingresar, el usuario logra aplicar una personalización visible en la prenda y ajustar su posición/tamaño dentro del área válida.

**Acceptance Scenarios**:

1. **Given** que el usuario entra al Home, **When** visualiza la pantalla inicial, **Then** ve el configurador con selección de prenda (hoodie/camiseta), selección de color y una previsualización principal.
2. **Given** que el usuario elige tipo de prenda y color, **When** agrega un texto, sube una imagen o genera un diseño asistido por IA, **Then** la personalización aparece automáticamente centrada en el pecho.
3. **Given** que existe una personalización aplicada, **When** el usuario la mueve o redimensiona, **Then** el sistema limita el movimiento/tamaño para que no salga del área válida de impresión.

---

### User Story 2 - Previsualización 3D fluida y realista (Priority: P2)

Como usuario, quiero ver la prenda en una vista 3D con rotación por arrastre, para previsualizar el diseño desde distintos ángulos de manera natural.

**Why this priority**: La previsualización clara aumenta confianza y reduce incertidumbre antes de comprar.

**Independent Test**: Sin completar compra, se puede validar en Home que la vista 3D carga, se puede rotar con drag-to-rotate y mantiene iluminación/materiales consistentes.

**Acceptance Scenarios**:

1. **Given** que el Home está cargado, **When** el usuario arrastra sobre la vista 3D en forma horizontal (izquierda/derecha), **Then** la prenda rota suavemente manteniéndose “derecha” (sin volteos o giros inesperados).
2. **Given** que el usuario aplica una personalización, **When** rota la prenda, **Then** la personalización se mantiene adherida y consistente con la superficie del pecho.

---

### User Story 3 - Mantener Home anterior como deprecated (Priority: P3)

Como equipo de producto/QA, quiero conservar el Home actual funcionando pero marcado como “deprecated” y fuera del flujo principal, para no romper accesos existentes y permitir comparación/rollback.

**Why this priority**: Reduce riesgo de regresiones, facilita validación progresiva y mitigación.

**Independent Test**: Con la nueva experiencia como predeterminada, se valida que el Home previo sigue siendo accesible de forma directa y funcional, pero no aparece como entrada principal.

**Acceptance Scenarios**:

1. **Given** que el usuario navega normalmente, **When** ingresa al Home, **Then** ve el nuevo Home como experiencia predeterminada.
2. **Given** que existe un acceso directo al Home anterior, **When** el usuario lo visita, **Then** el Home anterior funciona y se muestra marcado como deprecated (sin promoverse como opción principal).

---

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- Si la vista 3D no puede inicializarse (p. ej., el dispositivo/navegador no lo soporta), el usuario sigue pudiendo personalizar con una previsualización alternativa y un mensaje claro.
- Si el usuario intenta arrastrar/redimensionar la personalización fuera del área válida de impresión, el sistema evita el movimiento y mantiene el elemento dentro de los límites.
- Si el usuario sube un archivo inválido (tipo no permitido o demasiado grande), se muestra un error accionable y no se bloquea el resto del flujo.
- Si la generación asistida por IA falla o demora, el usuario puede reintentar o continuar usando texto/imagen sin perder su progreso.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: El sistema MUST mostrar un nuevo Home como experiencia predeterminada, enfocado en personalización inmediata de productos.
- **FR-002**: El sistema MUST mantener el Home actual funcional, pero marcado como deprecated y fuera del flujo principal (no promovido como entrada principal).
- **FR-003**: El sistema MUST permitir elegir claramente y de forma visual entre tipo de producto “hoodie” y “camiseta”.
- **FR-004**: El sistema MUST permitir seleccionar el color de la prenda antes o durante la personalización.
- **FR-005**: El sistema MUST presentar una previsualización principal de la prenda en 3D que pueda rotarse con drag-to-rotate y se sienta fluida y natural.
- **FR-006**: El sistema MUST mantener una iluminación y materiales que transmitan realismo y consistencia visual entre estados (tipo/color de prenda).
- **FR-007**: Cuando el usuario agrega texto, sube una imagen o genera un diseño asistido por IA, el sistema MUST posicionar automáticamente el resultado centrado en el pecho.
- **FR-008**: El usuario MUST poder mover y redimensionar la personalización aplicada.
- **FR-009**: El sistema MUST restringir movimiento y redimensionado para que la personalización no salga del área válida de impresión, definida por:
  - desde el cuello hacia abajo;
  - desde encima del bolsillo hacia arriba (si la prenda lo incluye);
  - límites laterales coherentes con el pecho.
- **FR-010**: El nuevo Home MUST mantener los colores y tema visual actuales del sistema, y a la vez alinear layout/jerarquía tipográfica/espaciados con la imagen de referencia provista (pixel-perfect), exceptuando el modelo 3D en sí.
- **FR-011**: El flujo MUST tener mínima fricción: el usuario puede comenzar a personalizar apenas ingresa, sin pantallas intermedias ni configuraciones obligatorias adicionales.
- **FR-012**: El sistema MUST incluir una llamada a la acción principal orientada a conversión (p. ej., “Personalizar y comprar”) visible y clara durante el proceso.
- **FR-013**: El sistema MUST ser bilingüe (ES por defecto y EN feature-complete) para todo texto visible al usuario en el nuevo Home.
- **FR-014**: El sistema MUST comunicar errores y confirmaciones sin interrumpir el flujo (sin diálogos bloqueantes), y con mensajes accionables.
- **FR-015**: Al subir una imagen, el sistema MUST validar tamaño y tipo de archivo permitido, y manejar contenido como no confiable (sin ejecución/render inseguro).
- **FR-016**: El nuevo Home MUST cumplir con accesibilidad básica: labels/roles donde aplique, navegación por teclado razonable y sin trampas de foco.

### Traceability (Stories ↔ Requirements)

- **User Story 1** cubre: FR-001, FR-003, FR-004, FR-007, FR-008, FR-009, FR-011
- **User Story 2** cubre: FR-005, FR-006
- **User Story 3** cubre: FR-002
- **Criterio visual y conversión** cubre: FR-010, FR-012
- **i18n/errores/accesibilidad/seguridad** cubre: FR-013, FR-014, FR-015, FR-016

### Key Entities *(include if feature involves data)*

- **ProductType**: Tipo de producto personalizable (hoodie o camiseta).
- **GarmentColor**: Color seleccionable de la prenda para previsualización y personalización.
- **PersonalizationAsset**: Elemento aplicable a la prenda (texto, imagen subida, diseño asistido por IA) con atributos de posición, escala y rotación (si aplica).
- **PrintArea**: Área válida de impresión en el pecho, con límites superiores/inferiores/laterales.
- **DeprecatedHomeAccess**: Mecanismo de acceso al Home anterior (para compatibilidad/QA), con señalización visible de estado deprecated.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Al menos 90% de los usuarios pueden iniciar la personalización (aplicar texto/imagen/diseño asistido por IA) en menos de 30 segundos desde que entran al Home.
- **SC-002**: Al menos 95% de los usuarios pueden completar la tarea “aplicar y ajustar una personalización dentro del área válida” sin necesitar ayuda.
- **SC-003**: La interacción de rotación 3D se percibe fluida (sin saltos perceptibles) y es utilizable en dispositivos de escritorio y móviles modernos.
- **SC-004**: El nuevo Home mantiene consistencia visual pixel-perfect con la imagen de referencia en layout, márgenes, alineaciones, jerarquía tipográfica y colores (con excepción explícita del modelo 3D).

## Assumptions

- La aplicación ya soporta personalizaciones de tipo texto e imagen, y cuenta con una opción de generación asistida por IA (o equivalente) que retorna un resultado aplicable como diseño.
- Existen al menos dos tipos de producto personalizable disponibles: hoodie y camiseta.
- Para cada tipo de producto, existe una paleta de colores seleccionables que el usuario puede aplicar.
- El Home anterior tiene un acceso conocido (p. ej., por URL directa o navegación interna de QA) que debe seguir funcionando.

## Dependencies & Constraints

- Disponibilidad de modelos 3D de hoodie y camiseta con materiales/iluminación consistentes.
- Definición clara del “área válida de impresión” por tipo de prenda (incluyendo el caso con bolsillo).
- Métrica/telemetría disponible para medir los criterios de éxito definidos (tiempo a primera interacción, finalización de tarea, etc.).

## Out of Scope

- Cambios al proceso de checkout/pago.
- Agregar nuevos tipos de prenda más allá de hoodie y camiseta.
- Herramientas avanzadas de edición (capas múltiples complejas, efectos, plantillas) más allá de mover/redimensionar y limitar al área de impresión.
