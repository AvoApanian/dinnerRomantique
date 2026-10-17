import { useMemo } from 'react';
import * as THREE from 'three';
import { createGlowData, GlowPoints } from './GlowPoints';
import { mulberry32, range } from '../random';

/** Fines particules dorées en suspension dans l'air tiède de la terrasse. */
export function Dust({ count }: { count: number }) {
  const data = useMemo(() => {
    const rnd = mulberry32(777);
    const d = createGlowData(count);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      d.positions[i * 3] = range(rnd, -4.5, 4.5);
      d.positions[i * 3 + 1] = range(rnd, 0.2, 4.2);
      d.positions[i * 3 + 2] = range(rnd, -5, 4);
      d.sizes[i] = range(rnd, 0.5, 1.4);
      d.phases[i] = rnd();
      d.speeds[i] = range(rnd, 0.5, 1.8);
      c.set(rnd() > 0.35 ? '#ffd9a0' : '#cfe0ff');
      const k = range(rnd, 0.4, 0.9);
      d.colors[i * 3] = c.r * k;
      d.colors[i * 3 + 1] = c.g * k;
      d.colors[i * 3 + 2] = c.b * k;
    }
    return d;
  }, [count]);

  return <GlowPoints data={data} size={0.2} twinkle={0.7} attenuate opacity={0.55} drift={0.28} renderOrder={5} />;
}
