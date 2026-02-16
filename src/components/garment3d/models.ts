import type { ProductCategory } from "@/lib/types";

export interface GarmentModelRef {
  category: ProductCategory;
  /**
   * Public path to GLB model file (relative to /public)
   */
  glbPath: string;
  /**
   * Scale factor to apply to the model
   */
  scale: number;
  /**
   * Decal anchor positions for front and back sides
   * Position: [x, y, z] in model space
   * Rotation: [x, y, z] in radians
   */
  decalAnchors: {
    front: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: number;
    };
    back: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: number;
    };
  };
}

/**
 * Model registry for garment 3D models.
 * Currently uses shirt_baked.glb for both categories temporarily.
 * When hoodie model is available, update hoodies entry with correct path and anchors.
 */
export const garmentModels: Record<ProductCategory, GarmentModelRef> = {
  hoodies: {
    category: "hoodies",
    glbPath: "/shirt_baked.glb", // Temporary: reuse t-shirt model
    scale: 1.6,
    decalAnchors: {
      front: {
        position: [0, 0, 0.15],
        rotation: [0, 0, Math.PI],
        scale: 0.7,
      },
      back: {
        position: [0, 0, -0.15],
        rotation: [0, Math.PI, 0],
        scale: 0.7,
      },
    },
  },
  camisetas: {
    category: "camisetas",
    glbPath: "/shirt_baked.glb",
    scale: 1.6,
    decalAnchors: {
      front: {
        position: [0, 0, 0.15],
        rotation: [0, 0, Math.PI],
        scale: 0.7,
      },
      back: {
        position: [0, 0, -0.15],
        rotation: [0, Math.PI, 0],
        scale: 0.7,
      },
    },
  },
};
