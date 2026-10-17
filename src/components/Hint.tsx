import { useEffect, useState } from 'react';
import { CONFIG } from '../config';
import { openLetter, useUI } from '../store';

/** « Une lettre t'attend… » : discret, s'efface après un moment, et sert aussi de bouton clavier. */
export function Hint() {
  const phase = useUI((s) => s.phase);
  const ready = useUI((s) => s.ready);
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    if (phase === 'opening') setFaded(true);
    if (phase !== 'idle') return;
    const id = window.setTimeout(() => setFaded(true), 20000);
    return () => window.clearTimeout(id);
  }, [phase]);

  const active = ready && (phase === 'idle' || phase === 'intro');
  return (
    <div className="hint-wrap">
      <button
        type="button"
        className={`hint${active && !faded ? ' hint--on' : ''}`}
        onClick={() => openLetter()}
        disabled={!active || faded}
        aria-label={CONFIG.ui.openLetter}
        tabIndex={active ? 0 : -1}
      >
        <span className="hint__dot" aria-hidden="true" />
        {CONFIG.hint}
      </button>
    </div>
  );
}
