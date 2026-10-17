/** Constantes de composition partagées par les composants 3D (1 unité ≈ 1 mètre). */

/** Hauteur de la surface de la table. */
export const TABLE_Y = 0.76;
/** Niveau du sol de la ville, en contrebas de la terrasse. */
export const GROUND_Y = -3.2;
/** Position de la lettre sur la table (avant de la table, vers la caméra). */
export const LETTER_POS: [number, number, number] = [0, TABLE_Y, 0.34];
/** Échelle de la lettre : assez grande pour être reconnue et touchée facilement sur un téléphone. */
export const LETTER_SCALE = 1.25;
/** Hauteur de référence avec laquelle la tour est modélisée (mise à l'échelle ensuite). */
export const TOWER_BASE_HEIGHT = 21;
