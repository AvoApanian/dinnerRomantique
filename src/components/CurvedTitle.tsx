import { motion } from 'framer-motion';
import { CONFIG } from '../config';
import { useUI } from '../store';

/**
 * Titre sur un véritable chemin courbe (SVG <textPath>) : les lettres suivent un arc, elles ne sont
 * pas simplement tournées une à une. Le chemin est choisi selon le format (portrait : arc plus serré
 * et texte plus haut ; large : arc plus doux). Texte exact, issu de la configuration.
 */
export function CurvedTitle() {
  const ready = useUI((s) => s.ready);
  const phase = useUI((s) => s.phase);
  const hidden = phase === 'opening' || phase === 'open' || phase === 'closing';

  return (
    <div className="title-wrap">
    <motion.h1
      className="title"
      aria-label={CONFIG.title}
      initial={{ opacity: 0, y: -14, filter: 'blur(6px)' }}
      animate={
        ready && !hidden
          ? { opacity: 1, y: 0, filter: 'blur(0px)' }
          : { opacity: 0, y: hidden ? -8 : -14, filter: 'blur(4px)' }
      }
      transition={{ duration: hidden ? 0.7 : 2.2, delay: hidden ? 0 : 0.5, ease: [0.22, 0.8, 0.3, 1] }}
    >
      {/* Portrait */}
      <svg className="title__svg title__svg--portrait" viewBox="0 0 400 120" aria-hidden="true" focusable="false">
        <defs>
          <path id="title-arc-p" d="M 12 108 Q 200 8 388 108" fill="none" />
        </defs>
        <text className="title__text">
          <textPath href="#title-arc-p" startOffset="50%" textAnchor="middle">
            {CONFIG.title}
          </textPath>
        </text>
      </svg>
      {/* Large */}
      <svg className="title__svg title__svg--wide" viewBox="0 0 900 150" aria-hidden="true" focusable="false">
        <defs>
          <path id="title-arc-w" d="M 40 128 Q 450 28 860 128" fill="none" />
        </defs>
        <text className="title__text">
          <textPath href="#title-arc-w" startOffset="50%" textAnchor="middle">
            {CONFIG.title}
          </textPath>
        </text>
      </svg>
    </motion.h1>
    </div>
  );
}
