import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CONFIG } from '../config';
import { useUI } from '../store';
import { LetterPaper } from './LetterOverlay';

/** Écran de chargement (français) : disparaît dès que la scène est prête. */
export function Loading() {
  const ready = useUI((s) => s.ready);
  return (
    <AnimatePresence>
      {!ready && (
        <motion.div
          className="loading"
          role="status"
          aria-live="polite"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1.1, ease: 'easeInOut' } }}
        >
          <div className="loading__star" aria-hidden="true" />
          <p>{CONFIG.ui.loading}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Contexte WebGL perdu (rare, mémoire basse) : proposer de recharger. */
export function ContextLost() {
  const lost = useUI((s) => s.contextLost);
  if (!lost) return null;
  return (
    <div className="loading loading--solid" role="alert">
      <p>{CONFIG.ui.contextLost}</p>
      <button type="button" className="btn" onClick={() => window.location.reload()}>
        {CONFIG.ui.contextLostReload}
      </button>
    </div>
  );
}

/** Repli sans 3D : ciel étoilé en CSS et la lettre quand même lisible. */
export function Fallback() {
  const [reading, setReading] = useState(false);
  return (
    <div className="fallback" role="main">
      <div className="fallback__stars" aria-hidden="true" />
      {!reading ? (
        <div className="fallback__card">
          <h1 className="fallback__title">{CONFIG.title}</h1>
          <h2 className="fallback__sub">{CONFIG.ui.fallbackTitle}</h2>
          <p>{CONFIG.ui.fallbackBody}</p>
          <div className="fallback__actions">
            <button type="button" className="btn btn--primary" onClick={() => setReading(true)}>
              {CONFIG.ui.fallbackRead}
            </button>
            <button type="button" className="btn" onClick={() => window.location.reload()}>
              {CONFIG.ui.fallbackReload}
            </button>
          </div>
        </div>
      ) : (
        <div className="letter-stack letter-stack--static">
          <LetterPaper />
          <button type="button" className="btn btn--close" onClick={() => setReading(false)}>
            {CONFIG.ui.close}
          </button>
        </div>
      )}
    </div>
  );
}

/** Si la 3D lève une erreur à l'exécution, on bascule vers le repli plutôt qu'un écran vide. */
export class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur de la scène 3D :', error, info.componentStack);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
