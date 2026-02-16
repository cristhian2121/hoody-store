# Tasks: Nuevo Home de Personalización

**Input**: Design documents from `/specs/001-home-redesign/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`  
**Branch**: `001-home-redesign`

**Notes (constitution alignment)**:
- Mantener rutas estables: `/` sigue siendo Home. El Home legacy se expone por ruta adicional no-breaking.
- i18n ES/EN obligatorio para todo texto visible al usuario.
- Evitar `alert`/`confirm`: usar toasts (`sonner`) e inline validation.
- Cambios de personalización → agregar/actualizar tests en `src/test/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar base técnica para el nuevo Home + 3D + personalización segura.

- [x] T001 Revisar y documentar el punto de entrada del Home actual en `src/pages/Index.tsx` y sus links en `src/App.tsx`
- [x] T002 Definir la ruta de Home legacy (p. ej. `/home-legacy`) en `src/App.tsx` y preparar stub de página en `src/pages/HomeLegacy.tsx`
- [x] T003 [P] Agregar dependencias 3D (`three`, `@react-three/fiber`, `@react-three/drei`) en `package.json`
- [x] T004 [P] Crear skeleton del nuevo Home en `src/pages/Home.tsx` (sin reemplazar rutas aún)
- [x] T005 [P] Agregar claves i18n ES/EN para el nuevo Home en `src/lib/i18n.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tipos, utilidades y límites de impresión (print area) centralizados + tests base.

**⚠️ CRITICAL**: No empezar US1/US2/US3 sin completar esta fase.

- [x] T006 Crear utilidades de “print area” (por prenda y lado) en `src/lib/printArea.ts`
- [x] T007 Extender el modelo canónico de personalización si hace falta (sin duplicar tipos) en `src/lib/types.ts`
- [x] T008 Implementar clamp de bounding box a print area (move/resize) en `src/lib/printArea.ts`
- [x] T009 [P] Crear tests unitarios para clamp/centrado en `src/test/printArea.test.ts`
- [x] T010 Reemplazar `alert(...)` por toasts + mensajes i18n en `src/components/PersonalizationEditor.tsx`

**Checkpoint**: Print area + clamp + feedback no-bloqueante listos.

---

## Phase 3: User Story 1 - Personalizar inmediatamente al ingresar (Priority: P1) 🎯 MVP

**Goal**: En `/`, el usuario elige hoodie/camiseta + color y puede aplicar texto/imagen/AI inmediatamente, con auto-centrado y límites de impresión.

**Independent Test**: Entrar a `/` → seleccionar prenda y color → agregar texto/imagen/AI → aparece centrado → mover/redimensionar no sale del área válida → CTA visible.

### Implementation for User Story 1

- [x] T011 [US1] Implementar el layout del nuevo Home (panel controles + vista principal) en `src/pages/Home.tsx`
- [x] T012 [US1] Implementar selector visual de tipo de prenda (hoodie/camiseta) en `src/pages/Home.tsx`
- [x] T013 [US1] Implementar selector de color de prenda (paleta) en `src/pages/Home.tsx`
- [x] T014 [US1] Integrar el editor de personalización (texto/imagen/AI) embebido en Home en `src/pages/Home.tsx`
- [x] T015 [US1] Auto-centrar nuevos assets al centro del print area en `src/components/PersonalizationEditor.tsx`
- [x] T016 [US1] Clamp de drag/move dentro de print area en `src/components/PersonalizationEditor.tsx`
- [x] T017 [US1] Clamp de resize/scale dentro de print area en `src/components/PersonalizationEditor.tsx`
- [x] T018 [US1] Asegurar que todo texto visible del Home use `t(...)` en `src/pages/Home.tsx` y claves en `src/lib/i18n.tsx`
- [x] T019 [US1] Añadir CTA principal (p. ej. “Personalizar y comprar”) con accesibilidad básica en `src/pages/Home.tsx`

### Tests for User Story 1 (required by constitution due to personalization behavior change)

- [x] T020 [P] [US1] Agregar tests de comportamiento de editor (clamp + centrado) en `src/test/personalizationEditor.test.tsx`

**Checkpoint**: US1 funcional y testeable independientemente en `/` (sin 3D aún).

---

## Phase 4: User Story 2 - Previsualización 3D fluida y realista (Priority: P2)

**Goal**: Vista 3D en Home con rotación por arrastre horizontal, iluminación consistente y personalización “adherida” al pecho.

**Independent Test**: En `/` → vista 3D carga para hoodie/camiseta → drag horizontal rota suave sin flips → al cambiar color/tipo se actualiza → personalización se ve en el pecho.

- [x] T021 [US2] Crear componente de visor 3D (carga de modelo + escena + luces) en `src/components/garment3d/GarmentViewer3D.tsx`
- [x] T022 [P] [US2] Definir mapping de assets (hoodie/camiseta) en `src/components/garment3d/models.ts`
- [x] T023 [P] [US2] Agregar placeholders/referencias de modelos 3D (glTF) en `src/assets/models/` (sin binaries en git si no corresponde; documentar ruta final en `src/components/garment3d/models.ts`)
- [x] T024 [US2] Implementar interacción drag-to-rotate horizontal en `src/components/garment3d/useDragRotate.ts`
- [x] T025 [US2] Implementar canvas→texture para personalización en `src/components/garment3d/usePersonalizationTexture.ts`
- [x] T026 [US2] Integrar `GarmentViewer3D` en el nuevo Home en `src/pages/Home.tsx`
- [x] T027 [US2] Implementar fallback si 3D no inicializa (sin bloquear personalización) en `src/pages/Home.tsx`

---

## Phase 5: User Story 3 - Mantener Home anterior como deprecated (Priority: P3)

**Goal**: Mantener Home legacy funcional, pero fuera del flujo principal y marcado como deprecated.

**Independent Test**: `/` muestra Home nuevo. `/home-legacy` (o la ruta definida) muestra Home anterior funcionando y señalizado deprecated.

- [x] T028 [US3] Extraer el Home actual de `src/pages/Index.tsx` a `src/pages/HomeLegacy.tsx` manteniendo funcionalidad
- [x] T029 [US3] Actualizar ruta `/` para usar `Home` (nuevo) y exponer `HomeLegacy` en ruta dedicada en `src/App.tsx`
- [x] T030 [US3] Agregar señalización de deprecated (banner discreto + copy i18n) en `src/pages/HomeLegacy.tsx`
- [x] T031 [US3] Actualizar links internos que apunten a Home (si aplica) en `src/components/Layout.tsx` y `src/pages/*`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Calidad, performance, accesibilidad, coherencia visual pixel-perfect y gates.

- [x] T032 [P] Refinar pixel-perfect (márgenes, tipografía, jerarquía) del nuevo Home según `specs/001-home-redesign/assets/home-reference.png` en `src/pages/Home.tsx`
- [x] T033 [P] Revisar accesibilidad básica (labels, aria, foco, teclado) en `src/pages/Home.tsx` y `src/components/PersonalizationEditor.tsx`
- [x] T034 Optimizar performance de 3D y textura (evitar re-renderes innecesarios) en `src/components/garment3d/*`
- [x] T035 Validar que no se persista PII ni datos sensibles (especialmente en `localStorage`) en `src/lib/cart.ts` y flujos tocados
- [x] T036 Ejecutar quality gates y corregir fallos: `npm run lint`, `npm test`, `npm run build` (repo root)
- [x] T037 Actualizar documentación rápida si cambió la ruta legacy/operativa en `specs/001-home-redesign/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** → **Phase 2 (Foundational)** → **US1 (MVP)** → **US2** → **US3** → **Polish**

### User Story Dependencies

- **US1** depende de: Phase 2 (print area + clamp + feedback sin `alert`)
- **US2** depende de: US1 (necesita estado de personalización y selección prenda/color)
- **US3** depende de: Setup (ruta legacy definida) pero se recomienda después de US1 para evitar churn

## Parallel Opportunities

- En Phase 1: T003/T004/T005 pueden correr en paralelo.
- En Phase 2: T006/T007/T008/T009 en paralelo parcial (T009 depende de T008).
- En US2: T022 y T024 pueden avanzar en paralelo; T026 depende de T021/T024.

