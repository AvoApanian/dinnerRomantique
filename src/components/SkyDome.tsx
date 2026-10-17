import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../config';

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform float uMilky;
  varying vec3 vDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
          mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
          mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -0.2, 1.0);

    // Dégradé vertical : horizon bleu nuit → bleu minuit → bleu presque noir
    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.5, h));
    col = mix(col, uTop, smoothstep(0.22, 0.95, h));

    // Lueur chaude de la ville, plus forte dans l'axe de la tour
    float az = atan(d.x, -d.z);
    float glow = exp(-pow(h * 6.0, 2.0)) * (0.3 + 0.7 * exp(-az * az * 1.1));
    col += uGlow * glow * 0.5;

    // Voile de brume proche de l'horizon
    col = mix(col, uHorizon * 1.15, exp(-h * 12.0) * 0.3);

    // Très discrète voie lactée en bande diagonale
    if (uMilky > 0.0 && h > 0.04) {
      vec3 axis = normalize(vec3(0.35, 0.3, -0.85));
      float band = exp(-pow(dot(d, axis) / 0.2, 2.0));
      float n = noise(d * 7.0) * 0.55 + noise(d * 15.0) * 0.3 + noise(d * 33.0) * 0.15;
      col += vec3(0.30, 0.38, 0.62) * band * n * 0.16 * uMilky * smoothstep(0.04, 0.3, h);
    }

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Ciel : dôme dégradé qui suit la caméra (profondeur infinie, sans parallaxe). */
export function SkyDome({ detailed }: { detailed: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => new THREE.SphereGeometry(500, 32, 20), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color(CONFIG.colors.skyTop) },
          uMid: { value: new THREE.Color(CONFIG.colors.skyMid) },
          uHorizon: { value: new THREE.Color(CONFIG.colors.skyHorizon) },
          uGlow: { value: new THREE.Color(CONFIG.colors.horizonGlow) },
          uMilky: { value: detailed ? 1 : 0 },
        },
      }),
    [detailed],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state) => {
    mesh.current?.position.copy(state.camera.position);
  });

  return <mesh ref={mesh} geometry={geometry} material={material} renderOrder={-100} frustumCulled={false} />;
}
