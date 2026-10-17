import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createGlowData, GlowPoints } from './GlowPoints';
import { mulberry32, range } from '../random';
import { getUI } from '../store';

/** Champ d'étoiles concentré devant la caméra (là où l'on regarde réellement). */
export function Stars({ count }: { count: number }) {
  const data = useMemo(() => {
    const rnd = mulberry32(20260616);
    const d = createGlowData(count);
    const c = new THREE.Color();
    const palette = ['#cfe0ff', '#ffffff', '#ffe8c4', '#ffd9a0', '#b9ccff'];
    for (let i = 0; i < count; i++) {
      // Azimut ±58° autour de -Z, élévation 0–68°
      const az = range(rnd, -1.0, 1.0);
      const el = Math.asin(range(rnd, 0.0, Math.sin(1.19)));
      const r = 320;
      d.positions[i * 3] = Math.sin(az) * Math.cos(el) * r;
      d.positions[i * 3 + 1] = Math.sin(el) * r;
      d.positions[i * 3 + 2] = -Math.cos(az) * Math.cos(el) * r;
      // Magnitudes : beaucoup de petites étoiles, quelques brillantes
      const m = Math.pow(rnd(), 3.2);
      d.sizes[i] = 0.9 + m * 2.6;
      d.phases[i] = rnd();
      d.speeds[i] = range(rnd, 0.7, 2.6);
      c.set(palette[Math.floor(rnd() * palette.length)]);
      const bright = 0.55 + m * 0.6;
      d.colors[i * 3] = c.r * bright;
      d.colors[i * 3 + 1] = c.g * bright;
      d.colors[i * 3 + 2] = c.b * bright;
    }
    return d;
  }, [count]);

  return <GlowPoints data={data} size={1.15} twinkle={0.75} opacity={0.95} renderOrder={-50} />;
}

/* ───────────────────────── Étoiles filantes ───────────────────────── */

const SLOTS = 3;

const shootVertex = /* glsl */ `
  uniform vec2 uHead;
  uniform vec2 uDir;
  uniform float uLen;
  uniform float uWidth;
  uniform float uAspect;
  varying float vU;
  varying float vV;
  void main() {
    // position.x ∈ [0,1] le long de la traîne, position.y ∈ [-0.5,0.5] en largeur
    vec2 perp = vec2(-uDir.y, uDir.x);
    vec2 off = (-uDir * uLen * position.x + perp * uWidth * position.y);
    vec2 ndc = uHead + vec2(off.x / uAspect, off.y);
    gl_Position = vec4(ndc, 0.9995, 1.0);
    vU = position.x;
    vV = position.y;
  }
`;

const shootFragment = /* glsl */ `
  uniform float uAlpha;
  varying float vU;
  varying float vV;
  void main() {
    float along = pow(1.0 - vU, 2.2);
    float across = 1.0 - smoothstep(0.0, 0.5, abs(vV));
    float head = smoothstep(0.12, 0.0, vU) * 0.9;
    float a = (along * across + head * across) * uAlpha;
    gl_FragColor = vec4(vec3(1.0, 0.93, 0.8) * (0.9 + head), a);
    #include <colorspace_fragment>
  }
`;

interface Slot {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  active: boolean;
  t: number;
  dur: number;
  start: THREE.Vector2;
  dir: THREE.Vector2;
  dist: number;
}

/** Étoiles filantes rares, avec traîne lumineuse qui s'estompe. Jamais pendant la lettre. */
export function ShootingStars() {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.translate(0.5, 0, 0);
    return g;
  }, []);

  const slots = useMemo<Slot[]>(() => {
    return Array.from({ length: SLOTS }, () => {
      const material = new THREE.ShaderMaterial({
        vertexShader: shootVertex,
        fragmentShader: shootFragment,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uHead: { value: new THREE.Vector2() },
          uDir: { value: new THREE.Vector2(1, -1).normalize() },
          uLen: { value: 0.3 },
          uWidth: { value: 0.012 },
          uAspect: { value: 1 },
          uAlpha: { value: 0 },
        },
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = -40;
      mesh.visible = false;
      return {
        mesh,
        material,
        active: false,
        t: 0,
        dur: 1,
        start: new THREE.Vector2(),
        dir: new THREE.Vector2(),
        dist: 0.6,
      };
    });
  }, [geometry]);

  const timer = useRef(3 + Math.random() * 4);

  useEffect(() => {
    const g = group.current;
    slots.forEach((s) => g?.add(s.mesh));
    return () => {
      slots.forEach((s) => {
        g?.remove(s.mesh);
        s.material.dispose();
      });
      geometry.dispose();
    };
  }, [slots, geometry]);

  useFrame((state, dt) => {
    const ui = getUI();
    const allowed = ui.effects === 'full' && (ui.phase === 'idle' || ui.phase === 'intro') && ui.ready;
    const aspect = state.size.width / state.size.height;

    if (allowed) {
      timer.current -= dt;
      if (timer.current <= 0) {
        const free = slots.find((s) => !s.active);
        if (free) {
          free.active = true;
          free.t = 0;
          free.dur = range(Math.random, 0.9, 1.5);
          const goRight = Math.random() > 0.5;
          const ang = range(Math.random, 0.35, 0.8);
          free.dir.set(goRight ? Math.cos(ang) : -Math.cos(ang), -Math.sin(ang));
          // Départ dans le haut du ciel, au-dessus de l'horizon
          free.start.set(range(Math.random, -0.7, 0.7), range(Math.random, 0.45, 0.92));
          free.dist = range(Math.random, 0.45, 0.8);
          free.mesh.visible = true;
        }
        timer.current = range(Math.random, 7, 15);
      }
    }

    for (const s of slots) {
      if (!s.active) continue;
      s.t += dt;
      const p = s.t / s.dur;
      if (p >= 1) {
        s.active = false;
        s.mesh.visible = false;
        continue;
      }
      const u = s.material.uniforms;
      const travel = 1 - Math.pow(1 - p, 2);
      u.uHead.value.set(
        s.start.x + (s.dir.x * s.dist * travel) / aspect,
        s.start.y + s.dir.y * s.dist * travel,
      );
      u.uDir.value.copy(s.dir);
      u.uAspect.value = aspect;
      u.uLen.value = 0.34 * Math.min(1, p * 5) * (1 - 0.3 * p);
      // Apparition rapide, disparition progressive
      u.uAlpha.value = Math.min(1, p * 8) * Math.pow(1 - p, 1.4) * 0.9;
    }
  });

  return <group ref={group} />;
}
