import { useEffect, useMemo } from 'react';
import { CONFIG } from './config';
import { webglAvailable } from './quality';
import { disposeAudio } from './audio';
import { Scene } from './components/Scene';
import { CurvedTitle } from './components/CurvedTitle';
import { LetterOverlay } from './components/LetterOverlay';
import { Hint } from './components/Hint';
import { AudioControls } from './components/AudioControls';
import { ContextLost, Fallback, Loading, SceneBoundary } from './components/Overlays';
import { useUI } from './store';

export default function App() {
  const supported = useMemo(() => webglAvailable(), []);

  useEffect(() => () => disposeAudio(), []);

  if (!supported) return <Fallback />;

  return (
    <SceneBoundary fallback={<Fallback />}>
      <Experience />
    </SceneBoundary>
  );
}

function Experience() {
  const phase = useUI((s) => s.phase);
  const dim = phase === 'opening' || phase === 'open';
  return (
    <main className="stage" aria-label={CONFIG.ui.sceneLabel}>
      <div className="scene" role="img" aria-label={CONFIG.ui.sceneLabel}>
        <Scene />
      </div>
      <div className={`vignette${dim ? ' vignette--on' : ''}`} aria-hidden="true" />
      <CurvedTitle />
      <Hint />
      <AudioControls />
      <LetterOverlay />
      <Loading />
      <ContextLost />
    </main>
  );
}
