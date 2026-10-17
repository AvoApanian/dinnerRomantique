import { useSyncExternalStore } from 'react';

/**
 * Deux niveaux d'état :
 *  - `ui`   : état « React » (phase, prêt, effets…) → déclenche des rendus, change rarement.
 *  - `anim` : valeurs mutables lues chaque image par la 3D → ne déclenche jamais de rendu React.
 */

export type Phase = 'intro' | 'idle' | 'opening' | 'open' | 'closing';
export type EffectsLevel = 'full' | 'reduced' | 'off';

export interface UIState {
  ready: boolean;
  phase: Phase;
  effects: EffectsLevel;
  musicOn: boolean;
  contextLost: boolean;
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let ui: UIState = {
  ready: false,
  phase: 'intro',
  effects: prefersReducedMotion ? 'reduced' : 'full',
  musicOn: false,
  contextLost: false,
};

const listeners = new Set<() => void>();

export const getUI = (): UIState => ui;

export function setUI(patch: Partial<UIState>): void {
  let changed = false;
  for (const key of Object.keys(patch) as (keyof UIState)[]) {
    if (ui[key] !== patch[key]) changed = true;
  }
  if (!changed) return;
  ui = { ...ui, ...patch };
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useUI<T>(selector: (s: UIState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(ui),
    () => selector(ui),
  );
}

/** Valeurs d'animation mutables (jamais de setState par image). */
export const anim = {
  /** Progression du travelling d'arrivée, 0 → 1. */
  introT: 0,
  /** Progression de la caméra vers la lettre, 0 → 1 (déjà adoucie). */
  openT: 0,
  /** Dépliage du papier, 0 (plié) → 1 (ouvert). */
  paperT: 0,
  /** Survol / appui de la lettre, 0 → 1. */
  hover: 0,
  /** Temps écoulé dans la transition courante (s). */
  t: 0,
  /** Les gerbes peuvent-elles être déclenchées ? */
  fireworksOn: false,
  /** Une gerbe d'ouverture doit être tirée (consommé par Fireworks). */
  firstBurst: false,
  /** Remise à zéro des particules (à la réouverture). */
  resetFireworks: false,
  fireworksFade: 1,
  /** Densité de cœurs (0 → 1) et opacité globale (0 → 1). */
  heartsAmount: 0,
  heartsFade: 0,
  /** Le premier tir d'ouverture a-t-il été déclenché ? */
  firstBurstDone: false,
  /** Pointeur normalisé (-1 → 1) pour la parallaxe. */
  pointer: { x: 0, y: 0 },
};

/** Facteur de durée des animations selon le niveau d'effets. */
export const durationScale = (): number => (ui.effects === 'full' ? 1 : 0.5);

export function openLetter(): void {
  if (ui.phase !== 'idle' && ui.phase !== 'intro') return;
  if (!ui.ready) return;
  anim.t = 0;
  anim.firstBurstDone = false;
  anim.resetFireworks = true;
  anim.fireworksFade = 1;
  anim.heartsAmount = 0;
  anim.heartsFade = 0;
  setUI({ phase: 'opening' });
}

export function closeLetter(): void {
  if (ui.phase !== 'open') return;
  anim.t = 0;
  anim.fireworksOn = false;
  setUI({ phase: 'closing' });
}

export function cycleEffects(): void {
  const next: EffectsLevel =
    ui.effects === 'full' ? 'reduced' : ui.effects === 'reduced' ? 'off' : 'full';
  setUI({ effects: next });
}
