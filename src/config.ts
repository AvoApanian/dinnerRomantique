/**
 * ════════════════════════════════════════════════════════════════════════
 *  CONFIGURATION UNIQUE — tout ce qui se personnalise se trouve ici.
 * ════════════════════════════════════════════════════════════════════════
 *
 *  1. CONFIG.title        → le titre courbe (orthographe volontairement conservée)
 *  2. CONFIG.letter       → le texte de la lettre (salutation, paragraphes, signature)
 *  3. CONFIG.ui           → tous les textes de l'interface (en français)
 *  4. CONFIG.colors       → la palette
 *  5. CONFIG.motion       → durées des animations de caméra
 *  6. CONFIG.fireworks    → fréquence / durée des feux d'artifice
 *  7. CONFIG.hearts       → opacité et densité des cœurs
 *  8. CONFIG.audio        → chemins et volume de l'audio
 *  9. CONFIG.layouts      → cadrages de caméra (portrait = mobile, desktop = large)
 *
 *  Ce fichier ne contient que des données : modifier la lettre ne demande
 *  jamais de toucher à la scène 3D ni aux animations.
 */

export const CONFIG = {
  /** Titre affiché exactement tel quel (ne pas corriger : voulu ainsi). */
  title: 'Bien venue chez toi :)',

  /** Petit message discret près de la lettre. */
  hint: "Une lettre t'attend…",

  /**
   * ✉️  LA LETTRE
   * Modifier librement le texte ci-dessous. Une chaîne = un paragraphe.
   * La salutation et la signature sont écrites dans une police manuscrite.
   */
  letter: {
    salutation: 'Ma Marie,',
    paragraphs: [
      "Bon retour chez toi, mon amour. Même quand les kilomètres nous séparent, il y a toujours une place pour toi à côté de moi.",
      "Alors ce soir, j'ai imaginé un petit endroit rien qu'à nous, sous les étoiles de Paris.",
      "Installe-toi, prends ton temps, et profite de ce petit rendez-vous que j'ai préparé pour toi.",
      "J'aurais aimé être là, assis en face de toi, mais en attendant de pouvoir te serrer dans mes bras, je voulais t'offrir un petit moment où la distance compte un peu moins.",
    ],
    signature: "Je t'aime.",
  },

  /** Textes de l'interface (tous en français). */
  ui: {
    loading: 'Préparation de ta soirée…',
    openLetter: 'Ouvrir la lettre',
    letterDialog: 'Ta lettre',
    close: 'Revenir à la soirée',
    music: 'Musique',
    musicOn: 'activée',
    musicOff: 'coupée',
    musicToggleOn: 'Activer la musique',
    musicToggleOff: 'Couper la musique',
    effects: 'Effets',
    effectsFull: 'complets',
    effectsReduced: 'réduits',
    effectsOff: 'désactivés',
    effectsToggle: 'Changer le niveau des effets visuels',
    sceneLabel:
      'Scène en 3D : une table dressée pour deux sous les étoiles de Paris, avec la tour Eiffel illuminée. Une lettre est posée sur la table.',
    fallbackTitle: 'Oh… la scène en 3D ne peut pas s’afficher',
    fallbackBody:
      "Ton navigateur ou ton téléphone ne permet pas d'afficher la scène en 3D. Mais la lettre, elle, t'attend quand même.",
    fallbackRead: 'Lire la lettre',
    fallbackReload: 'Réessayer',
    contextLost: 'La scène s’est interrompue un instant…',
    contextLostReload: 'Recharger la soirée',
    audioUnavailable: 'Le son n’est pas disponible sur cet appareil.',
  },

  /** Palette cinématographique. */
  colors: {
    midnight: '#050b1f',
    navy: '#0a1433',
    skyTop: '#02050f',
    skyMid: '#0b1a44',
    skyHorizon: '#25356e',
    horizonGlow: '#c9803a',
    gold: '#ffb347',
    goldSoft: '#ffd48a',
    champagne: '#f4e2b8',
    ivory: '#f8f0dc',
    amber: '#ff9d3a',
    rose: '#d98a9c',
    candle: '#ffb866',
    ink: '#3a2a22',
  },

  /** Durées (secondes) à vitesse « effets complets ». */
  motion: {
    introSeconds: 3.4,
    openSeconds: 2.4,
    closeSeconds: 1.7,
    /** Intensité du mouvement de parallaxe (0 = aucune). */
    parallax: 1,
  },

  /** Feux d'artifice (actifs uniquement pendant que la lettre est ouverte). */
  fireworks: {
    /** Délai (s) après le début de l'ouverture avant la première gerbe. */
    firstBurstAt: 1.1,
    intervalMin: 2.4,
    intervalMax: 4.4,
    /** Intervalles en mode « effets réduits ». */
    reducedIntervalMin: 5,
    reducedIntervalMax: 8,
    /** Durée de vie d'une gerbe (s). */
    lifetime: 2.9,
    /** Part (0–1) de gerbes rose, volontairement restreinte. */
    roseShare: 0.14,
  },

  /** Cœurs translucides flottants. */
  hearts: {
    /** Opacité maximale de base. */
    opacity: 0.26,
    /** Multiplicateur du nombre de cœurs (0–1). */
    density: 1,
  },

  /**
   * Audio. Aucun fichier n'est requis : par défaut une ambiance douce est
   * générée en direct (Web Audio) et ne démarre qu'après un clic.
   * Pour utiliser ta propre musique, copie un fichier dans /public/audio
   * puis renseigne son chemin, par exemple '/audio/musique.mp3'.
   */
  audio: {
    musicSrc: null as string | null,
    volume: 0.32,
    sfxVolume: 0.5,
  },

  /**
   * Cadrages de caméra. La mise en page est interpolée selon le ratio
   * d'écran entre « portrait » (≈ 0.46, téléphone) et « desktop » (≈ 1.6).
   *
   * Monde : 1 unité ≈ 1 mètre. La table est en (0, 0, 0), la caméra regarde
   * vers -Z, la tour est derrière.
   */
  layouts: {
    portrait: {
      aspect: 0.46,
      idle: { position: [0, 1.4, 3.5], target: [0, 1.5, -8], fov: 60 },
      /** Décalage de départ (travelling d'arrivée) : recul, hauteur et regard vers le ciel. */
      intro: { position: [0, 0.5, 2.2], target: [0, 1.4, 0], fov: 6 },
      focus: { position: [0, 1.22, 2.5], target: [0, 1.25, -4], fov: 60 },
      towerZ: -36,
      towerHeight: 20,
      parallax: [0.2, 0.08],
    },
    desktop: {
      aspect: 1.6,
      idle: { position: [0, 1.3, 3.0], target: [0, 1.5, -8], fov: 42 },
      intro: { position: [0, 0.45, 2.4], target: [0, 1.2, 0], fov: 4 },
      focus: { position: [0, 1.2, 2.3], target: [0, 1.3, -4], fov: 42 },
      towerZ: -40,
      towerHeight: 16,
      parallax: [0.45, 0.16],
    },
  },
} as const;

export type LayoutConfig = (typeof CONFIG.layouts)['portrait'];
