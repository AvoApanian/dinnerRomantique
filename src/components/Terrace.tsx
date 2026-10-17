import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createStoneTexture } from '../textures';

/**
 * Terrasse parisienne : dallage de pierre, balustrade à balustres tournés, piliers.
 * La balustrade (instanciée) cadre la vue sur la ville sans la masquer.
 */

const WIDTH = 9.6;
const DEPTH = 7.4;
const CENTER_Z = 0.3;
const BACK_Z = CENTER_Z - DEPTH / 2 + 0.2; // -3.2 + ...
const SIDE_X = WIDTH / 2 - 0.2;
const RAIL_H = 0.86;

export function Terrace({ segments }: { segments: number }) {
  const balusters = useRef<THREE.InstancedMesh>(null);

  const stoneTex = useMemo(() => {
    const t = createStoneTexture();
    t.repeat.set(WIDTH, DEPTH);
    return t;
  }, []);

  const floorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.85, metalness: 0.02 }),
    [stoneTex],
  );
  const stoneMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#6b7499', roughness: 0.88, metalness: 0 }),
    [],
  );

  const balusterGeo = useMemo(() => {
    const prof: [number, number][] = [
      [0.0, 0],
      [0.07, 0],
      [0.07, 0.04],
      [0.05, 0.07],
      [0.045, 0.13],
      [0.068, 0.22],
      [0.072, 0.27],
      [0.05, 0.36],
      [0.038, 0.5],
      [0.052, 0.6],
      [0.068, 0.64],
      [0.0, 0.64],
    ];
    return new THREE.LatheGeometry(
      prof.map(([x, y]) => new THREE.Vector2(x, y)),
      segments,
    );
  }, [segments]);

  // Positions des balustres : fond + deux côtés
  const placements = useMemo(() => {
    const list: { x: number; z: number }[] = [];
    const step = 0.2;
    for (let x = -SIDE_X + 0.35; x <= SIDE_X - 0.35; x += step) list.push({ x, z: BACK_Z });
    for (let z = BACK_Z + 0.35; z <= CENTER_Z + DEPTH / 2 - 0.35; z += step) {
      list.push({ x: -SIDE_X, z });
      list.push({ x: SIDE_X, z });
    }
    return list;
  }, []);

  useLayoutEffect(() => {
    const im = balusters.current;
    if (!im) return;
    const m = new THREE.Matrix4();
    placements.forEach((p, i) => {
      m.compose(new THREE.Vector3(p.x, 0.26, p.z), new THREE.Quaternion(), new THREE.Vector3(1, 0.8, 1));
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
  }, [placements]);

  useEffect(
    () => () => {
      stoneTex.dispose();
      floorMat.dispose();
      stoneMat.dispose();
      balusterGeo.dispose();
    },
    [stoneTex, floorMat, stoneMat, balusterGeo],
  );

  const sideLen = DEPTH - 0.4;
  const sideZ = CENTER_Z + 0.2;

  return (
    <group>
      {/* Dallage */}
      <mesh position={[0, -0.15, CENTER_Z]} material={floorMat} receiveShadow>
        <boxGeometry args={[WIDTH, 0.3, DEPTH]} />
      </mesh>

      {/* Soubassement + main courante : fond */}
      <mesh position={[0, 0.13, BACK_Z]} material={stoneMat}>
        <boxGeometry args={[WIDTH - 0.2, 0.26, 0.36]} />
      </mesh>
      <mesh position={[0, RAIL_H - 0.06, BACK_Z]} material={stoneMat}>
        <boxGeometry args={[WIDTH - 0.2, 0.12, 0.34]} />
      </mesh>

      {/* côtés */}
      {[-SIDE_X, SIDE_X].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.13, sideZ]} material={stoneMat}>
            <boxGeometry args={[0.36, 0.26, sideLen]} />
          </mesh>
          <mesh position={[x, RAIL_H - 0.06, sideZ]} material={stoneMat}>
            <boxGeometry args={[0.34, 0.12, sideLen]} />
          </mesh>
        </group>
      ))}

      {/* Piliers d'angle et intermédiaires */}
      {[
        [-SIDE_X, BACK_Z],
        [SIDE_X, BACK_Z],
        [-SIDE_X, CENTER_Z + DEPTH / 2 - 0.2],
        [SIDE_X, CENTER_Z + DEPTH / 2 - 0.2],
        [-SIDE_X / 2, BACK_Z],
        [SIDE_X / 2, BACK_Z],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.47, 0]} material={stoneMat}>
            <boxGeometry args={[0.34, 0.94, 0.34]} />
          </mesh>
          <mesh position={[0, 0.98, 0]} material={stoneMat}>
            <boxGeometry args={[0.44, 0.08, 0.44]} />
          </mesh>
          <mesh position={[0, 1.06, 0]} material={stoneMat}>
            <sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        </group>
      ))}

      <instancedMesh
        ref={balusters}
        args={[balusterGeo, stoneMat, placements.length]}
        frustumCulled={false}
      />
    </group>
  );
}
