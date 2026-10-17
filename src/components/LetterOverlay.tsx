import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { CONFIG } from '../config';
import { closeLetter, useUI } from '../store';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.55, delayChildren: 0.5 } },
};
const line: Variants = {
  hidden: { opacity: 0, y: 10, filter: 'blur(3px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1.1, ease: [0.22, 0.8, 0.3, 1] } },
};

/** Feuille de papier avec le texte de la lettre (HTML réel : lisible, sélectionnable, défilable). */
export function LetterPaper({ scrollRef }: { scrollRef?: React.RefObject<HTMLDivElement | null> }) {
  const { salutation, paragraphs, signature } = CONFIG.letter;
  return (
    <div className="paper" ref={scrollRef} tabIndex={0} role="document" aria-label={CONFIG.ui.letterDialog}>
      <motion.div className="paper__inner" variants={container} initial="hidden" animate="show">
        <motion.p className="paper__salutation" variants={line}>
          {salutation}
        </motion.p>
        {paragraphs.map((text, i) => (
          <motion.p className="paper__p" variants={line} key={i}>
            {text}
          </motion.p>
        ))}
        <motion.p className="paper__signature" variants={line}>
          {signature}
        </motion.p>
        <motion.div className="paper__ornament" variants={line} aria-hidden="true">
          <span />
          <i />
          <span />
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Présentation de la lettre ouverte : superposée à la scène 3D, qui reste visible et vivante derrière. */
export function LetterOverlay() {
  const phase = useUI((s) => s.phase);
  const open = phase === 'open';
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Focus initial sur le bouton de fermeture + Échap pour fermer + piège de focus minimal
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLetter();
      } else if (e.key === 'Tab') {
        const focusables = [scrollRef.current, closeRef.current].filter(Boolean) as HTMLElement[];
        if (focusables.length === 0) return;
        const idx = focusables.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        const next = e.shiftKey ? (idx <= 0 ? focusables.length - 1 : idx - 1) : (idx + 1) % focusables.length;
        focusables[next].focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="letter-layer"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={CONFIG.ui.letterDialog}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.55 } }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <motion.div
            className="letter-stack"
            initial={{ y: 26, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.98, opacity: 0, transition: { duration: 0.5 } }}
            transition={{ duration: 1.1, ease: [0.22, 0.8, 0.3, 1] }}
          >
            <LetterPaper scrollRef={scrollRef} />
            <button ref={closeRef} type="button" className="btn btn--close" onClick={() => closeLetter()}>
              {CONFIG.ui.close}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
