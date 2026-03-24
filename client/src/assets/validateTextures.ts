import Phaser from "phaser";
import { OPTIONAL_IMAGE_ASSETS } from "./optionalAssets";

function getNaturalSize(scene: Phaser.Scene, key: string): { w: number; h: number } | null {
  if (!scene.textures.exists(key)) return null;
  const tex = scene.textures.get(key);
  const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement | undefined;
  if (!src || !("naturalWidth" in src)) {
    const f = tex.get();
    if (f && f.width != null && f.height != null) {
      return { w: f.width, h: f.height };
    }
    return null;
  }
  const w = (src as HTMLImageElement).naturalWidth || (src as HTMLCanvasElement).width;
  const h = (src as HTMLImageElement).naturalHeight || (src as HTMLCanvasElement).height;
  return { w, h };
}

/**
 * Quita texturas cargadas pero inválidas (0×0 o corruptas) para que registerGameTextures regenere fallback.
 * Opcionalmente avisa si el tamaño no coincide con recommendSize.
 */
export function validateOptionalTextures(scene: Phaser.Scene): void {
  for (const def of OPTIONAL_IMAGE_ASSETS) {
    if (!scene.textures.exists(def.key)) continue;

    const size = getNaturalSize(scene, def.key);
    if (!size || size.w < 1 || size.h < 1) {
      console.warn(`[assets] "${def.key}" tiene dimensiones inválidas; usando fallback generado.`);
      scene.textures.remove(def.key);
      continue;
    }

    if (def.recommendSize) {
      const [rw, rh] = def.recommendSize;
      if (size.w !== rw || size.h !== rh) {
        console.info(
          `[assets] "${def.key}" es ${size.w}×${size.h} (recomendado ${rw}×${rh}); el juego escala con setDisplaySize.`
        );
      }
    }
  }
}
