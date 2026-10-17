import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createGlowData, GlowPoints } from './GlowPoints';
import { mulberry32, range } from '../random';
import { GROUND_Y } from '../world';

/**
 * Paysage urbain procédural : rangées d'immeubles haussmanniens (corps + toit mansardé +
 * cheminées), repères (dôme des Invalides, Sacré-Cœur) et fenêtres éclairées.
 * Chaque famille de formes est un seul InstancedMesh.
 */

interface RowSpec {
  z: number;
  hMin: number;
  hMax: number;
  color: string;
}

const ROWS: RowSpec[] = [
  { z: -46, hMin: 2.4, hMax: 3.4, color: '#080f28' },
  { z: -50, hMin: 2.3, hMax: 3.4, color: '#0b1432' },
  { z: -64, hMin: 2.9, hMax: 4.1, color: '#101a3d' },
  { z: -80, hMin: 3.3, hMax: 4.8, color: '#162250' },
  { z: -98, hMin: 3.7, hMax: 5.4, color: '#1d2b5c' },
];

interface Building {
  x: number;
  z: number;
  w: number;
  d: number;
  body: number;
  roof: number;
  color: THREE.Color;
}

function makeRoofGeometry(): THREE.BufferGeometry {
  // Profil de mansarde : trapèze extrudé sur la profondeur
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0.36, 0.7);
  shape.lineTo(0.3, 1);
  shape.lineTo(-0.3, 1);
  shape.lineTo(-0.36, 0.7);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
}

const LIGHT_COLORS = ['#ffb050', '#ffd08a', '#ffe3b0', '#ffa640', '#bcd0ff'];

export function Skyline({ rows, lightCount }: { rows: number; lightCount: number }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);
  const chimRef = useRef<THREE.InstancedMesh>(null);

  const { buildings, chimneys, lights } = useMemo(() => {
    const rnd = mulberry32(1889);
    const list: Building[] = [];
    const chims: { x: number; y: number; z: number; h: number }[] = [];
    const lightsTmp: { x: number; y: number; z: number; row: number }[] = [];
    const col = new THREE.Color();

    ROWS.slice(0, rows).forEach((row, rowIndex) => {
      const extent = Math.abs(row.z) * 1.15 + 20;
      let x = -extent;
      while (x < extent) {
        const w = range(rnd, 1.4, 3.3);
        const d = range(rnd, 2.2, 3.2);
        let body = range(rnd, row.hMin, row.hMax) * (0.9 + 0.1 * rnd());
        if (rnd() < 0.08) body *= 1.25;
        const roof = body * range(rnd, 0.28, 0.4);
        col.set(row.color);
        col.multiplyScalar(0.85 + rnd() * 0.3);
        const cx = x + w / 2;
        list.push({ x: cx, z: row.z + range(rnd, -1.2, 1.2), w, d, body, roof, color: col.clone() });
        const b = list[list.length - 1];

        const nChim = Math.floor(range(rnd, 1, 4));
        for (let c = 0; c < nChim; c++) {
          chims.push({
            x: cx + range(rnd, -w * 0.35, w * 0.35),
            y: GROUND_Y + body + roof * 0.85,
            z: b.z + range(rnd, -d * 0.2, d * 0.2),
            h: range(rnd, 0.35, 0.75),
          });
        }

        // Fenêtres éclairées sur la façade avant
        const cols = Math.max(1, Math.floor((w - 0.4) / 0.55));
        const floors = Math.max(1, Math.floor((body - 0.5) / 0.6));
        for (let f = 0; f < floors; f++) {
          for (let k = 0; k < cols; k++) {
            if (rnd() < 0.22) {
              lightsTmp.push({
                x: cx - w / 2 + 0.3 + ((k + 0.5) * (w - 0.6)) / cols,
                y: GROUND_Y + 0.5 + f * 0.6,
                z: b.z + d / 2 + 0.03,
                row: rowIndex,
              });
            }
          }
        }
        x += w + range(rnd, 0, 0.12);
      }
    });

    // Limiter le nombre de lumières selon la qualité (mélange déterministe)
    for (let i = lightsTmp.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [lightsTmp[i], lightsTmp[j]] = [lightsTmp[j], lightsTmp[i]];
    }
    return { buildings: list, chimneys: chims, lights: lightsTmp.slice(0, lightCount) };
  }, [rows, lightCount]);

  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const roofGeo = useMemo(() => makeRoofGeometry(), []);
  const bodyMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff' }), []);
  const roofMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff' }), []);
  const chimMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#0c1535' }), []);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const roof = roofRef.current;
    const chim = chimRef.current;
    if (!body || !roof || !chim) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const c = new THREE.Color();
    buildings.forEach((b, i) => {
      p.set(b.x, GROUND_Y + b.body / 2, b.z);
      s.set(b.w, b.body, b.d);
      body.setMatrixAt(i, m.compose(p, q, s));
      body.setColorAt(i, b.color);

      p.set(b.x, GROUND_Y + b.body, b.z);
      s.set(b.w * 0.99, b.roof, b.d * 0.99);
      roof.setMatrixAt(i, m.compose(p, q, s));
      c.copy(b.color).multiplyScalar(1.18);
      roof.setColorAt(i, c);
    });
    chimneys.forEach((h, i) => {
      p.set(h.x, h.y + h.h / 2, h.z);
      s.set(0.2, h.h, 0.2);
      chim.setMatrixAt(i, m.compose(p, q, s));
    });
    for (const im of [body, roof, chim]) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  }, [buildings, chimneys]);

  useEffect(
    () => () => {
      boxGeo.dispose();
      roofGeo.dispose();
      bodyMat.dispose();
      roofMat.dispose();
      chimMat.dispose();
    },
    [boxGeo, roofGeo, bodyMat, roofMat, chimMat],
  );

  const lightData = useMemo(() => {
    const rnd = mulberry32(555);
    const d = createGlowData(lights.length);
    const c = new THREE.Color();
    lights.forEach((l, i) => {
      d.positions[i * 3] = l.x;
      d.positions[i * 3 + 1] = l.y;
      d.positions[i * 3 + 2] = l.z;
      d.sizes[i] = range(rnd, 0.7, 1.3);
      d.phases[i] = rnd();
      // Vacillements lents : certaines fenêtres « respirent » un peu plus
      d.speeds[i] = rnd() > 0.9 ? range(rnd, 0.6, 1.4) : range(rnd, 0.08, 0.4);
      c.set(LIGHT_COLORS[Math.floor(rnd() * LIGHT_COLORS.length * (rnd() > 0.93 ? 1 : 0.8))] ?? LIGHT_COLORS[0]);
      const k = range(rnd, 0.55, 1);
      d.colors[i * 3] = c.r * k;
      d.colors[i * 3 + 1] = c.g * k;
      d.colors[i * 3 + 2] = c.b * k;
    });
    return d;
  }, [lights]);

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[boxGeo, bodyMat, buildings.length]} frustumCulled={false} />
      <instancedMesh ref={roofRef} args={[roofGeo, roofMat, buildings.length]} frustumCulled={false} />
      <instancedMesh ref={chimRef} args={[boxGeo, chimMat, chimneys.length]} frustumCulled={false} />
      <Landmarks />
      <GlowPoints data={lightData} size={1.5} twinkle={0.4} attenuate opacity={0.9} renderOrder={3} />
      {/* Sol de la ville, très loin sous la terrasse */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y - 0.02, -90]}>
        <planeGeometry args={[500, 240]} />
        <meshBasicMaterial color="#0a1230" />
      </mesh>
    </group>
  );
}

/** Dôme doré des Invalides et coupoles du Sacré-Cœur, discrets mais reconnaissables. */
function Landmarks() {
  const gold = useMemo(() => new THREE.MeshBasicMaterial({ color: '#8a6a30' }), []);
  const stone = useMemo(() => new THREE.MeshBasicMaterial({ color: '#16224c' }), []);
  const cream = useMemo(() => new THREE.MeshBasicMaterial({ color: '#4d557c' }), []);
  useEffect(
    () => () => {
      gold.dispose();
      stone.dispose();
      cream.dispose();
    },
    [gold, stone, cream],
  );
  return (
    <group>
      {/* Les Invalides */}
      <group position={[19, GROUND_Y, -54]}>
        <mesh position={[0, 1.7, 0]} material={stone}>
          <boxGeometry args={[7, 3.4, 3.6]} />
        </mesh>
        <mesh position={[0, 4, 0]} material={stone}>
          <cylinderGeometry args={[1.25, 1.35, 1.4, 16]} />
        </mesh>
        <mesh position={[0, 4.7, 0]} material={gold} scale={[1, 1.15, 1]}>
          <sphereGeometry args={[1.15, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh position={[0, 6.4, 0]} material={gold}>
          <coneGeometry args={[0.1, 1.9, 6]} />
        </mesh>
      </group>
      {/* Le Sacré-Cœur */}
      <group position={[-33, GROUND_Y, -84]}>
        <mesh position={[0, 2.2, 0]} material={stone}>
          <boxGeometry args={[9, 4.4, 4]} />
        </mesh>
        <mesh position={[0, 5.2, 0]} material={cream} scale={[1, 1.35, 1]}>
          <sphereGeometry args={[1.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        {[-2.9, 2.9, -1.5, 1.5].map((x, i) => (
          <mesh key={i} position={[x, 4.4, 0.4]} material={cream} scale={[1, 1.4, 1]}>
            <sphereGeometry args={[i < 2 ? 0.95 : 0.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
