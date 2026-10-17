import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createWoodTexture } from '../textures';
import { TABLE_Y } from '../world';
import { anim, getUI } from '../store';
import { mulberry32, range } from '../random';

/**
 * Table dressée pour DEUX personnes : une table ronde sur piédestal, exactement deux chaises
 * (gauche/droite), deux assiettes avec leur plat, deux couverts, deux serviettes, deux verres,
 * un vase fleuri et trois bougies. Rien n'est généré dans une boucle ouverte : les deux
 * places sont écrites explicitement pour éviter tout doublon accidentel.
 */

const TABLE_R = 0.62;
const CHAIR_X = 0.7;
const PLATE_X = 0.33;

const lathe = (pts: [number, number][], seg = 40) =>
  new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    seg,
  );

function useAssets() {
  return useMemo(() => {
    const woodTex = createWoodTexture();
    woodTex.repeat.set(1.4, 1.4);
    woodTex.anisotropy = 8;

    const geo = {
      tableTop: new THREE.CylinderGeometry(TABLE_R, TABLE_R, 0.035, 56),
      tableRim: new THREE.TorusGeometry(TABLE_R, 0.011, 8, 64),
      pedestal: lathe([
        [0.0, 0],
        [0.3, 0],
        [0.3, 0.02],
        [0.22, 0.045],
        [0.07, 0.1],
        [0.05, 0.3],
        [0.058, 0.5],
        [0.1, 0.65],
        [0.22, 0.726],
        [0.0, 0.726],
      ]),
      plate: lathe(
        [
          [0.0, 0.0],
          [0.07, 0.0],
          [0.085, 0.004],
          [0.12, 0.014],
          [0.138, 0.02],
          [0.141, 0.024],
          [0.137, 0.025],
          [0.12, 0.017],
          [0.085, 0.008],
          [0.0, 0.0045],
        ],
        56,
      ),
      plateRim: new THREE.TorusGeometry(0.1395, 0.0016, 6, 56),
      glass: lathe(
        [
          [0.0, 0.0],
          [0.032, 0.0],
          [0.032, 0.003],
          [0.006, 0.007],
          [0.0045, 0.06],
          [0.008, 0.066],
          [0.018, 0.077],
          [0.026, 0.1],
          [0.028, 0.15],
          [0.0265, 0.19],
          [0.0255, 0.192],
          [0.0245, 0.19],
          [0.0255, 0.15],
          [0.024, 0.1],
          [0.016, 0.08],
          [0.004, 0.072],
        ],
        32,
      ),
      champagne: lathe(
        [
          [0.0, 0.082],
          [0.0165, 0.082],
          [0.0245, 0.102],
          [0.0262, 0.15],
          [0.0, 0.15],
        ],
        24,
      ),
      vase: lathe(
        [
          [0.0, 0],
          [0.03, 0],
          [0.045, 0.02],
          [0.052, 0.06],
          [0.042, 0.1],
          [0.026, 0.13],
          [0.03, 0.15],
          [0.026, 0.15],
          [0.022, 0.13],
          [0.0, 0.12],
        ],
        32,
      ),
      holder: lathe(
        [
          [0.0, 0],
          [0.03, 0],
          [0.03, 0.008],
          [0.012, 0.02],
          [0.01, 0.04],
          [0.022, 0.05],
          [0.026, 0.056],
          [0.0, 0.056],
        ],
        20,
      ),
      sphere: new THREE.SphereGeometry(1, 14, 10),
      box: new THREE.BoxGeometry(1, 1, 1),
      cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
      flame: new THREE.SphereGeometry(1, 10, 8),
    };

    const mat = {
      wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.55, metalness: 0 }),
      darkWood: new THREE.MeshStandardMaterial({ color: '#4a2d1b', roughness: 0.55 }),
      cushion: new THREE.MeshStandardMaterial({ color: '#8c5a68', roughness: 0.85 }),
      ceramic: new THREE.MeshStandardMaterial({ color: '#f5efe3', roughness: 0.22, side: THREE.DoubleSide }),
      gold: new THREE.MeshStandardMaterial({ color: '#d9ae5e', metalness: 0.85, roughness: 0.34 }),
      silver: new THREE.MeshStandardMaterial({ color: '#dcd8cf', metalness: 0.95, roughness: 0.28 }),
      napkin: new THREE.MeshStandardMaterial({ color: '#efe3c6', roughness: 0.92 }),
      glass: new THREE.MeshStandardMaterial({
        color: '#e8f0ff',
        roughness: 0.04,
        metalness: 0,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        side: THREE.DoubleSide,
        envMapIntensity: 1.6,
      }),
      champagne: new THREE.MeshStandardMaterial({
        color: '#f1d596',
        roughness: 0.1,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        emissive: '#a77a2c',
        emissiveIntensity: 0.25,
      }),
      vase: new THREE.MeshStandardMaterial({ color: '#e7e0d3', roughness: 0.25, side: THREE.DoubleSide }),
      wax: new THREE.MeshStandardMaterial({
        color: '#f3ead3',
        roughness: 0.5,
        emissive: '#ffcf8a',
        emissiveIntensity: 0.12,
      }),
      flame: new THREE.MeshBasicMaterial({ color: '#ffd887', toneMapped: false }),
      flameCore: new THREE.MeshBasicMaterial({ color: '#fff6dd', toneMapped: false }),
      steak: new THREE.MeshStandardMaterial({ color: '#7a4526', roughness: 0.55 }),
      crust: new THREE.MeshStandardMaterial({ color: '#4d2817', roughness: 0.4 }),
      sauce: new THREE.MeshStandardMaterial({ color: '#3d1c13', roughness: 0.18 }),
      potato: new THREE.MeshStandardMaterial({ color: '#c8913e', roughness: 0.62 }),
      bean: new THREE.MeshStandardMaterial({ color: '#4f8f3c', roughness: 0.6 }),
      herb: new THREE.MeshStandardMaterial({ color: '#6aa84f', roughness: 0.7, side: THREE.DoubleSide }),
      stem: new THREE.MeshStandardMaterial({ color: '#5a8a46', roughness: 0.7 }),
      petalIvory: new THREE.MeshStandardMaterial({ color: '#f6ecd8', roughness: 0.6 }),
      petalRose: new THREE.MeshStandardMaterial({ color: '#d9a2ad', roughness: 0.6 }),
      petalChampagne: new THREE.MeshStandardMaterial({ color: '#ecd3a0', roughness: 0.6 }),
      petalCore: new THREE.MeshStandardMaterial({ color: '#d9a63a', roughness: 0.5 }),
      sauceStroke: new THREE.MeshStandardMaterial({ color: '#52291b', roughness: 0.18 }),
    };

    const sauceStrokeGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.07, 0, 0.05),
        new THREE.Vector3(-0.02, 0, 0.075),
        new THREE.Vector3(0.04, 0, 0.065),
        new THREE.Vector3(0.085, 0, 0.02),
      ]),
      24,
      0.0035,
      6,
      false,
    );

    return { woodTex, geo: { ...geo, sauceStroke: sauceStrokeGeo }, mat };
  }, []);
}

type Assets = ReturnType<typeof useAssets>;

export function DinnerTable() {
  const assets = useAssets();

  useEffect(
    () => () => {
      assets.woodTex.dispose();
      Object.values(assets.geo).forEach((g) => g.dispose());
      Object.values(assets.mat).forEach((m) => m.dispose());
    },
    [assets],
  );

  return (
    <group>
      <Table a={assets} />
      {/* Deux places, écrites explicitement */}
      <Diner a={assets} side={-1} />
      <Diner a={assets} side={1} />
      {/* Deux verres */}
      <Glass a={assets} position={[-0.15, TABLE_Y, -0.12]} />
      <Glass a={assets} position={[0.15, TABLE_Y, -0.12]} />
      {/* Décor central */}
      <Flowers a={assets} position={[0, TABLE_Y, -0.2]} />
      <Candle a={assets} position={[-0.2, TABLE_Y, -0.4]} height={0.17} seed={1} />
      <Candle a={assets} position={[0.2, TABLE_Y, -0.4]} height={0.21} seed={2} />
      <Candle a={assets} position={[0.0, TABLE_Y, -0.5]} height={0.12} seed={3} />
    </group>
  );
}

function Table({ a }: { a: Assets }) {
  return (
    <group>
      <mesh geometry={a.geo.tableTop} material={a.mat.wood} position={[0, TABLE_Y - 0.0175, 0]} castShadow receiveShadow />
      <mesh
        geometry={a.geo.tableRim}
        material={a.mat.darkWood}
        position={[0, TABLE_Y - 0.0175, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh geometry={a.geo.pedestal} material={a.mat.darkWood} castShadow receiveShadow />
    </group>
  );
}

/** Une chaise de bistrot (face à +Z local). */
function Chair({ a }: { a: Assets }) {
  const legs: [number, number, number][] = [
    [-0.17, 0.225, 0.17],
    [0.17, 0.225, 0.17],
  ];
  return (
    <group>
      {/* assise + coussin */}
      <mesh geometry={a.geo.box} material={a.mat.darkWood} position={[0, 0.45, 0]} scale={[0.4, 0.04, 0.4]} castShadow receiveShadow />
      <mesh geometry={a.geo.box} material={a.mat.cushion} position={[0, 0.485, 0.01]} scale={[0.35, 0.035, 0.35]} castShadow />
      {/* pieds avant */}
      {legs.map((p, i) => (
        <mesh key={i} geometry={a.geo.cyl} material={a.mat.darkWood} position={p} scale={[0.017, 0.45, 0.017]} castShadow />
      ))}
      {/* montants arrière (jusqu'au dossier) */}
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} geometry={a.geo.cyl} material={a.mat.darkWood} position={[x, 0.465, -0.17]} scale={[0.017, 0.93, 0.017]} castShadow />
      ))}
      {/* barreaux de dossier */}
      <mesh geometry={a.geo.box} material={a.mat.darkWood} position={[0, 0.87, -0.17]} scale={[0.36, 0.055, 0.022]} castShadow />
      <mesh geometry={a.geo.box} material={a.mat.darkWood} position={[0, 0.72, -0.17]} scale={[0.36, 0.035, 0.018]} castShadow />
      {[-0.09, 0, 0.09].map((x) => (
        <mesh key={x} geometry={a.geo.box} material={a.mat.darkWood} position={[x, 0.79, -0.17]} scale={[0.018, 0.17, 0.014]} castShadow />
      ))}
      {/* entretoises */}
      <mesh geometry={a.geo.box} material={a.mat.darkWood} position={[0, 0.17, 0.17]} scale={[0.34, 0.016, 0.016]} />
      <mesh geometry={a.geo.box} material={a.mat.darkWood} position={[0, 0.17, -0.17]} scale={[0.34, 0.016, 0.016]} />
    </group>
  );
}

/**
 * Une place complète : chaise + assiette + plat + couverts + serviette.
 * `side` = -1 (gauche) ou +1 (droite). Le repère local regarde le centre de la table (+Z).
 */
function Diner({ a, side }: { a: Assets; side: -1 | 1 }) {
  const plateZ = CHAIR_X - PLATE_X;
  return (
    <group position={[side * CHAIR_X, 0, 0]} rotation={[0, -side * (Math.PI / 2), 0]} name={`diner-${side}`}>
      <Chair a={a} />
      <group position={[0, TABLE_Y, 0]}>
        {/* assiette */}
        <group position={[0, 0, plateZ]}>
          <mesh geometry={a.geo.plate} material={a.mat.ceramic} castShadow receiveShadow />
          <mesh geometry={a.geo.plateRim} material={a.mat.gold} position={[0, 0.0245, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <Meal a={a} />
        </group>
        {/* fourchette (à gauche du convive) */}
        <Fork a={a} position={[0.19, 0.003, plateZ]} />
        {/* couteau (à droite) */}
        <Knife a={a} position={[-0.19, 0.003, plateZ]} />
        {/* serviette pliée */}
        <group position={[0.31, 0, plateZ]} rotation={[0, 0.08 * side, 0]}>
          <mesh geometry={a.geo.box} material={a.mat.napkin} position={[0, 0.006, 0]} scale={[0.1, 0.012, 0.115]} castShadow receiveShadow />
          <mesh geometry={a.geo.box} material={a.mat.napkin} position={[0.005, 0.016, 0.025]} scale={[0.092, 0.008, 0.06]} castShadow />
        </group>
      </group>
    </group>
  );
}

function Fork({ a, position }: { a: Assets; position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh geometry={a.geo.box} material={a.mat.silver} position={[0, 0.002, -0.04]} scale={[0.011, 0.004, 0.115]} castShadow />
      <mesh geometry={a.geo.box} material={a.mat.silver} position={[0, 0.002, 0.04]} scale={[0.03, 0.004, 0.016]} castShadow />
      {[-0.011, -0.0037, 0.0037, 0.011].map((x) => (
        <mesh key={x} geometry={a.geo.box} material={a.mat.silver} position={[x, 0.002, 0.066]} scale={[0.0026, 0.0035, 0.04]} castShadow />
      ))}
    </group>
  );
}

function Knife({ a, position }: { a: Assets; position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh geometry={a.geo.box} material={a.mat.silver} position={[0, 0.002, -0.05]} scale={[0.012, 0.005, 0.095]} castShadow />
      <mesh geometry={a.geo.box} material={a.mat.silver} position={[0.001, 0.0015, 0.04]} scale={[0.017, 0.003, 0.095]} castShadow />
    </group>
  );
}

/** Plat dressé : médaillon snacké, sauce, pommes de terre, haricots verts, herbes. */
function Meal({ a }: { a: Assets }) {
  const potatoes: [number, number, number, number][] = [
    [0.05, 0.016, 0.03, 0.021],
    [0.062, 0.015, -0.006, 0.018],
    [0.04, 0.015, -0.034, 0.02],
  ];
  const beans = useMemo(() => {
    const rnd = mulberry32(8);
    return Array.from({ length: 7 }, (_, i) => ({
      x: -0.018 + i * 0.0062,
      rz: range(rnd, -0.08, 0.08),
      len: range(rnd, 0.062, 0.078),
    }));
  }, []);
  return (
    <group position={[0, 0.0055, 0]}>
      {/* coulis */}
      <mesh geometry={a.geo.sphere} material={a.mat.sauce} position={[-0.02, 0.001, 0]} scale={[0.062, 0.0012, 0.058]} />
      <mesh geometry={a.geo.sauceStroke} material={a.mat.sauceStroke} position={[0, 0.0045, 0]} />
      {/* médaillon */}
      <mesh geometry={a.geo.sphere} material={a.mat.steak} position={[-0.022, 0.014, -0.002]} scale={[0.05, 0.022, 0.05]} castShadow />
      <mesh geometry={a.geo.sphere} material={a.mat.crust} position={[-0.022, 0.026, -0.002]} scale={[0.04, 0.01, 0.04]} castShadow />
      {/* herbes */}
      {[
        [-0.03, 0.034, 0.004, 0.4],
        [-0.016, 0.034, -0.012, -0.5],
        [-0.025, 0.036, -0.002, 1.2],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} geometry={a.geo.sphere} material={a.mat.herb} position={[x, y, z]} rotation={[0.3, r, 0.2]} scale={[0.012, 0.0022, 0.005]} />
      ))}
      {/* pommes de terre */}
      {potatoes.map(([x, y, z, r], i) => (
        <mesh key={i} geometry={a.geo.sphere} material={a.mat.potato} position={[x, y, z]} rotation={[0, i * 1.3, 0]} scale={[r * 1.15, r * 0.8, r * 0.95]} castShadow />
      ))}
      {/* fagot de haricots verts */}
      <group position={[-0.015, 0.006, -0.062]} rotation={[0, 0.25, 0]}>
        {beans.map((b, i) => (
          <mesh key={i} geometry={a.geo.cyl} material={a.mat.bean} position={[b.x, 0, 0]} rotation={[Math.PI / 2, 0, b.rz]} scale={[0.0032, b.len, 0.0032]} castShadow />
        ))}
      </group>
    </group>
  );
}

function Glass({ a, position }: { a: Assets; position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh geometry={a.geo.champagne} material={a.mat.champagne} />
      <mesh geometry={a.geo.glass} material={a.mat.glass} renderOrder={4} />
    </group>
  );
}

/* ───────────────────────── Bougies ───────────────────────── */

function Candle({
  a,
  position,
  height,
  seed,
}: {
  a: Assets;
  position: [number, number, number];
  height: number;
  seed: number;
}) {
  const flame = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const glow = useRef<THREE.Sprite>(null);

  const glowMat = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,214,140,0.9)');
      g.addColorStop(0.25, 'rgba(255,180,90,0.35)');
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
  }, []);
  useEffect(
    () => () => {
      glowMat.map?.dispose();
      glowMat.dispose();
    },
    [glowMat],
  );

  useFrame((state) => {
    const effects = getUI().effects;
    const amp = effects === 'full' ? 1 : effects === 'reduced' ? 0.5 : 0.25;
    const t = state.clock.elapsedTime * 1.0 + seed * 10;
    // Vacillement organique : somme de sinus incommensurables
    const n =
      Math.sin(t * 7.3) * 0.5 + Math.sin(t * 11.7 + 1.3) * 0.3 + Math.sin(t * 3.1 + 0.4) * 0.2;
    if (flame.current) {
      flame.current.scale.set(1 + n * 0.07 * amp, 1 + n * 0.16 * amp, 1 + n * 0.07 * amp);
      flame.current.rotation.z = Math.sin(t * 2.3) * 0.08 * amp;
    }
    if (light.current) light.current.intensity = (0.95 + n * 0.14 * amp) * (1 - 0.28 * anim.openT);
    if (glow.current) glow.current.material.opacity = 0.8 + n * 0.12 * amp;
  });

  return (
    <group position={position}>
      <mesh geometry={a.geo.holder} material={a.mat.gold} castShadow />
      <mesh geometry={a.geo.cyl} material={a.mat.wax} position={[0, 0.056 + height / 2, 0]} scale={[0.0175, height, 0.0175]} castShadow />
      <group ref={flame} position={[0, 0.056 + height + 0.017, 0]}>
        <mesh geometry={a.geo.flame} material={a.mat.flame} scale={[0.0075, 0.019, 0.0075]} />
        <mesh geometry={a.geo.flame} material={a.mat.flameCore} position={[0, -0.003, 0]} scale={[0.0035, 0.009, 0.0035]} />
      </group>
      <sprite ref={glow} material={glowMat} position={[0, 0.056 + height + 0.018, 0]} scale={[0.2, 0.2, 1]} />
      <pointLight
        ref={light}
        position={[0, 0.056 + height + 0.04, 0]}
        color="#ffb866"
        intensity={0.95}
        distance={3.4}
        decay={1.8}
      />
    </group>
  );
}

/* ───────────────────────── Fleurs ───────────────────────── */

function Flowers({ a, position }: { a: Assets; position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);

  const stems = useMemo(() => {
    const rnd = mulberry32(2024);
    const petals = [a.mat.petalIvory, a.mat.petalRose, a.mat.petalChampagne, a.mat.petalIvory, a.mat.petalRose, a.mat.petalChampagne];
    return petals.map((mat, i) => {
      const ang = (i / petals.length) * Math.PI * 2 + rnd() * 0.6;
      const lean = range(rnd, 0.14, 0.42);
      const len = range(rnd, 0.2, 0.31);
      return { mat, ang, lean, len, phase: rnd() * 6.28 };
    });
  }, [a]);

  useFrame((state) => {
    const effects = getUI().effects;
    const amp = effects === 'full' ? 1 : effects === 'reduced' ? 0.4 : 0;
    const g = group.current;
    if (!g) return;
    g.children.forEach((child, i) => {
      const s = stems[i];
      if (!s) return;
      child.rotation.z = Math.sin(state.clock.elapsedTime * 0.9 + s.phase) * 0.018 * amp;
    });
  });

  return (
    <group position={position}>
      <mesh geometry={a.geo.vase} material={a.mat.vase} castShadow receiveShadow />
      <group ref={group} position={[0, 0.13, 0]}>
        {stems.map((s, i) => (
          <group key={i} rotation={[0, s.ang, 0]}>
            <group rotation={[0, 0, s.lean]}>
              <mesh geometry={a.geo.cyl} material={a.mat.stem} position={[0, s.len / 2, 0]} scale={[0.0035, s.len, 0.0035]} />
              {/* feuille */}
              <mesh
                geometry={a.geo.sphere}
                material={a.mat.herb}
                position={[0.012, s.len * 0.5, 0]}
                rotation={[0, 0, -0.6]}
                scale={[0.02, 0.0035, 0.008]}
              />
              {/* fleur */}
              <group position={[0, s.len, 0]}>
                {Array.from({ length: 6 }, (_, k) => (
                  <mesh
                    key={k}
                    geometry={a.geo.sphere}
                    material={s.mat}
                    position={[Math.cos((k / 6) * Math.PI * 2) * 0.014, 0.004, Math.sin((k / 6) * Math.PI * 2) * 0.014]}
                    rotation={[0, -(k / 6) * Math.PI * 2, 0.5]}
                    scale={[0.017, 0.007, 0.011]}
                    castShadow
                  />
                ))}
                <mesh geometry={a.geo.sphere} material={a.mat.petalCore} position={[0, 0.006, 0]} scale={[0.0075, 0.0075, 0.0075]} />
              </group>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}
