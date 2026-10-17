import { CONFIG } from './config';
import { getUI, setUI } from './store';

/**
 * Audio optionnel. Rien ne démarre avant un geste explicite de l'utilisateur (bouton « Musique »).
 * Par défaut, une ambiance nocturne douce (accords lents + léger scintillement) est synthétisée en direct :
 * aucun fichier externe, donc aucun lien brisé. Si CONFIG.audio.musicSrc est renseigné, ce fichier est lu à la place
 * (et si son chargement échoue, on retombe sur l'ambiance générée).
 */

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicEl: HTMLAudioElement | null = null;
let padTimer: number | null = null;
let started = false;
let userMuted = false;

function getCtx(): Ctx | null {
  if (ctx) return ctx;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = CONFIG.audio.sfxVolume;
    sfxBus.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

// Gamme douce (la mineur pentatonique étendue) — accords lents
const CHORDS: number[][] = [
  [220.0, 261.63, 329.63, 392.0], // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [196.0, 246.94, 293.66, 392.0], // G
  [164.81, 220.0, 261.63, 329.63], // Am/E
];

function playChord(c: Ctx, out: AudioNode, notes: number[], when: number, dur: number) {
  for (const f of notes) {
    for (const detune of [-5, 5]) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      o.detune.value = detune;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(0.05, when + dur * 0.45);
      g.gain.linearRampToValueAtTime(0, when + dur);
      o.connect(g).connect(out);
      o.start(when);
      o.stop(when + dur + 0.1);
    }
  }
}

function startPad(c: Ctx) {
  if (!master || padTimer !== null) return;
  const out = master;
  let i = 0;
  const step = () => {
    const now = c.currentTime;
    playChord(c, out, CHORDS[i % CHORDS.length], now, 8.5);
    // petite note de « célesta » aléatoire
    const bell = CHORDS[i % CHORDS.length][Math.floor(Math.random() * 4)] * 2;
    for (let k = 0; k < 2; k++) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = bell * (k === 0 ? 1 : 1.5);
      const t0 = now + 2 + k * 2.2;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.028, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
      o.connect(g).connect(out);
      o.start(t0);
      o.stop(t0 + 2.6);
    }
    i++;
  };
  step();
  padTimer = window.setInterval(step, 7000);
}

function stopPad() {
  if (padTimer !== null) {
    window.clearInterval(padTimer);
    padTimer = null;
  }
}

function fadeMaster(target: number, seconds = 1.2) {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(target, t + seconds);
}

async function startMusic(): Promise<boolean> {
  const c = getCtx();
  if (!c) return false;
  try {
    if (c.state === 'suspended') await c.resume();
  } catch {
    return false;
  }

  const src = CONFIG.audio.musicSrc;
  if (src && !musicEl) {
    musicEl = new Audio(src);
    musicEl.loop = true;
    musicEl.volume = 0;
    musicEl.addEventListener('error', () => {
      // Fichier absent ou illisible : on retombe sur l'ambiance générée
      musicEl = null;
      if (getUI().musicOn && !userMuted) {
        startPad(c);
        fadeMaster(CONFIG.audio.volume);
      }
    });
  }
  if (musicEl) {
    try {
      await musicEl.play();
      fadeElement(musicEl, CONFIG.audio.volume);
    } catch {
      musicEl = null;
      startPad(c);
      fadeMaster(CONFIG.audio.volume);
    }
  } else {
    startPad(c);
    fadeMaster(CONFIG.audio.volume);
  }
  started = true;
  return true;
}

function fadeElement(el: HTMLAudioElement, target: number, ms = 1200) {
  const from = el.volume;
  const t0 = performance.now();
  const tick = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    el.volume = Math.max(0, Math.min(1, from + (target - from) * k));
    if (k < 1) requestAnimationFrame(tick);
    else if (target === 0) el.pause();
  };
  requestAnimationFrame(tick);
}

/** Renvoie false si l'audio demandé n'a pas pu démarrer. */
export async function setMusic(on: boolean): Promise<boolean> {
  if (on) {
    userMuted = false;
    const ok = await startMusic();
    setUI({ musicOn: ok });
    return ok;
  } else {
    userMuted = true;
    setUI({ musicOn: false });
    fadeMaster(0, 0.6);
    if (musicEl) fadeElement(musicEl, 0, 600);
    window.setTimeout(() => {
      if (userMuted) stopPad();
    }, 700);
    return true;
  }
}

export const toggleMusic = () => setMusic(!getUI().musicOn);

function audible(): boolean {
  return started && !userMuted && getUI().musicOn && !!ctx && !!sfxBus;
}

/** Effets sonores très discrets, uniquement si la personne a activé le son. */
export const sfx = {
  paper() {
    if (!audible() || !ctx || !sfxBus) return;
    const dur = 0.5;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.sin((i / data.length) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env * env * 0.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2600;
    filter.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0.22;
    src.connect(filter).connect(g).connect(sfxBus);
    src.start();
  },
  burst() {
    if (!audible() || !ctx || !sfxBus) return;
    const t = ctx.currentTime;
    // « pop » étouffé et lointain + petit scintillement
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.35);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(sfxBus);
    o.start(t);
    o.stop(t + 0.55);
    for (let k = 0; k < 4; k++) {
      const s = ctx.createOscillator();
      const sg = ctx.createGain();
      s.type = 'sine';
      s.frequency.value = 1800 + Math.random() * 2600;
      const t0 = t + 0.18 + k * 0.09 + Math.random() * 0.05;
      sg.gain.setValueAtTime(0, t0);
      sg.gain.linearRampToValueAtTime(0.012, t0 + 0.01);
      sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
      s.connect(sg).connect(sfxBus);
      s.start(t0);
      s.stop(t0 + 0.4);
    }
  },
};

export function disposeAudio() {
  stopPad();
  musicEl?.pause();
  musicEl = null;
  void ctx?.close();
  ctx = null;
  master = null;
  sfxBus = null;
  started = false;
}
