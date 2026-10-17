import * as THREE from 'three';
import { mulberry32 } from './random';

/**
 * Textures entièrement procédurales (canvas 2D) : aucun fichier image externe,
 * donc aucun risque de lien brisé. Chaque fonction renvoie une nouvelle texture
 * que l'appelant doit libérer avec `dispose()`.
 */

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible');
  return [canvas, ctx];
}

function toTexture(canvas: HTMLCanvasElement, repeat = false): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  return t;
}

/** Bois chaud (noyer clair) avec veinage. */
export function createWoodTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  const rnd = mulberry32(11);
  ctx.fillStyle = '#8c5b34';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 160; i++) {
    const y = rnd() * 512;
    const amp = 2 + rnd() * 10;
    const freq = 0.004 + rnd() * 0.012;
    const phase = rnd() * 6.28;
    ctx.strokeStyle = `rgba(${rnd() > 0.5 ? '60,35,18' : '170,118,70'},${0.05 + rnd() * 0.16})`;
    ctx.lineWidth = 0.6 + rnd() * 2.2;
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      const yy = y + Math.sin(x * freq + phase) * amp;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  return toTexture(canvas, true);
}

/** Dalles de pierre sombre éclairées par la lune, avec joints et grain. */
export function createStoneTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  const rnd = mulberry32(5);
  const tiles = 2;
  const size = 512 / tiles;
  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const l = 36 + rnd() * 10;
      ctx.fillStyle = `rgb(${l + 8},${l + 14},${l + 36})`;
      ctx.fillRect(tx * size, ty * size, size, size);
      for (let i = 0; i < 600; i++) {
        const a = rnd() * 0.12;
        ctx.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,10,${a * 1.6})`;
        ctx.fillRect(tx * size + rnd() * size, ty * size + rnd() * size, 1 + rnd() * 3, 1 + rnd() * 3);
      }
    }
  }
  ctx.strokeStyle = 'rgba(5,8,22,0.85)';
  ctx.lineWidth = 5;
  for (let i = 0; i <= tiles; i++) {
    ctx.beginPath();
    ctx.moveTo(i * size, 0);
    ctx.lineTo(i * size, 512);
    ctx.moveTo(0, i * size);
    ctx.lineTo(512, i * size);
    ctx.stroke();
  }
  return toTexture(canvas, true);
}

/**
 * Papier ivoire à fines fibres. `inside` ajoute des lignes d'écriture manuscrite
 * stylisées (traits sinueux, aucun texte lisible : le vrai message est en HTML).
 */
export function createPaperTexture(inside: boolean): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 384);
  const rnd = mulberry32(inside ? 77 : 78);
  ctx.fillStyle = '#f6ecd4';
  ctx.fillRect(0, 0, 512, 384);
  for (let i = 0; i < 2600; i++) {
    const a = rnd() * 0.08;
    ctx.fillStyle = rnd() > 0.5 ? `rgba(120,90,50,${a})` : `rgba(255,255,255,${a * 2})`;
    ctx.fillRect(rnd() * 512, rnd() * 384, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  if (inside) {
    ctx.strokeStyle = 'rgba(70,48,38,0.55)';
    ctx.lineCap = 'round';
    for (let row = 0; row < 8; row++) {
      const y = 70 + row * 36;
      let x = 46;
      const end = row === 7 ? 220 : 466 - rnd() * 40;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      while (x < end) {
        x += 6 + rnd() * 9;
        const amp = 5 + rnd() * 9;
        ctx.quadraticCurveTo(x - 3, y - amp * (rnd() > 0.5 ? 1 : 0.4), x, y + (rnd() - 0.5) * 3);
        if (rnd() > 0.86) {
          x += 8 + rnd() * 10; // espace entre deux mots
          ctx.moveTo(x, y);
        }
      }
      ctx.stroke();
    }
  }
  return toTexture(canvas);
}
