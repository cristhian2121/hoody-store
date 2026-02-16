# Data Model: Nuevo Home de Personalización

**Branch**: `001-home-redesign`  
**Date**: 2026-02-14  
**Spec**: [spec.md](./spec.md)

## Overview

Este feature es principalmente de **estado de UI** (selecciones + personalización) y sus reglas de validación (área imprimible). No requiere base de datos.

## Entities

### `ProductType`

- **Descripción**: Tipo de producto a personalizar.
- **Valores**: `hoodie` | `camiseta`

### `GarmentColor`

- **Descripción**: Color de la prenda seleccionada.
- **Atributos**:
  - `name`: string (label para UI)
  - `value`: string (representación de color usada por UI/render)

### `PrintSide`

- **Descripción**: Lado de impresión.
- **Valores**: `front` | `back`

### `PrintArea`

- **Descripción**: Área válida de impresión (normalizada al canvas/editor 2D).
- **Atributos**:
  - `xMin`, `xMax`: number (0–100)
  - `yMin`, `yMax`: number (0–100)
- **Reglas**:
  - `xMin < xMax` y `yMin < yMax`
  - Debe definirse por `ProductType` y `PrintSide`

### `PersonalizationAsset`

Representa un elemento aplicable a la prenda.

#### `TextElement`

- `id`: string
- `content`: string
- `fontFamily`: string
- `fontSize`: number
- `color`: string
- `bold`: boolean
- `italic`: boolean
- `x`, `y`: number (0–100)
- `scale`: number (> 0)
- `rotation`: number (grados o radianes; debe ser consistente)

#### `ImageElement`

- `src`: string (data URL o URL)
- `x`, `y`: number (0–100)
- `scale`: number (> 0)
- `rotation`: number

### `PersonalizationData`

- **Descripción**: Estado completo de personalización por lado.
- **Atributos**:
  - `front`: `{ image: ImageElement | null, texts: TextElement[] }`
  - `back`: `{ image: ImageElement | null, texts: TextElement[] }`

### `HomeCustomizerState`

- **Descripción**: Estado de la pantalla Home nueva.
- **Atributos**:
  - `productType`: ProductType
  - `garmentColor`: GarmentColor
  - `activeSide`: PrintSide
  - `personalization`: PersonalizationData
  - `selectedTextId`: string | null
  - `aiPrompt`: string
  - `aiLoading`: boolean

## Validation Rules (must be testable)

1. Cualquier operación de mover/redimensionar debe asegurar que el **bounding box** del elemento permanezca dentro de su `PrintArea`.
2. Al crear un nuevo elemento (texto/imagen/AI), su posición inicial debe ser el **centro del pecho**, que se modela como el centro del `PrintArea` del `front`.
3. La UI no debe permitir un estado inválido donde un elemento quede fuera de los límites (se clampa o se corrige automáticamente).

## State Transitions (high level)

- `SelectProductType` → recalcula `PrintArea` aplicable y mantiene/ajusta personalización si fuera necesario (clamp).
- `SelectGarmentColor` → actualiza render sin cambiar geometría del print area.
- `AddText` / `UploadImage` / `GenerateAI` → crea/actualiza `PersonalizationAsset` con posición centrada.
- `DragMove` / `Resize` → clampa a `PrintArea` y persiste.

