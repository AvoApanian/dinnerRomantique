import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../config';
import { anim, getUI } from '../store';
import { mulberry32, range } from '../random';
import { sfx } from '../audio';
import type { Quality } from '../quality';

/**
 * Feux d'artifice dans le ciel, derrière la lettre.
 *
 * Toute la trajectoire est calculée dans le vertex shader à partir de l'instant de départ de la gerbe :
 * position = origine + direction · vitesse · (1 − e^(−k·t)) / k − ½ g t². Le CPU ne fait que choisir
 * l'origine/la couleur d'une nouvelle gerbe (quelques uniformes), jamais de mise à jour par particule.
 * Chaque particule est dessinée plusieurs fois avec un léger retard → courtes traînées lumineuses.
 */

const PALETTES = {
  gold: { a: '#ffc86b', b: '#ff9a3c' },
  champagne: { a: '#f7e7c3', b: '#e8c98a' },
  ivory: { a: '#fff6e6', b: '#ffd9a8' },
  rose: { a: '#ff9fb2', b: '#d9738a' },
} as const;

type PaletteName = keyof typeof PALETTES;

const BASE_RADIUS = 6.5;
const DISTANCE = 80;

function vertexSource(bursts: number, trails: number) {
  return /* glsl */ `
    #define BURSTS ${bursts}
    #define TRAILS ${trails}.0
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uLife;
    uniform float uGravity;
    uniform float uSpeed;
    uniform float uDrag;
    uniform float uFade;
    uniform float uTrailLag;
    uniform float uSize;
    uniform vec3 uOrigin[BURSTS];
    uniform float uStart[BURSTS];
    uniform vec3 uColorA[BURSTS];
    uniform vec3 uColorB[BURSTS];
    uniform float uHeart[BURSTS];
    uniform float uScale[BURSTS];
    attribute vec3 aDir;
    attribute vec3 aDirHeart;
    attribute vec4 aMeta; // burst, vitesse, aléa, traînée
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      int b = int(aMeta.x + 0.5);
      float start = uStart[b];
      float trail = aMeta.w;
      float age = uTime - start - trail * uTrailLag;
      float life = uLife * (0.82 + 0.3 * aMeta.z);
      if (start < 0.0 || age < 0.0 || age > life) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 0.0;
        vColor = vec3(0.0);
        vAlpha = 0.0;
        return;
      }
      vec3 dir = mix(aDir, aDirHeart, uHeart[b]);
      float d = (1.0 - exp(-uDrag * age)) / uDrag;
      vec3 p = uOrigin[b] + dir * (uSpeed * uScale[b] * aMeta.y) * d;
      p.y -= 0.5 * uGravity * age * age;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;

      float t = age / life;
      float flicker = 0.78 + 0.22 * sin(age * 26.0 + aMeta.z * 50.0);
      float fadeOut = pow(1.0 - t, 1.25);
      float fadeIn = smoothstep(0.0, 0.07, age);
      float trailFade = 1.0 - (trail / TRAILS) * 0.7;
      vAlpha = fadeOut * fadeIn * flicker * trailFade * uFade;
      vColor = mix(uColorA[b], uColorB[b], smoothstep(0.1, 0.9, t));
      float sz = uSize * uPixelRatio * (80.0 / max(-mv.z, 1.0));
      sz *= (1.0 - 0.3 * trail / TRAILS) * (0.55 + 0.45 * (1.0 - t));
      gl_PointSize = sz;
    }
  `;
}

const fragmentSource = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 1.15);
    gl_FragColor = vec4(vColor * (1.0 + 0.5 * a), a * vAlpha);
    #include <colorspace_fragment>
  }
`;

interface Burst {
  origin: THREE.Vector3;
  colorA: THREE.Vector3;
  colorB: THREE.Vector3;
}

export function Fireworks({ quality }: { quality: Quality }) {
  const B = quality.fireworkBursts;
  const P = quality.fireworkParticles;
  const TR = quality.fireworkTrails;

  const geometry = useMemo(() => {
    const rnd = mulberry32(2718);
    const count = B * P * TR;
    const dirs = new Float32Array(count * 3);
    const hearts = new Float32Array(count * 3);
    const meta = new Float32Array(count * 4);
    let n = 0;
    for (let b = 0; b < B; b++) {
      for (let i = 0; i < P; i++) {
        // direction sphérique uniforme
        const u = rnd() * 2 - 1;
        const phi = rnd() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        const dir = [s * Math.cos(phi), u, s * Math.sin(phi)];
        // cœur paramétrique, dans le plan écran
        const tt = (i / P) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(tt), 3);
        const hy = 13 * Math.cos(tt) - 5 * Math.cos(2 * tt) - 2 * Math.cos(3 * tt) - Math.cos(4 * tt);
        const fill = i % 3 === 0 ? 0.55 : 1;
        const heart = [(hx / 17) * fill, ((hy + 2) / 17) * fill, (rnd() - 0.5) * 0.12];
        // coque principale + quelques particules plus lentes (volume)
        const speed = (rnd() < 0.28 ? 0.55 : 1) * (0.94 + rnd() * 0.06);
        const aleas = rnd();
        for (let t = 0; t < TR; t++) {
          dirs.set(dir, n * 3);
          hearts.set(heart, n * 3);
          meta.set([b, speed, aleas, t], n * 4);
          n++;
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3));
    g.setAttribute('aDirHeart', new THREE.BufferAttribute(hearts, 3));
    g.setAttribute('aMeta', new THREE.BufferAttribute(meta, 4));
    return g;
  }, [B, P, TR]);

  const { material, bursts } = useMemo(() => {
    const list: Burst[] = Array.from({ length: B }, () => ({
      origin: new THREE.Vector3(),
      colorA: new THREE.Vector3(1, 0.8, 0.4),
      colorB: new THREE.Vector3(1, 0.6, 0.2),
    }));
    const m = new THREE.ShaderMaterial({
      vertexShader: vertexSource(B, TR),
      fragmentShader: fragmentSource,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uLife: { value: CONFIG.fireworks.lifetime },
        uGravity: { value: 1.2 },
        uSpeed: { value: 9.6 },
        uDrag: { value: 1.5 },
        uFade: { value: 1 },
        uTrailLag: { value: 0.045 },
        uSize: { value: 8 },
        uOrigin: { value: list.map((b) => b.origin) },
        uStart: { value: Array.from({ length: B }, () => -1) },
        uColorA: { value: list.map((b) => b.colorA) },
        uColorB: { value: list.map((b) => b.colorB) },
        uHeart: { value: Array.from({ length: B }, () => 0) },
        uScale: { value: Array.from({ length: B }, () => 1) },
      },
    });
    return { material: m, bursts: list };
  }, [B, TR]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const state = useMemo(
    () => ({ slot: 0, count: 0, timer: 0, rnd: mulberry32(Date.now() & 0xffff) }),
    [],
  );

  useFrame((s, dt) => {
    const u = material.uniforms;
    const now = s.clock.elapsedTime;
    u.uTime.value = now;
    u.uPixelRatio.value = s.gl.getPixelRatio();
    u.uFade.value = anim.fireworksFade;

    if (anim.resetFireworks) {
      anim.resetFireworks = false;
      const starts = u.uStart.value as number[];
      for (let i = 0; i < starts.length; i++) starts[i] = -1;
      state.count = 0;
      state.timer = 0;
    }

    const effects = getUI().effects;
    if (effects === 'off') {
      anim.firstBurst = false;
      return;
    }

    const spawn = (first: boolean) => {
      const i = state.slot;
      state.slot = (state.slot + 1) % B;
      const cam = s.camera as THREE.PerspectiveCamera;
      const rnd = state.rnd;

      // Palette : or d'abord ; rose en proportion restreinte ; cœur de temps en temps
      let name: PaletteName = 'gold';
      let heart = 0;
      if (!first) {
        const r = rnd();
        if (r < CONFIG.fireworks.roseShare) name = 'rose';
        else if (r < 0.5) name = 'gold';
        else if (r < 0.78) name = 'champagne';
        else name = 'ivory';
        if (state.count % 4 === 2) {
          heart = 1;
          name = rnd() > 0.5 ? 'rose' : 'gold';
        }
      }
      const pal = PALETTES[name];
      const ca = new THREE.Color(pal.a);
      const cb = new THREE.Color(pal.b);
      bursts[i].colorA.set(ca.r, ca.g, ca.b);
      bursts[i].colorB.set(cb.r, cb.g, cb.b);

      // Origine : point d'écran choisi puis projeté à grande distance, bien derrière la ville
      const side = state.count % 2 === 0 ? -1 : 1;
      // En portrait, le papier couvre la moitié basse : les gerbes restent dans le tiers supérieur
      const portrait = cam.aspect < 1;
      const ndcX = first ? (portrait ? 0.12 : 0.7) : side * (portrait ? range(rnd, 0.15, 0.55) : range(rnd, 0.62, 0.88));
      const ndcY = first ? (portrait ? 0.62 : 0.52) : portrait ? range(rnd, 0.42, 0.8) : range(rnd, 0.25, 0.78);
      const v = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(cam);
      const dir = v.sub(cam.position).normalize();
      bursts[i].origin.copy(cam.position).addScaledVector(dir, DISTANCE);

      // Taille selon le cadrage visible (petit écran portrait → plus petit, desktop → plus grand)
      const halfV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      const visH = 2 * halfV * DISTANCE;
      const visW = visH * cam.aspect;
      const radius = Math.min(portrait ? 0.27 * visW : 0.2 * visW, 0.26 * visH);
      const sizeJitter = first ? 1 : range(rnd, 0.62, 0.95);
      const reduced = effects === 'reduced' ? 0.75 : 1;
      (u.uScale.value as number[])[i] = (radius / BASE_RADIUS) * sizeJitter * reduced;
      (u.uHeart.value as number[])[i] = heart;
      (u.uStart.value as number[])[i] = s.clock.elapsedTime;
      state.count++;
      sfx.burst();
    };

    if (anim.firstBurst) {
      anim.firstBurst = false;
      spawn(true);
      state.timer = range(state.rnd, 1.8, 2.8);
    }

    if (anim.fireworksOn) {
      state.timer -= dt;
      if (state.timer <= 0) {
        spawn(false);
        const reduced = effects === 'reduced';
        state.timer = reduced
          ? range(state.rnd, CONFIG.fireworks.reducedIntervalMin, CONFIG.fireworks.reducedIntervalMax)
          : range(state.rnd, CONFIG.fireworks.intervalMin, CONFIG.fireworks.intervalMax);
      }
    }
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={10} />;
}
