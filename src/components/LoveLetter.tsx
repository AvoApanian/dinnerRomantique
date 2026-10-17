import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { createPaperTexture } from '../textures';
import { anim, getUI, openLetter } from '../store';
import { LETTER_POS, LETTER_SCALE } from '../world';
import { easeInOutCubic } from '../layout';

/** Dimensions du papier plié (mètres). Volontairement un peu généreuses pour rester lisibles sur téléphone. */
const W = 0.42;
const H = 0.26;
const T = 0.004;
const REST_YAW = -0.22;

/**
 * La lettre, objet physique posé sur la table : deux moitiés de papier (la seconde pliée par-dessus),
 * un cachet de cire, une lueur discrète qui attire l'œil. Un volume de toucher invisible, plus grand
 * que le papier, rend le toucher confortable sur mobile.
 */
export function LoveLetter() {
  const group = useRef<THREE.Group>(null);
  const flap = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Sprite>(null);
  const light = useRef<THREE.PointLight>(null);
  const target = useRef(0);

  const assets = useMemo(() => {
    const inside = createPaperTexture(true);
    const outside = createPaperTexture(false);
    const make = (map: THREE.Texture) =>
      new THREE.MeshStandardMaterial({
        map,
        roughness: 0.92,
        emissive: new THREE.Color('#ffcf8a'),
        emissiveIntensity: 0,
      });
    const matInside = make(inside);
    const matOutside = make(outside);
    const matEdge = new THREE.MeshStandardMaterial({
      color: '#ecdfc2',
      roughness: 0.95,
      emissive: new THREE.Color('#ffcf8a'),
      emissiveIntensity: 0,
    });
    const faces = [matEdge, matEdge, matInside, matOutside, matEdge, matEdge];
    const seal = new THREE.MeshStandardMaterial({ color: '#8f3446', roughness: 0.38, metalness: 0.1 });

    const sheetGeo = new THREE.BoxGeometry(W, T, H);
    const sealGeo = new THREE.CylinderGeometry(0.03, 0.033, 0.008, 24);
    const hitGeo = new THREE.BoxGeometry(0.78, 0.16, 0.5);

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 128;
    const ctx = glowCanvas.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,221,160,0.85)');
      g.addColorStop(0.4, 'rgba(255,190,110,0.28)');
      g.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      opacity: 0.2,
    });

    return { inside, outside, matInside, matOutside, matEdge, faces, seal, sheetGeo, sealGeo, hitGeo, glowTex, glowMat };
  }, []);

  useEffect(
    () => () => {
      assets.inside.dispose();
      assets.outside.dispose();
      assets.matInside.dispose();
      assets.matOutside.dispose();
      assets.matEdge.dispose();
      assets.seal.dispose();
      assets.sheetGeo.dispose();
      assets.sealGeo.dispose();
      assets.hitGeo.dispose();
      assets.glowTex.dispose();
      assets.glowMat.dispose();
      document.body.style.cursor = '';
    },
    [assets],
  );

  const interactive = () => {
    const p = getUI().phase;
    return p === 'idle' || p === 'intro';
  };

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive()) return;
    e.stopPropagation();
    target.current = 1;
    if (e.pointerType === 'mouse') document.body.style.cursor = 'pointer';
  };
  const onOut = () => {
    target.current = 0;
    document.body.style.cursor = '';
  };
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive()) return;
    e.stopPropagation();
    target.current = 1;
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive()) return;
    e.stopPropagation();
    // Un glissement de doigt (parallaxe) ne doit pas ouvrir la lettre
    if (e.delta > 10) return;
    target.current = 0;
    document.body.style.cursor = '';
    openLetter();
  };

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const phase = getUI().phase;
    const wantHover = phase === 'idle' || phase === 'intro' ? target.current : 0;
    anim.hover += (wantHover - anim.hover) * (1 - Math.exp(-dt * 9));

    const t = state.clock.elapsedTime;
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.6);
    const idleGlow = phase === 'idle' || phase === 'intro' ? 1 : 0;

    // Dépliage : le rabat pivote de 180° (fermé) à 0° (ouvert)
    const p = easeInOutCubic(anim.paperT);
    if (flap.current) flap.current.rotation.x = Math.PI * (1 - p);

    // Léger soulèvement et alignement vers la caméra pendant l'ouverture
    g.position.y = LETTER_POS[1] + 0.008 * anim.hover + 0.012 * p;
    g.rotation.y = REST_YAW * (1 - 0.8 * p);

    const emissive = 0.05 + 0.04 * breathe * idleGlow + 0.32 * anim.hover + 0.12 * p;
    assets.matInside.emissiveIntensity = emissive;
    assets.matOutside.emissiveIntensity = emissive;
    assets.matEdge.emissiveIntensity = emissive * 0.8;

    if (halo.current) {
      halo.current.material.opacity = (0.16 + 0.1 * breathe) * idleGlow + 0.3 * anim.hover + 0.1 * p;
    }
    if (light.current) light.current.intensity = 0.1 + 0.55 * anim.hover + 0.55 * p;
  });

  return (
    <group
      ref={group}
      position={LETTER_POS}
      scale={LETTER_SCALE}
      rotation={[0, REST_YAW, 0]}
      name="love-letter"
    >
      {/* Moitié basse, posée à plat */}
      <mesh
        geometry={assets.sheetGeo}
        material={assets.faces}
        position={[0, T / 2, 0]}
        castShadow
        receiveShadow
      />
      {/* Rabat articulé sur le bord du fond */}
      <group ref={flap} position={[0, T, -H / 2]} rotation={[Math.PI, 0, 0]}>
        <mesh
          geometry={assets.sheetGeo}
          material={assets.faces}
          position={[0, -T / 2, -H / 2]}
          castShadow
        />
        <mesh geometry={assets.sealGeo} material={assets.seal} position={[0, -T - 0.004, -H / 2]} castShadow />
      </group>

      <sprite
        ref={halo}
        material={assets.glowMat}
        position={[0, 0.05, 0]}
        scale={[0.95, 0.95, 1]}
        renderOrder={6}
      />
      <pointLight ref={light} position={[0, 0.22, 0.08]} color="#ffcf8f" intensity={0.1} distance={1.6} decay={1.6} />

      {/* Volume de toucher invisible, plus généreux que le papier */}
      <mesh
        geometry={assets.hitGeo}
        position={[0, 0.06, -0.03]}
        onPointerOver={onOver}
        onPointerOut={onOut}
        onPointerDown={onDown}
        onClick={onClick}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

    </group>
  );
}
