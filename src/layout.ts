import { CONFIG } from './config';

/**
 * Cadrage responsive : on interpole entre le cadrage « portrait » (mobile)
 * et le cadrage « desktop » selon le ratio d'écran, au lieu de réduire une
 * composition unique. Le portrait est la référence ; le large en est l'adaptation.
 */

export type Vec3 = [number, number, number];

export interface Pose {
  position: Vec3;
  target: Vec3;
  fov: number;
}

export interface ResolvedLayout {
  idle: Pose;
  /** Décalage appliqué au début (travelling d'arrivée). */
  introOffset: Pose;
  focus: Pose;
  towerZ: number;
  towerHeight: number;
  parallax: [number, number];
  /** 0 = portrait pur, 1 = desktop pur. */
  wide: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: readonly number[], b: readonly number[], t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

const lerpPose = (
  a: { position: readonly number[]; target: readonly number[]; fov: number },
  b: { position: readonly number[]; target: readonly number[]; fov: number },
  t: number,
): Pose => ({
  position: lerp3(a.position, b.position, t),
  target: lerp3(a.target, b.target, t),
  fov: lerp(a.fov, b.fov, t),
});

export function resolveLayout(aspect: number): ResolvedLayout {
  const p = CONFIG.layouts.portrait;
  const d = CONFIG.layouts.desktop;
  const raw = (aspect - p.aspect) / (d.aspect - p.aspect);
  const t = Math.min(1, Math.max(0, raw));
  // Courbe douce pour éviter des sauts lors d'une rotation d'écran.
  const s = t * t * (3 - 2 * t);
  return {
    idle: lerpPose(p.idle, d.idle, s),
    introOffset: lerpPose(p.intro, d.intro, s),
    focus: lerpPose(p.focus, d.focus, s),
    towerZ: lerp(p.towerZ, d.towerZ, s),
    towerHeight: lerp(p.towerHeight, d.towerHeight, s),
    parallax: [lerp(p.parallax[0], d.parallax[0], s), lerp(p.parallax[1], d.parallax[1], s)],
    wide: s,
  };
}

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
