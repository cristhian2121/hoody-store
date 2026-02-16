# Research: Nuevo Home de Personalización

**Branch**: `001-home-redesign`  
**Date**: 2026-02-14  
**Spec**: [spec.md](./spec.md)

## Decisions

### Decision 1: Integración 3D en React

- **Decision**: Usar `three` como motor 3D y una integración declarativa con React (wrapper) para simplificar composición de escena, lifecycle y estado.
- **Rationale**: El repo ya es React + TypeScript; una integración declarativa reduce código imperativo, facilita re-render seguro y hace más fácil la separación `UI controls` vs `3D view`.
- **Alternatives considered**:
  - Three.js “puro” (imperativo) dentro de un componente: más control, pero mayor complejidad de lifecycle y de sincronización con estado React.

### Decision 2: Formato de modelos y assets

- **Decision**: Modelos en formato glTF (`.glb`) para hoodie y camiseta, con materiales PBR y UVs listos para aplicar un gráfico en el pecho.
- **Rationale**: glTF es el estándar web para assets 3D, es eficiente, y soporta materiales e iluminación realista.
- **Alternatives considered**:
  - Geometría procedural simple (rápido para prototipar, pobre realismo).
  - Modelos con texturas no-PBR (menor fidelidad).

### Decision 3: Rotación “drag-to-rotate” solo horizontal

- **Decision**: Rotación controlada por arrastre horizontal (yaw), manteniendo pitch/roll constantes.
- **Rationale**: Cumple la UX de referencia (“Arrastra para girar”) evitando giros confusos; se siente “natural” y estable.
- **Alternatives considered**:
  - Controles orbitales completos (demasiada libertad; más riesgo de “flip” y de perder orientación).

### Decision 4: Cómo representar la personalización y su límite de impresión

- **Decision**: Mantener la personalización como modelo 2D normalizado (porcentaje 0–100 en un canvas “editor”), con una **caja de área válida** (print area) por tipo de prenda y lado. La UI de mover/redimensionar aplica clamp para asegurar que el bounding box del elemento permanezca dentro del print area.
- **Rationale**: El repo ya tiene `PersonalizationEditor` basado en coordenadas porcentuales; extenderlo con “print area” es incremental y testeable.
- **Alternatives considered**:
  - Restricciones en 3D (decals/UV bounds): mayor complejidad matemática y de tooling; difícil de testear sin rendering.

### Decision 5: Aplicación del diseño al modelo 3D

- **Decision**: Renderizar la personalización (texto + imagen) a una textura (canvas) y aplicarla a la zona del pecho del modelo 3D (por UV / material dedicado).
- **Rationale**: Mantiene consistencia entre editor 2D y vista 3D. Permite reprocesar la textura ante cambios de estado sin lógica 3D compleja.
- **Alternatives considered**:
  - Proyección tipo “decal” directa: buena, pero suele requerir ajuste fino de profundidad/normal y puede variar por modelo.

### Decision 6: Estrategia para “Home deprecated”

- **Decision**: Mantener el Home actual como página legacy accesible por una ruta dedicada (p. ej. `/home-legacy`) y señalizado como deprecated; el Home nuevo queda en `/`.
- **Rationale**: Mantiene compatibilidad sin exponerlo como flujo principal y facilita QA/rollback.
- **Alternatives considered**:
  - Feature flag por usuario/entorno: útil, pero introduce infraestructura extra.

### Decision 7: i18n, feedback no-bloqueante y accesibilidad

- **Decision**: Mantener el nuevo Home completamente bilingüe (ES/EN), usar feedback no-bloqueante para errores/éxitos y respetar accesibilidad básica (labels, foco, teclado).
- **Rationale**: Es requisito no negociable del producto (constitución) y evita regresiones de UX.
- **Alternatives considered**:
  - Texto hardcode en ES: rompe paridad EN y aumenta deuda.

## Open Questions (resolved)

- **¿Existe API real para “AI design”?**  
  - Estado actual: la generación en `PersonalizationEditor` es simulada (placeholder).  
  - Resolución para este plan: definir contrato de API opcional en `contracts/openapi.yaml` para cuando se conecte a backend, sin bloquear el rediseño del Home.

## Notes / Risks

- La fidelidad del 3D depende de disponibilidad/calidad de modelos y UVs (hoodie/camiseta).
- El “print area” requiere definir límites por prenda (incluyendo “encima del bolsillo” en hoodie). Se sugiere parametrizar por tipo de prenda y mantenerlo centralizado.

