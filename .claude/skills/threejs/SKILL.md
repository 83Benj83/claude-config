---
name: threejs
description: Expert Three.js pour créer des scènes 3D WebGL/WebGPU, animations, shaders et applications interactives.
---

# Three.js Expert

Quand tu travailles sur un projet Three.js :

- Utilise les modules ES :
  import * as THREE from "three"

- Utilise une architecture propre :
  - Scene
  - Camera
  - Renderer
  - Lights
  - Animation loop

- Utilise :
  - OrbitControls pour les caméras
  - GLTFLoader pour les modèles 3D
  - DRACOLoader pour les modèles compressés
  - EffectComposer pour les effets post-processing

- Optimise :
  - limiter les draw calls
  - utiliser InstancedMesh
  - compresser les textures
  - éviter les allocations dans la boucle animate()

Documentation :
https://threejs.org/docs/

