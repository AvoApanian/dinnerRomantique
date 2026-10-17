import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../config';
import { anim, getUI } from '../store';
import { mulberry32, range } from '../random';

/**
 * Cœurs translucides qui montent doucement derrière la lettre. Un seul InstancedMesh ;
 * toute la position est calculée dans le vertex shader, directement en espace caméra :
 * les cœurs remplissent donc l'écran quel que soit le cadrage (portrait ou large), avec une
 * parallaxe de profondeur (vitesse, taille, dérive et réaction au pointeur dépendent de la distance).
 */

const vertexShader = /* glsl */ `
  attribute vec4 aSeed;   // x: abscisse écran de départ, y: vitesse, z: taille, w: phase
  attribute vec4 aSeed2;  // x: profondeur, y: teinte, z: seuil de densité, w: amplitude de dérive
  uniform float uTime;
  uniform float uFade;
  uniform float uAmount;
  uniform float uOpacity;
  uniform vec2 uTan;
  uniform vec2 uParallax;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vTint;

  void main() {
    float depth = aSeed2.x;
    float prog = fract(uTime * aSeed.y * 0.018 + aSeed.w);
    float ndcY = -1.25 + prog * 2.55;
    float near = 1.0 - depth / 26.0;
    float ndcX = aSeed.x
      + sin(uTime * 0.33 + aSeed.w * 6.2831) * aSeed2.w
      + uParallax.x * near;
    ndcY += uParallax.y * near;

    vec2 center = vec2(ndcX * uTan.x, ndcY * uTan.y) * depth;
    float size = aSeed.z * depth * uTan.y * 2.0;
    float ang = sin(uTime * 0.4 + aSeed.w * 12.0) * 0.28;
    mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
    vec3 pos = vec3(center + rot * position.xy * size, -depth);
    gl_Position = projectionMatrix * vec4(pos, 1.0);

    float vis = step(aSeed2.z, uAmount);
    float env = smoothstep(0.0, 0.16, prog) * (1.0 - smoothstep(0.76, 1.0, prog));
    float pulse = 0.65 + 0.35 * sin(uTime * 0.9 + aSeed.w * 20.0);
    vAlpha = vis * env * pulse * uFade * uOpacity;
    vTint = aSeed2.y;
    vUv = uv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uIvory;
  uniform vec3 uChampagne;
  uniform vec3 uRose;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vTint;
  void main() {
    float a = texture2D(uMap, vUv).a;
    vec3 col = vTint < 0.5 ? mix(uIvory, uChampagne, vTint * 2.0) : mix(uChampagne, uRose, (vTint - 0.5) * 2.0);
    gl_FragColor = vec4(col, a * vAlpha);
    #include <colorspace_fragment>
  }
`;

function makeHeartTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.translate(64, 66);
    ctx.scale(2.1, 2.1);
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.bezierCurveTo(-30, -6, -20, -30, 0, -14);
    ctx.bezierCurveTo(20, -30, 30, -6, 0, 14);
    ctx.closePath();
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = 10;
    const g = ctx.createRadialGradient(0, -4, 1, 0, 0, 22);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0.55)');
    ctx.fillStyle = g;
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function FloatingHearts({ count }: { count: number }) {
  const { geometry, material, texture } = useMemo(() => {
    const rnd = mulberry32(1414);
    const geo = new THREE.InstancedBufferGeometry();
    const base = new THREE.PlaneGeometry(1, 1);
    geo.index = base.index;
    geo.setAttribute('position', base.getAttribute('position'));
    geo.setAttribute('uv', base.getAttribute('uv'));
    geo.instanceCount = count;

    const seed = new Float32Array(count * 4);
    const seed2 = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const depth = range(rnd, 5, 25);
      const near = 1 - depth / 26;
      seed.set(
        [
          range(rnd, -0.95, 0.95), // x
          range(rnd, 0.55, 1.0) * (0.75 + near * 0.9), // vitesse (plus rapide au premier plan)
          range(rnd, 0.022, 0.05) * (0.8 + near * 0.5), // taille
          rnd(), // phase
        ],
        i * 4,
      );
      seed2.set(
        [
          depth,
          rnd(), // teinte
          (i + 0.5) / count / Math.max(CONFIG.hearts.density, 0.001), // seuil de densité
          range(rnd, 0.02, 0.08) * (0.6 + near),
        ],
        i * 4,
      );
    }
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
    geo.setAttribute('aSeed2', new THREE.InstancedBufferAttribute(seed2, 4));

    const tex = makeHeartTexture();
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uFade: { value: 0 },
        uAmount: { value: 0 },
        uOpacity: { value: CONFIG.hearts.opacity },
        uTan: { value: new THREE.Vector2(1, 1) },
        uParallax: { value: new THREE.Vector2() },
        uMap: { value: tex },
        uIvory: { value: new THREE.Color(CONFIG.colors.ivory) },
        uChampagne: { value: new THREE.Color(CONFIG.colors.champagne) },
        uRose: { value: new THREE.Color(CONFIG.colors.rose) },
      },
    });
    base.dispose();
    return { geometry: geo, material: mat, texture: tex };
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
    [geometry, material, texture],
  );

  useFrame((s) => {
    const u = material.uniforms;
    const effects = getUI().effects;
    const cam = s.camera as THREE.PerspectiveCamera;
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    u.uTime.value = s.clock.elapsedTime;
    u.uTan.value.set(tanV * cam.aspect, tanV);
    u.uFade.value = effects === 'off' ? 0 : anim.heartsFade;
    u.uAmount.value = effects === 'reduced' ? Math.min(anim.heartsAmount, 0.45) : anim.heartsAmount;
    u.uParallax.value.set(anim.pointer.x * 0.05, anim.pointer.y * 0.03);
    // Pas de rendu inutile quand rien n'est visible
    material.visible = u.uFade.value > 0.002;
  });

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={20} />;
}
