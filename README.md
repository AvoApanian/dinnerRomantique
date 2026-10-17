# Pour Marie — une soirée à Paris (expérience 3D)

Site romantique en 3D (React + TypeScript + Three.js / React Three Fiber), pensé **mobile d'abord**.
Tout le texte visible est en français. Le titre est conservé exactement : « Bien venue chez toi :) ».

## Installation et commandes

```bash
npm install        # installe les dépendances
npm run dev        # serveur de développement (http://localhost:5173, accessible sur le réseau local)
npm run typecheck  # vérification TypeScript
npm run build      # vérification TypeScript + build de production dans dist/
npm run preview    # sert le build de production (http://localhost:4173)
```

Pour mettre le site en ligne, déploie simplement le dossier `dist/` (Netlify, Vercel, GitHub Pages, etc.).
Ouvre-le ensuite sur un téléphone : c'est la cible principale.

## Personnaliser — un seul fichier : `src/config.ts`

| Section | Contenu |
| --- | --- |
| `title` | Le titre courbe |
| `letter` | **La lettre** : salutation, paragraphes (un texte = un paragraphe), signature |
| `ui` | Tous les textes de l'interface (chargement, boutons, messages d'erreur) |
| `colors` | La palette |
| `motion` | Durées des animations de caméra, intensité de la parallaxe |
| `fireworks` | Délais, fréquence et part de rose des feux d'artifice |
| `hearts` | Opacité et densité des cœurs |
| `audio` | Chemin de ta musique (optionnel) et volume |
| `layouts` | Cadrages de caméra : `portrait` (téléphone) et `desktop`, interpolés selon le format d'écran |

Modifier la lettre ne demande jamais de toucher à la scène 3D.

## Architecture

```
src/
  config.ts          configuration unique
  store.ts           états (phase de la lettre, effets…) + valeurs d'animation lues par la 3D
  layout.ts          cadrage responsive (portrait ↔ large) et fonctions d'easing
  quality.ts         niveau de qualité selon l'appareil, détection WebGL
  audio.ts           audio optionnel (jamais automatique)
  textures.ts        textures procédurales (bois, pierre, papier) : aucune image externe
  components/
    Scene.tsx        Canvas, caméra cinématique, lumières, orchestration des phases
    SkyDome.tsx  Stars.tsx (+ étoiles filantes)  Dust.tsx  GlowPoints.tsx
    EiffelTower.tsx  Skyline.tsx  Terrace.tsx  DinnerTable.tsx  LoveLetter.tsx
    Fireworks.tsx  FloatingHearts.tsx
    CurvedTitle.tsx  LetterOverlay.tsx  Hint.tsx  AudioControls.tsx  Overlays.tsx
```

## Choix techniques

- **Tout est procédural** : tour Eiffel (poutres en un seul `InstancedMesh`), immeubles, table, nourriture, textures.
  Aucun modèle, image ou police distant : rien ne peut être « cassé » à cause d'une URL. Polices embarquées via `@fontsource`.
- **Feux d'artifice** : trajectoires calculées dans le vertex shader (gravité, freinage, traînées), déclenchés uniquement à l'ouverture
  de la lettre ; ils s'estompent à la fermeture. Cœurs : un seul `InstancedMesh`.
- **Titre** : texte SVG sur un véritable chemin courbe (`<textPath>`), pas des lettres simplement tournées.
- **Performance** : trois niveaux de qualité (téléphone modeste / moyen / puissant), pixel ratio plafonné et réduit automatiquement
  si les images chutent, ombres adaptatives, aucun post-traitement plein écran.
- **Accessibilité** : bouton « Ouvrir la lettre » au clavier, `Échap` pour fermer, focus géré, `prefers-reduced-motion` respecté
  (effets « réduits » par défaut), niveau d'effets réglable (complets / réduits / désactivés), zones tactiles ≥ 44 px, safe areas.
- **Repli** : si WebGL est indisponible ou si la 3D plante, un écran français avec un ciel étoilé s'affiche et la lettre reste lisible.
- **Audio** : désactivé par défaut. Au premier appui sur « Musique », une ambiance douce est générée en direct. Pour ta propre
  musique, voir `public/audio/LISEZ-MOI.txt`.

## Ce qui a été vérifié (et ce qui ne l'a pas été)

Vérifié : `tsc` et `vite build` sans erreur ; rendu réel dans Chromium (rendu logiciel) en 390×844 tactile et 1024×576 souris ;
toucher/clic sur la lettre (raycast 3D) ; ouverture et fermeture répétées ×3 sans erreur console ; titre exact (texte et `aria-label`) ;
feux d'artifice et cœurs visibles pendant la lettre ; lettre scrollable en interne ; repli sans WebGL ; mode mouvement réduit.

**Non vérifié** : performances et fluidité sur de vrais téléphones (les tests ont tourné en rendu logiciel, très lent, sans GPU) ;
rendu sur Safari iOS ; le son à l'oreille (l'ambiance générée n'a pas pu être écoutée). Teste d'abord sur le téléphone de Marie
(ou un téléphone équivalent) avant de lui offrir. Le bundle JavaScript pèse ≈ 1,4 Mo (≈ 400 Ko compressé).
