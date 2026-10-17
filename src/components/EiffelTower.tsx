import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createGlowData, GlowPoints } from './GlowPoints';
import { mulberry32, range } from '../random';
import { GROUND_Y, TOWER_BASE_HEIGHT } from '../world';
import { CONFIG } from '../config';

/**
 * Tour Eiffel procédurale : quatre piliers en treillis, arches, trois plateformes et mât.
 * Profil de la silhouette inspiré des vraies proportions (base ≈ 38 % de la hauteur,
 * 1re plateforme ≈ 17 %, 2e ≈ 35 %, 3e ≈ 84 %). Toutes les poutres sont rendues en un
 * seul InstancedMesh.
 */

const H = TOWER_BASE_HEIGHT;
const K = H / 21;
const T1 = 0.173;
const T2 = 0.352;
const T3 = 0.84;
const T_ARCH = 0.115;

/** Demi-largeur de la tour à la hauteur normalisée t. */
const halfWidth = (t: number) => (0.165 * Math.exp(-4 * t) + 0.024 * (1 - t)) * H;
/** Épaisseur des piliers (jambes) à la base. */
const pierGap = (t: number) => 0.3 * halfWidth(t);

interface Beam {
  a: THREE.Vector3;
  b: THREE.Vector3;
  r: number;
}

function buildBeams(): Beam[] {
  const beams: Beam[] = [];
  const v = (x: number, t: number, z: number) => new THREE.Vector3(x, t * H, z);
  const add = (a: THREE.Vector3, b: THREE.Vector3, r: number) => beams.push({ a, b, r: r * K });

  const levels = (t0: number, t1: number, n: number) =>
    Array.from({ length: n + 1 }, (_, i) => t0 + ((t1 - t0) * i) / n);

  const lower = levels(0, T1, 8);
  const mid = levels(T1, T2, 8);
  const upper = levels(T2, T3, 11);
  const top = levels(T3, 1, 4);

  const signs: [number, number][] = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ];

  /* ── Piliers (de la base à la 1re plateforme) : 4 jambes, chacune avec 4 montants ── */
  for (const [sx, sz] of signs) {
    for (let i = 0; i < lower.length - 1; i++) {
      const t0 = lower[i];
      const t1 = lower[i + 1];
      const o0 = halfWidth(t0);
      const o1 = halfWidth(t1);
      const i0 = o0 - pierGap(t0);
      const i1 = o1 - pierGap(t1);

      const corners0: [number, number][] = [
        [o0, o0],
        [i0, o0],
        [o0, i0],
        [i0, i0],
      ];
      const corners1: [number, number][] = [
        [o1, o1],
        [i1, o1],
        [o1, i1],
        [i1, i1],
      ];
      // Montants
      for (let c = 0; c < 4; c++) {
        add(
          v(sx * corners0[c][0], t0, sz * corners0[c][1]),
          v(sx * corners1[c][0], t1, sz * corners1[c][1]),
          c === 0 ? 0.085 : 0.05,
        );
      }
      // Quatre faces de la jambe : croix de Saint-André
      const faces: [number, number][] = [
        [0, 1], // z = outer, x de outer à inner
        [2, 3], // z = inner
        [0, 2], // x = outer, z de outer à inner
        [1, 3], // x = inner
      ];
      for (const [p, q] of faces) {
        const a0 = v(sx * corners0[p][0], t0, sz * corners0[p][1]);
        const b0 = v(sx * corners0[q][0], t0, sz * corners0[q][1]);
        const a1 = v(sx * corners1[p][0], t1, sz * corners1[p][1]);
        const b1 = v(sx * corners1[q][0], t1, sz * corners1[q][1]);
        add(a0, b1, 0.028);
        add(b0, a1, 0.028);
        add(a1, b1, 0.034); // traverse horizontale
      }
    }
  }

  /* ── Arches et treillis entre les jambes ── */
  for (let face = 0; face < 4; face++) {
    const axisX = face < 2; // faces avant/arrière (plan z = ±) ou latérales (plan x = ±)
    const s = face % 2 === 0 ? 1 : -1;
    const place = (u: number, t: number) =>
      axisX ? v(u, t, s * halfWidth(0.045)) : v(s * halfWidth(0.045), t, u);

    const rx = (halfWidth(0.02) - pierGap(0.02)) * 0.96;
    const ry = T_ARCH * H * 0.92;
    const seg = 22;
    for (const scale of [1, 0.86]) {
      for (let i = 0; i < seg; i++) {
        const a0 = Math.PI * (i / seg);
        const a1 = Math.PI * ((i + 1) / seg);
        add(
          place(Math.cos(a0) * rx * scale, (Math.sin(a0) * ry * scale) / H),
          place(Math.cos(a1) * rx * scale, (Math.sin(a1) * ry * scale) / H),
          0.038,
        );
      }
    }
    // Rayons entre les deux arcs
    for (let i = 1; i < seg; i += 2) {
      const a = Math.PI * (i / seg);
      add(
        place(Math.cos(a) * rx, (Math.sin(a) * ry) / H),
        place(Math.cos(a) * rx * 0.86, (Math.sin(a) * ry * 0.86) / H),
        0.022,
      );
    }
    // Treillis au-dessus de l'arche, jusqu'à la 1re plateforme
    const bands = levels(T_ARCH, T1, 3);
    for (let i = 0; i < bands.length - 1; i++) {
      const t0 = bands[i];
      const t1 = bands[i + 1];
      const x0 = halfWidth(t0) - pierGap(t0);
      const x1 = halfWidth(t1) - pierGap(t1);
      add(place(-x0, t0), place(x1, t1), 0.024);
      add(place(x0, t0), place(-x1, t1), 0.024);
      add(place(-x1, t1), place(x1, t1), 0.03);
    }
  }

  /* ── Sections pleines : 4 montants d'angle + croix sur chaque face + traverses ── */
  const solid = (ts: number[], postR0: number, postR1: number) => {
    for (let i = 0; i < ts.length - 1; i++) {
      const t0 = ts[i];
      const t1 = ts[i + 1];
      const w0 = halfWidth(t0);
      const w1 = halfWidth(t1);
      const r = postR0 + (postR1 - postR0) * (i / (ts.length - 1));
      for (let c = 0; c < 4; c++) {
        const [sx, sz] = signs[c];
        add(v(sx * w0, t0, sz * w0), v(sx * w1, t1, sz * w1), r);
        // Face entre le coin c et le coin suivant
        const [nx, nz] = signs[(c + 1) % 4];
        const a0 = v(sx * w0, t0, sz * w0);
        const b0 = v(nx * w0, t0, nz * w0);
        const a1 = v(sx * w1, t1, sz * w1);
        const b1 = v(nx * w1, t1, nz * w1);
        add(a0, b1, 0.026);
        add(b0, a1, 0.026);
        add(a1, b1, 0.03);
      }
    }
  };
  solid(mid, 0.06, 0.05);
  solid(upper, 0.045, 0.03);
  solid(top, 0.028, 0.022);

  /* ── Mât central ── */
  beams.push({ a: v(0, T3 + 0.01, 0), b: v(0, 1, 0), r: 0.05 * K });

  return beams;
}

const vertexColorTop = new THREE.Color('#ffe2ad');
const vertexColorBottom = new THREE.Color('#ff9c3a');

interface Props {
  height: number;
  z: number;
  sparkleCount: number;
}

function Platform({
  t,
  widthMul,
  thick,
  material,
}: {
  t: number;
  widthMul: number;
  thick: number;
  material: THREE.Material;
}) {
  const w = halfWidth(t) * widthMul;
  return (
    <group position={[0, t * H, 0]}>
      <mesh material={material}>
        <boxGeometry args={[w * 2, thick * K, w * 2]} />
      </mesh>
      <mesh position={[0, thick * K * 0.9, 0]} material={material}>
        <boxGeometry args={[w * 1.86, 0.1 * K, w * 1.86]} />
      </mesh>
    </group>
  );
}

export function EiffelTower({ height, z, sparkleCount }: Props) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.Mesh>(null);

  const { beams, sparkles } = useMemo(() => {
    const list = buildBeams();
    const rnd = mulberry32(31337);
    const pts: number[] = [];
    for (const b of list) {
      if (rnd() < 0.2) {
        const t = rnd();
        pts.push(
          b.a.x + (b.b.x - b.a.x) * t,
          b.a.y + (b.b.y - b.a.y) * t,
          b.a.z + (b.b.z - b.a.z) * t,
        );
      }
    }
    return { beams: list, sparkles: pts };
  }, []);

  const geometry = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 5, 1, true), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false, toneMapped: false }),
    [],
  );
  const slabMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#f5a644', fog: false, toneMapped: false }),
    [],
  );

  // Placement des poutres (une seule fois)
  useEffect(() => {
    const im = mesh.current;
    if (!im) return;
    const rnd = mulberry32(99);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const col = new THREE.Color();
    beams.forEach((b, i) => {
      dir.subVectors(b.b, b.a);
      const len = dir.length();
      dir.normalize();
      q.setFromUnitVectors(up, dir);
      pos.addVectors(b.a, b.b).multiplyScalar(0.5);
      scl.set(b.r, len, b.r);
      m.compose(pos, q, scl);
      im.setMatrixAt(i, m);
      const h = THREE.MathUtils.clamp(pos.y / H, 0, 1);
      col.copy(vertexColorBottom).lerp(vertexColorTop, Math.pow(h, 0.8));
      col.multiplyScalar(0.82 + rnd() * 0.22);
      im.setColorAt(i, col);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [beams]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      slabMaterial.dispose();
    },
    [geometry, material, slabMaterial],
  );

  const sparkleData = useMemo(() => {
    const rnd = mulberry32(4242);
    const count = Math.min(sparkles.length / 3, sparkleCount);
    const d = createGlowData(count);
    const c = new THREE.Color('#fff0cc');
    for (let i = 0; i < count; i++) {
      d.positions[i * 3] = sparkles[i * 3];
      d.positions[i * 3 + 1] = sparkles[i * 3 + 1];
      d.positions[i * 3 + 2] = sparkles[i * 3 + 2];
      d.sizes[i] = range(rnd, 0.6, 1.5);
      d.phases[i] = rnd();
      // Quelques étincelles rapides, la plupart lentes
      d.speeds[i] = rnd() > 0.82 ? range(rnd, 4, 7) : range(rnd, 0.8, 2);
      d.colors[i * 3] = c.r;
      d.colors[i * 3 + 1] = c.g;
      d.colors[i * 3 + 2] = c.b;
    }
    return d;
  }, [sparkles, sparkleCount]);

  const beaconData = useMemo(() => {
    const d = createGlowData(1);
    const c = new THREE.Color('#ffe9b8');
    d.positions.set([0, H + 0.12 * K, 0]);
    d.sizes[0] = 26;
    d.speeds[0] = 0.9;
    d.phases[0] = 0.2;
    d.colors.set([c.r, c.g, c.b]);
    return d;
  }, []);

  // Halo chaud derrière la tour
  const haloMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        uniforms: {
          uColor: { value: new THREE.Color(CONFIG.colors.amber) },
          uStrength: { value: 0.2 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uStrength;
          varying vec2 vUv;
          void main() {
            vec2 p = (vUv - vec2(0.5, 0.42)) * vec2(2.0, 2.0);
            float r = length(vec2(p.x * 1.25, p.y * 0.9));
            float a = exp(-r * r * 2.6) * uStrength;
            // plus concentré vers le bas (pied de la tour)
            a *= 0.6 + 0.4 * smoothstep(0.9, 0.1, vUv.y);
            gl_FragColor = vec4(uColor, a);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  );
  const haloGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  useEffect(
    () => () => {
      haloMaterial.dispose();
      haloGeometry.dispose();
    },
    [haloMaterial, haloGeometry],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    material.color.setScalar(0.96 + 0.04 * Math.sin(t * 0.7));
    if (beacon.current) {
      const s = 1 + 0.12 * Math.sin(t * 1.6);
      beacon.current.scale.setScalar(s);
    }
  });

  const s = height / H;

  return (
    <group ref={group} position={[0, GROUND_Y, z]} scale={s}>
      <instancedMesh
        ref={mesh}
        args={[geometry, material, beams.length]}
        frustumCulled={false}
      />

      {/* Plateformes */}
      <Platform t={T1} widthMul={1.2} thick={0.36} material={slabMaterial} />
      <Platform t={T2} widthMul={1.25} thick={0.3} material={slabMaterial} />
      <Platform t={T3} widthMul={1.45} thick={0.26} material={slabMaterial} />
      {/* Cabine du sommet */}
      <mesh position={[0, T3 * H + 0.42 * K, 0]} material={slabMaterial}>
        <boxGeometry args={[halfWidth(T3) * 2.2, 0.5 * K, halfWidth(T3) * 2.2]} />
      </mesh>
      <mesh position={[0, T3 * H + 0.8 * K, 0]} material={slabMaterial}>
        <cylinderGeometry args={[0.1 * K, halfWidth(T3) * 1.1, 0.32 * K, 8]} />
      </mesh>
      {/* Balise */}
      <mesh ref={beacon} position={[0, H + 0.12 * K, 0]}>
        <sphereGeometry args={[0.09 * K, 10, 8]} />
        <meshBasicMaterial color="#fff2d0" toneMapped={false} fog={false} />
      </mesh>

      {/* Halo */}
      <mesh
        geometry={haloGeometry}
        material={haloMaterial}
        position={[0, H * 0.42, -1.2]}
        scale={[H * 0.95, H * 1.25, 1]}
        renderOrder={2}
      />

      <GlowPoints data={sparkleData} size={1.15} twinkle={0.95} attenuate opacity={0.85} renderOrder={6} />
      <GlowPoints data={beaconData} size={1} twinkle={0.4} opacity={0.9} renderOrder={6} />
    </group>
  );
}
