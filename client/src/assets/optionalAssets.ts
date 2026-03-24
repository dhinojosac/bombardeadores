/**
 * PNG opcionales en public/assets/ (servidos como /assets/... en dev y build).
 * Los nombres de archivo deben coincidir con las rutas relativas aquí (p. ej. assets/tile_empty.png).
 * Si fallan la red, el formato o las dimensiones, se usa fallback generado en registerTextures.
 */

/** URL absoluta desde la raíz de la app (respeta `base` de Vite vía import.meta.env.BASE_URL). */
export function resolvePublicAsset(pathUnderAppRoot: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const rel = pathUnderAppRoot.replace(/^\//, "");
  return base.endsWith("/") ? `${base}${rel}` : `${base}/${rel}`;
}

export type OptionalImageAsset = {
  key: string;
  /** URL lista para Phaser Loader (incluye BASE_URL de Vite) */
  url: string;
  /** Tamaño recomendado solo para avisos en consola; no bloquea */
  recommendSize?: [number, number];
};

export const OPTIONAL_IMAGE_ASSETS: OptionalImageAsset[] = [
  { key: "tile_empty", url: resolvePublicAsset("assets/tile_empty.png"), recommendSize: [48, 48] },
  { key: "tile_solid", url: resolvePublicAsset("assets/tile_solid.png"), recommendSize: [48, 48] },
  { key: "tile_breakable", url: resolvePublicAsset("assets/tile_breakable.png"), recommendSize: [48, 48] },
  { key: "bomb", url: resolvePublicAsset("assets/bomb.png"), recommendSize: [48, 48] },
  { key: "explosion_cell", url: resolvePublicAsset("assets/explosion.png"), recommendSize: [48, 48] },
  { key: "player_down", url: resolvePublicAsset("assets/player_down.png"), recommendSize: [48, 48] },
  { key: "player_up", url: resolvePublicAsset("assets/player_up.png"), recommendSize: [48, 48] },
  { key: "player_left", url: resolvePublicAsset("assets/player_left.png"), recommendSize: [48, 48] },
  { key: "player_right", url: resolvePublicAsset("assets/player_right.png"), recommendSize: [48, 48] },
];
