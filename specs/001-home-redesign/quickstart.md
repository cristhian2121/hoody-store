# Quickstart: Nuevo Home de Personalización

**Branch**: `001-home-redesign`  
**Date**: 2026-02-14  
**Spec**: [spec.md](./spec.md)

## Run locally

```bash
pnpm install
pnpm dev
```

## Quality checks

```bash
npm run lint
npm test
npm run build
```

> Nota: también podés usar `pnpm lint` / `pnpm test` si tu entorno está basado en pnpm, pero los “quality gates” de la constitución se validan con `npm`.

## What to verify (manual)

- Home nuevo se muestra en `/` y permite comenzar a personalizar sin pasos intermedios.
- Selección clara de tipo de prenda (hoodie/camiseta) y color.
- Vista 3D carga y permite drag-to-rotate horizontal fluido.
- Al agregar texto/imagen/AI, el elemento aparece centrado en el pecho.
- Movimiento/redimensionado se limita al área válida de impresión.
- Home legacy sigue accesible en `/home-legacy` y está marcado como deprecated.

## Feature docs

- Plan: [plan.md](./plan.md)
- Research: [research.md](./research.md)
- Data model: [data-model.md](./data-model.md)
- API contracts (opcional): [`contracts/openapi.yaml`](./contracts/openapi.yaml)

