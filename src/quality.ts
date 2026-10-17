/**
 * Détection du niveau de qualité selon l'appareil (GPU/mémoire/écran tactile).
 * Toutes les valeurs ci-dessous sont des plafonds raisonnables ; un
 * PerformanceMonitor réduit encore la résolution si les images chutent.
 */

export type Tier = 'low' | 'medium' | 'high';

export interface Quality {
  tier: Tier;
  dprMax: number;
  antialias: boolean;
  shadowMap: number;
  envResolution: number;
  stars: number;
  dust: number;
  cityLights: number;
  towerSparkles: number;
  fireworkBursts: number;
  fireworkParticles: number;
  fireworkTrails: number;
  hearts: number;
  balusterSegments: number;
  skylineRows: number;
}

interface NavigatorExtras {
  deviceMemory?: number;
}

export function detectTier(): Tier {
  if (typeof window === 'undefined') return 'medium';
  const nav = navigator as Navigator & NavigatorExtras;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const mem = nav.deviceMemory ?? (coarse ? 4 : 8);
  const cores = nav.hardwareConcurrency ?? 4;

  if (coarse) {
    if (mem <= 3 || cores <= 4) return 'low';
    if (mem >= 8 && cores >= 8) return 'high';
    return 'medium';
  }
  if (cores <= 2 || mem <= 2) return 'low';
  if (cores <= 4) return 'medium';
  return 'high';
}

const TABLE: Record<Tier, Quality> = {
  low: {
    tier: 'low',
    dprMax: 1.25,
    antialias: false,
    shadowMap: 512,
    envResolution: 64,
    stars: 1500,
    dust: 36,
    cityLights: 420,
    towerSparkles: 70,
    fireworkBursts: 4,
    fireworkParticles: 90,
    fireworkTrails: 2,
    hearts: 14,
    balusterSegments: 6,
    skylineRows: 4,
  },
  medium: {
    tier: 'medium',
    dprMax: 1.75,
    antialias: true,
    shadowMap: 1024,
    envResolution: 128,
    stars: 2600,
    dust: 80,
    cityLights: 760,
    towerSparkles: 120,
    fireworkBursts: 5,
    fireworkParticles: 130,
    fireworkTrails: 3,
    hearts: 22,
    balusterSegments: 8,
    skylineRows: 5,
  },
  high: {
    tier: 'high',
    dprMax: 2,
    antialias: true,
    shadowMap: 2048,
    envResolution: 256,
    stars: 3800,
    dust: 140,
    cityLights: 1200,
    towerSparkles: 180,
    fireworkBursts: 6,
    fireworkParticles: 190,
    fireworkTrails: 3,
    hearts: 34,
    balusterSegments: 10,
    skylineRows: 5,
  },
};

export const getQuality = (tier: Tier = detectTier()): Quality => TABLE[tier];

/** Vrai si un contexte WebGL peut être créé. */
export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return false;
    const lose = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
    lose?.loseContext();
    return true;
  } catch {
    return false;
  }
}
