/**
 * PNG opcionales en public/assets/ (servidos como /assets/... en dev y build).
 * Los nombres de archivo deben coincidir con las URLs aquí (p. ej. tile_empty.png).
 * Si fallan la red, el formato o las dimensiones, se usa fallback generado en registerTextures.
 */
export type OptionalImageAsset = {
  key: string;
  /** Ruta bajo public/ (sin slash inicial) */
  url: string;
  /** Tamaño recomendado solo para avisos en consola; no bloquea */
  recommendSize?: [number, number];
};

export const OPTIONAL_IMAGE_ASSETS: OptionalImageAsset[] = [
  { key: "tile_empty", url: "assets/tile_empty.png", recommendSize: [48, 48] },
  { key: "tile_solid", url: "assets/tile_solid.png", recommendSize: [48, 48] },
  { key: "tile_breakable", url: "assets/tile_breakable.png", recommendSize: [48, 48] },
  { key: "bomb", url: "assets/bomb.png", recommendSize: [48, 48] },
  { key: "explosion_cell", url: "assets/explosion.png", recommendSize: [48, 48] },
  { key: "player_down", url: "assets/player_down.png", recommendSize: [48, 48] },
  { key: "player_up", url: "assets/player_up.png", recommendSize: [48, 48] },
  { key: "player_left", url: "assets/player_left.png", recommendSize: [48, 48] },
  { key: "player_right", url: "assets/player_right.png", recommendSize: [48, 48] },
];
