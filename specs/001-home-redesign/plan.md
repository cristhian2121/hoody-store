# Implementation Plan: Nuevo Home de Personalización

**Branch**: `[001-home-redesign]` | **Date**: 2026-02-14 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-home-redesign/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Reemplazar el Home actual por un nuevo Home centrado en personalización inmediata (hoodie/camiseta), con UI moderna alineada a la referencia y una previsualización 3D rotatoria. Mantener el Home anterior funcional pero marcado como deprecated y fuera del flujo principal.

Enfoque técnico (alto nivel):
- Nuevo `Index` orientado a conversión con layout tipo “panel de controles + vista principal”.
- Integración 3D en la UI para prenda (hoodie/camiseta) con drag-to-rotate horizontal fluido.
- Personalización (texto/imagen/AI) aplicada por defecto al centro del pecho, editable y limitada por un “print area” por prenda.
- Ruta alternativa para acceder al Home legacy sin romper compatibilidad.

Artefactos generados por este plan:
- Phase 0 (research): [research.md](./research.md)
- Phase 1 (design): [data-model.md](./data-model.md), [quickstart.md](./quickstart.md), [`contracts/openapi.yaml`](./contracts/openapi.yaml)

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.8.x (Vite + React)  
**Primary Dependencies**: React 18, React Router, TailwindCSS, shadcn/ui, Framer Motion, TanStack Query  
**Storage**: N/A (estado de UI en memoria; persistencia opcional vía navegador si se decide)  
**Testing**: Vitest + Testing Library  
**Target Platform**: Web (desktop + mobile modernos)  
**Project Type**: Web application (single frontend en `src/`)  
**Performance Goals**: Interacción de rotación 3D estable a ~60fps en hardware moderno; primera interacción de personalización en <30s (métrica de producto)  
**Constraints**:
- Mantener tema/colores actuales (no rediseño de branding)
- UI pixel-perfect respecto a referencia para layout/espaciados/jerarquía (excepto el modelo 3D)
- Rotación solo eje horizontal (yaw), sin flips inesperados
**Scale/Scope**: 1 pantalla principal (`/`) + acceso a Home legacy; cambios localizados a componentes de personalización y render

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Este feature debe cumplir la constitución ratificada en `.specify/memory/constitution.md` (Kame Hoody Constitution v1.0.0).

### Pre-Research Gate (must-pass)

- **Premium UX / reuse UI primitives**: Se reutilizan componentes de `src/components/ui/*` y se evitan primitives disruptivos (sin `alert`/`confirm`; feedback con toasts + validación inline).
- **Type-safe domain model**: Los tipos canónicos se importan desde `src/lib/types.ts` (sin duplicación en páginas).
- **Routing estable**: Se mantiene el contrato de rutas existente (`/`, `/categoria/:category`, `/producto/:slug`, `/checkout`). El Home legacy se expone por **ruta adicional no-breaking** (p. ej. `/home-legacy`) y se actualizan links/tests si aplica.
- **i18n obligatorio**: Todo texto visible al usuario usa `t(...)` o data ya localizada; ES default y EN feature-complete.
- **Estado explícito y mínimo**: Estado global sigue en Providers existentes; evitar persistencia extra salvo necesidad clara (sin PII en storage/logs).
- **Personalización segura/performance-aware**: Validación de archivos (tipo/tamaño), resize/compresión donde aplique, contenido no confiable (sin render inseguro), y “AI” sin servicios externos (placeholder o API explícita).
- **Styling/theming**: Tailwind + variables del tema; evitar colores hardcode si existe token/variable.
- **Quality gates**: Debe pasar `npm run lint`, `npm test`, `npm run build`. Cambios de personalización requieren tests en `src/test/`.

### Post-Design Re-check (after Phase 1)

- Gates siguen pasando con el diseño propuesto en `research.md` y `data-model.md`.
- No se introducen dependencias de infraestructura (solo dependencias de UI/3D en el frontend).

## Project Structure

### Documentation (this feature)

```text
specs/001-home-redesign/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── pages/
│   └── Index.tsx                 # Home actual (a deprecar)
├── components/
│   ├── PersonalizationEditor.tsx # Editor 2D existente (a extender para print-area)
│   └── ...                       # Componentes UI
├── lib/
│   ├── products.ts               # Catálogo (hoodies/camisetas)
│   └── types.ts                  # Tipos de personalización
└── test/                         # Tests (Vitest)
```

**Structure Decision**: Frontend único en `src/` con páginas en `src/pages/` y componentes en `src/components/`. El nuevo Home se implementará como página en `src/pages/` (reemplazando `/`) y el Home legacy quedará como página accesible por ruta alternativa.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No aplica: no se agregan proyectos nuevos ni patrones estructurales que requieran justificación.
