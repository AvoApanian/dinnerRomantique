import { useState } from 'react';
import { CONFIG } from '../config';
import { cycleEffects, useUI } from '../store';
import { setMusic } from '../audio';

const NoteIcon = ({ muted }: { muted: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <path
      d="M9 18V6l10-2v12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="6.5" cy="18" r="2.5" fill="currentColor" />
    <circle cx="16.5" cy="16" r="2.5" fill="currentColor" />
    {muted && <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
  </svg>
);

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <path
      d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

/** Commandes discrètes : musique (jamais lancée automatiquement) et niveau des effets visuels. */
export function AudioControls() {
  const musicOn = useUI((s) => s.musicOn);
  const effects = useUI((s) => s.effects);
  const [note, setNote] = useState('');

  const onMusic = async () => {
    const ok = await setMusic(!musicOn);
    setNote(ok ? '' : CONFIG.ui.audioUnavailable);
  };

  const effectsLabel =
    effects === 'full' ? CONFIG.ui.effectsFull : effects === 'reduced' ? CONFIG.ui.effectsReduced : CONFIG.ui.effectsOff;

  return (
    <div className="controls" role="group" aria-label={`${CONFIG.ui.music} / ${CONFIG.ui.effects}`}>
      <button
        type="button"
        className="btn btn--icon"
        onClick={onMusic}
        aria-pressed={musicOn}
        aria-label={`${CONFIG.ui.music} ${musicOn ? CONFIG.ui.musicOn : CONFIG.ui.musicOff}. ${
          musicOn ? CONFIG.ui.musicToggleOff : CONFIG.ui.musicToggleOn
        }`}
      >
        <NoteIcon muted={!musicOn} />
        <span className="btn__label">
          {CONFIG.ui.music} {musicOn ? CONFIG.ui.musicOn : CONFIG.ui.musicOff}
        </span>
      </button>
      <button
        type="button"
        className="btn btn--icon"
        onClick={() => cycleEffects()}
        aria-label={`${CONFIG.ui.effects} ${effectsLabel}. ${CONFIG.ui.effectsToggle}`}
      >
        <SparkIcon />
        <span className="btn__label">
          {CONFIG.ui.effects} {effectsLabel}
        </span>
      </button>
      <p className="controls__note" role="status" aria-live="polite">
        {note}
      </p>
    </div>
  );
}
