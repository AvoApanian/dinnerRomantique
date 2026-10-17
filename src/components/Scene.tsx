import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { CONFIG } from '../config';
import { anim, durationScale, getUI, setUI } from '../store';
import { clamp01, easeInOutCubic, easeOutCubic, resolveLayout, smoothstep } from '../layout';
import { getQuality, type Quality } from '../quality';
import { sfx } from '../audio';
import { SkyDome } from './SkyDome';
import { Stars, ShootingStars } from './Stars';
import { Dust } from './Dust';
import { EiffelTower } from './EiffelTower';
import { Skyline } from './Skyline';
import { Terrace } from './Terrace';
import { DinnerTable } from './DinnerTable';
import { LoveLetter } from './LoveLetter';
import { Fireworks } from './Fireworks';
import { FloatingHearts } from './FloatingHearts';

const tmpPos = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();
const lookMatrix = new THREE.Matrix4();
const upVec = new THREE.Vector3(0, 1, 0);

/**
 * Caméra cinématique + chef d'orchestre des phases. Toutes les valeurs d'animation vivent dans `anim`
 * (mutées chaque image, sans rendu React). Le cadrage est recalculé à chaque image à partir du ratio
 * d'écran : la rotation de l'appareil ou le redimensionnement n'interrompent rien.
 */
function Director() {
  const { camera, size } = useThree();
  const frames = useRef(0);
  const smoothPointer = useRef({ x: 0, y: 0 });
  const closeFrom = useRef({ open: 1, paper: 1 });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const ui = getUI();
    const cam = camera as THREE.PerspectiveCamera;
    const scale = durationScale();

    // Prêt dès que quelques images ont été rendues (shaders compilés)
    if (!ui.ready) {
      frames.current++;
      if (frames.current === 4) setUI({ ready: true });
    }

    /* ── Travelling d'arrivée (n'attend jamais l'utilisateur : la lettre reste cliquable) ── */
    if (ui.ready && anim.introT < 1) {
      const dur = CONFIG.motion.introSeconds * (ui.effects === 'full' ? 1 : 0.4);
      anim.introT = Math.min(1, anim.introT + dt / dur);
      if (anim.introT >= 1 && ui.phase === 'intro') setUI({ phase: 'idle' });
    }

    /* ── Phases de la lettre ── */
    if (ui.phase === 'opening') {
      const dur = CONFIG.motion.openSeconds * scale;
      anim.t += dt;
      const k = clamp01(anim.t / dur);
      anim.openT = easeInOutCubic(k);
      anim.paperT = smoothstep(0.3, 0.85, k);
      closeFrom.current = { open: 1, paper: 1 };

      const first = CONFIG.fireworks.firstBurstAt * scale;
      if (!anim.firstBurstDone && anim.t >= first) {
        anim.firstBurstDone = true;
        anim.firstBurst = true;
        anim.fireworksOn = true;
      }
      if (anim.t === dt) sfx.paper();
      // Cœurs : quelques-uns d'abord, puis davantage
      if (anim.t > first + 0.4 * scale) {
        anim.heartsFade = Math.min(1, anim.heartsFade + dt * 0.7);
        anim.heartsAmount = Math.min(0.35, anim.heartsAmount + dt * 0.25);
      }
      if (k >= 1) setUI({ phase: 'open' });
    } else if (ui.phase === 'open') {
      anim.openT = 1;
      anim.paperT = 1;
      anim.heartsFade = Math.min(1, anim.heartsFade + dt * 0.7);
      anim.heartsAmount = Math.min(1, anim.heartsAmount + dt * 0.12);
      anim.fireworksOn = true;
    } else if (ui.phase === 'closing') {
      const dur = CONFIG.motion.closeSeconds * scale;
      anim.t += dt;
      const k = clamp01(anim.t / dur);
      anim.openT = 1 - easeInOutCubic(k);
      anim.paperT = 1 - easeOutCubic(clamp01(k * 1.5));
      anim.heartsFade = Math.max(0, anim.heartsFade - dt * 0.9);
      anim.fireworksFade = Math.max(0, anim.fireworksFade - dt * 0.8);
      anim.fireworksOn = false;
      if (k >= 1) {
        anim.openT = 0;
        anim.paperT = 0;
        anim.heartsFade = 0;
        anim.heartsAmount = 0;
        anim.fireworksFade = 0;
        setUI({ phase: 'idle' });
      }
    }

    /* ── Parallaxe du pointeur (douce, bornée) ── */
    const sp = smoothPointer.current;
    const par = CONFIG.motion.parallax * (ui.effects === 'full' ? 1 : ui.effects === 'reduced' ? 0.25 : 0);
    const locked = ui.phase === 'idle' || ui.phase === 'intro' ? 1 : 0.25;
    sp.x += (anim.pointer.x * par * locked - sp.x) * (1 - Math.exp(-dt * 3.2));
    sp.y += (anim.pointer.y * par * locked - sp.y) * (1 - Math.exp(-dt * 3.2));

    /* ── Pose de la caméra ── */
    const L = resolveLayout(size.width / Math.max(size.height, 1));
    const e = easeInOutCubic(anim.introT);
    const intro = 1 - e;
    const o = anim.openT;

    for (let i = 0; i < 3; i++) {
      const idleP = L.idle.position[i] + L.introOffset.position[i] * intro * (i === 2 ? 1 : 0.6);
      tmpPos.setComponent(i, THREE.MathUtils.lerp(idleP, L.focus.position[i], o));
      const idleT = L.idle.target[i] + L.introOffset.target[i] * intro * (i === 1 ? 1 : 0.4);
      tmpTarget.setComponent(i, THREE.MathUtils.lerp(idleT, L.focus.target[i], o));
    }
    // Parallaxe : légers décalages latéral/vertical, jamais assez pour traverser la table
    const px = sp.x * L.parallax[0] * (1 - o * 0.7);
    const py = sp.y * L.parallax[1] * (1 - o * 0.7);
    tmpPos.x += px;
    tmpPos.y = Math.max(1.12, tmpPos.y + py);
    tmpTarget.x += px * 0.25;

    cam.position.copy(tmpPos);
    lookMatrix.lookAt(tmpPos, tmpTarget, upVec);
    cam.quaternion.setFromRotationMatrix(lookMatrix);

    const fov = THREE.MathUtils.lerp(L.idle.fov + L.introOffset.fov * intro, L.focus.fov, o);
    if (Math.abs(cam.fov - fov) > 0.001) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}

/** Lumières : lune bleutée, lueur de ville ambrée, bougies (dans DinnerTable). Atténuées à l'ouverture. */
function Lights({ shadowMap }: { shadowMap: number }) {
  const moon = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    const dim = 1 - 0.32 * anim.openT;
    if (moon.current) moon.current.intensity = 0.9 * dim;
    if (hemi.current) hemi.current.intensity = 0.55 * dim;
    if (fill.current) fill.current.intensity = 0.35 * dim;
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#6f86d6', '#2a1f2a', 0.55]} />
      <directionalLight
        ref={moon}
        color="#a9bdff"
        intensity={0.9}
        position={[-3.5, 6, 3]}
        castShadow={shadowMap > 0}
        shadow-mapSize={[shadowMap, shadowMap]}
        shadow-camera-left={-2.4}
        shadow-camera-right={2.4}
        shadow-camera-top={2.4}
        shadow-camera-bottom={-2.4}
        shadow-camera-near={1}
        shadow-camera-far={14}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {/* Contre-jour ambré venant de la ville */}
      <directionalLight ref={fill} color="#ff9d4a" intensity={0.35} position={[2, 1.5, -6]} />
    </>
  );
}

/** Environnement de réflexion minuscule et local (aucun HDR téléchargé) pour les métaux et le verre. */
function Reflections({ resolution }: { resolution: number }) {
  return (
    <Environment resolution={resolution} frames={1} environmentIntensity={0.55}>
      <color attach="background" args={['#0a1230']} />
      <Lightformer form="rect" intensity={1.4} color="#ffd9a0" position={[0, 2, -6]} scale={[10, 3, 1]} />
      <Lightformer form="rect" intensity={0.9} color="#8fa6ff" position={[-5, 3, 2]} rotation={[0, 1.2, 0]} scale={[6, 3, 1]} />
      <Lightformer form="circle" intensity={1.2} color="#ffb866" position={[0, 1.5, 3]} scale={3} />
    </Environment>
  );
}

function PointerTracking() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && e.buttons === 0) return;
      anim.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      anim.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onLeave = () => {
      anim.pointer.x = 0;
      anim.pointer.y = 0;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onLeave, { passive: true });
    window.addEventListener('pointercancel', onLeave, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onLeave);
      window.removeEventListener('pointercancel', onLeave);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);
  return null;
}

function ResponsiveWorld({ quality }: { quality: Quality }) {
  const size = useThree((s) => s.size);
  const L = useMemo(() => resolveLayout(size.width / Math.max(size.height, 1)), [size.width, size.height]);
  return (
    <EiffelTower height={L.towerHeight} z={L.towerZ} sparkleCount={quality.towerSparkles} />
  );
}

export function Scene() {
  const quality = useMemo(() => getQuality(), []);
  const [dpr, setDpr] = useState<number>(Math.min(quality.dprMax, window.devicePixelRatio || 1));

  return (
    <Canvas
      className="scene-canvas"
      dpr={dpr}
      shadows={quality.shadowMap > 0}
      camera={{ fov: 50, near: 0.1, far: 700, position: [0, 1.6, 3.6] }}
      gl={{
        antialias: quality.antialias,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(CONFIG.colors.midnight);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.shadowMap.type = THREE.PCFShadowMap;
        const canvas = gl.domElement;
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          setUI({ contextLost: true });
        });
      }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(1, d - 0.25))}
        flipflops={3}
        onFallback={() => setDpr(1)}
      />
      <Director />
      <PointerTracking />

      <SkyDome detailed={quality.tier !== 'low'} />
      <Stars count={quality.stars} />
      <ShootingStars />
      <Lights shadowMap={quality.shadowMap} />
      <Reflections resolution={quality.envResolution} />

      <ResponsiveWorld quality={quality} />
      <Skyline rows={quality.skylineRows} lightCount={quality.cityLights} />
      <Terrace segments={quality.tier === 'low' ? 6 : quality.tier === 'medium' ? 8 : 10} />
      <DinnerTable />
      <LoveLetter />
      <Dust count={quality.dust} />

      <Fireworks quality={quality} />
      <FloatingHearts count={quality.hearts} />
    </Canvas>
  );
}
