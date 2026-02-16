import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Decal, useGLTF } from "@react-three/drei";
import { easing } from "maath";
import * as THREE from "three";
import type { PersonalizationData, ProductCategory } from "@/lib/types";
import { useDragRotateY } from "./useDragRotate";
import { usePersonalizationTexture } from "./usePersonalizationTexture";
import { useLanguage } from "@/lib/i18n";
import { garmentModels } from "./models";

function Scene(props: {
  category: ProductCategory;
  garmentColor: string;
  personalization?: PersonalizationData;
}) {
  const { category, garmentColor, personalization } = props;
  const groupRef = useRef<THREE.Group>(null);
  const modelConfig = garmentModels[category];
  const garmentModel = useGLTF(modelConfig.glbPath);
  const drag = useDragRotateY();
  
  // Get textures for both sides
  const frontTexture = usePersonalizationTexture({
    category,
    side: "front",
    personalization,
  });
  const backTexture = usePersonalizationTexture({
    category,
    side: "back",
    personalization,
  });

  // Extract nodes and materials from GLTF
  const { nodes, materials } = garmentModel;

  // Find the main mesh node - try common naming patterns
  const mainMeshNode = useMemo(() => {
    const meshNames = ["T_Shirt_male", "T_Shirt", "Shirt", "shirt"];
    for (const name of meshNames) {
      if (nodes[name] && "isMesh" in nodes[name] && nodes[name].isMesh) {
        return nodes[name] as THREE.Mesh;
      }
    }
    // Fallback: find first mesh in nodes
    for (const key in nodes) {
      const node = nodes[key];
      if (node && "isMesh" in node && node.isMesh) {
        return node as THREE.Mesh;
      }
    }
    return null;
  }, [nodes]);

  // Find the main material - try lambert1 or first MeshStandardMaterial
  const mainMaterial = useMemo(() => {
    if (materials.lambert1) {
      return materials.lambert1 as THREE.MeshStandardMaterial;
    }
    // Fallback: find first MeshStandardMaterial
    for (const key in materials) {
      const mat = materials[key];
      if (mat && "isMeshStandardMaterial" in mat && mat.isMeshStandardMaterial) {
        return mat as THREE.MeshStandardMaterial;
      }
    }
    return null;
  }, [materials]);


  // Smooth color transition using maath easing
  useFrame((state, delta) => {
    if (mainMaterial) {
      const targetColor = new THREE.Color(garmentColor);
      easing.dampC(
        mainMaterial.color,
        targetColor,
        0.25,
        delta,
      );
    }
  });

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = drag.getRotationY();
  });

  // Create a key string to force remount when personalization changes
  const stateString = JSON.stringify({
    category,
    hasFront: !!frontTexture,
    hasBack: !!backTexture,
  });

  if (!mainMeshNode) {
    return null;
  }

  return (
    <group
      ref={groupRef}
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
    >
      <mesh
        geometry={(mainMeshNode as THREE.Mesh).geometry}
        material={mainMaterial || materials.lambert1}
        position={[0, 0, 0]}
        scale={modelConfig.scale}
        castShadow
        material-roughness={1}
        dispose={null}
      >
        {/* Front decal */}
        {frontTexture && (
          <Decal
            key={`front-${stateString}`}
            position={modelConfig.decalAnchors.front.position as [number, number, number]}
            rotation={modelConfig.decalAnchors.front.rotation as [number, number, number]}
            scale={modelConfig.decalAnchors.front.scale}
            map={frontTexture}
            anisotropy={16}
            depthTest={false}
            depthWrite={true}
          />
        )}

        {/* Back decal */}
        {backTexture && (
          <Decal
            key={`back-${stateString}`}
            position={modelConfig.decalAnchors.back.position as [number, number, number]}
            rotation={modelConfig.decalAnchors.back.rotation as [number, number, number]}
            scale={modelConfig.decalAnchors.back.scale}
            map={backTexture}
            anisotropy={16}
            depthTest={false}
            depthWrite={true}
          />
        )}
      </mesh>
    </group>
  );
}

export default function GarmentViewer3D(props: {
  category: ProductCategory;
  garmentColor: string;
  personalization?: PersonalizationData;
}) {
  const { category, garmentColor, personalization } = props;
  const { t } = useLanguage();
  const canUseWebgl =
    typeof window !== "undefined" && "WebGLRenderingContext" in window;

  // Defensive: avoid crashing the whole Home if WebGL is not available
  if (!canUseWebgl) {
    return (
      <div className="h-full w-full rounded-xl border bg-muted/30 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {t("home.3dUnavailable")}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border bg-muted/20">
      <Canvas camera={{ position: [0, 0.2, 2.2], fov: 42 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 3]} intensity={1.1} />
        <directionalLight position={[-3, 1, 2]} intensity={0.6} />
        <Suspense fallback={null}>
          <Scene
            category={category}
            garmentColor={garmentColor}
            personalization={personalization}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload models for both categories
useGLTF.preload("/shirt_baked.glb");
