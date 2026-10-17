import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getUI } from '../store';

/**
 * Nuage de points lumineux (étoiles, lumières de la ville, étincelles de la tour,
 * poussière dorée). Tout le scintillement est calculé sur le GPU : aucune mise à jour
 * par point côté JavaScript.
 */

export interface GlowData {
  positions: Float32Array;
  sizes: Float32Array;
  phases: Float32Array;
  speeds: Float32Array;
  colors: Float32Array; // RGB linéaire (THREE.Color)
}

export function createGlowData(count: number): GlowData {
  return {
    positions: new Float32Array(count * 3),
    sizes: new Float32Array(count),
    phases: new Float32Array(count),
    speeds: new Float32Array(count),
    colors: new Float32Array(count * 3),
  };
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uTwinkle;
  uniform float uAttenuate;
  uniform float uDrift;
  uniform float uSize;
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    p += uDrift * vec3(
      sin(uTime * 0.21 * aSpeed + aPhase * 6.2831),
      cos(uTime * 0.17 * aSpeed + aPhase * 9.0) * 0.6,
      sin(uTime * 0.13 * aSpeed + aPhase * 3.0)
    );
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float tw = 0.5 + 0.5 * sin(uTime * aSpeed + aPhase * 6.2831);
    float k = mix(1.0, 0.25 + 0.75 * tw, uTwinkle);
    float size = aSize * uSize * uPixelRatio;
    if (uAttenuate > 0.5) size *= 120.0 / max(-mv.z, 0.1);
    gl_PointSize = max(size * (0.8 + 0.2 * k), 1.0);
    vColor = aColor;
    vAlpha = k;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a;
    gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

interface Props {
  data: GlowData;
  /** Taille de base en pixels (multipliée par la taille de chaque point). */
  size?: number;
  /** Amplitude du scintillement (0–1). */
  twinkle?: number;
  /** Taille dépendante de la distance (objets proches ou intermédiaires). */
  attenuate?: boolean;
  opacity?: number;
  /** Amplitude de la dérive lente (unités du monde). */
  drift?: number;
  renderOrder?: number;
}

export function GlowPoints({
  data,
  size = 1,
  twinkle = 0.6,
  attenuate = false,
  opacity = 1,
  drift = 0,
  renderOrder = 0,
}: Props) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(data.phases, 1));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(data.speeds, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3));
    return g;
  }, [data]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uTwinkle: { value: twinkle },
          uAttenuate: { value: attenuate ? 1 : 0 },
          uDrift: { value: drift },
          uSize: { value: size },
          uOpacity: { value: opacity },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state) => {
    const effects = getUI().effects;
    const motion = effects === 'full' ? 1 : effects === 'reduced' ? 0.35 : 0;
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = state.gl.getPixelRatio();
    u.uTwinkle.value = twinkle * motion;
    u.uDrift.value = drift * motion;
    u.uSize.value = size;
    u.uOpacity.value = opacity;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={renderOrder} />;
}
