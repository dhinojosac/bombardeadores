import Phaser from "phaser";

const TILE = 48;

/** Tamaño del cuerpo del jugador en píxeles (procedural y escala `setDisplaySize` en cliente). No confundir con `PLAYER_HITBOX_SIZE` del servidor. */
export const PLAYER_BODY_DISPLAY_SIZE = 40;

/**
 * Registers game textures. Call once at the start of GameScene.create().
 * Optional PNGs in public/assets/ override these if loaded in preload() first.
 */
export function registerGameTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  const strokeTile = () => {
    g.lineStyle(1, 0x000000, 0.25);
    g.strokeRect(0, 0, TILE, TILE);
  };

  if (!scene.textures.exists("tile_empty")) {
    g.fillStyle(0x7ec850, 1);
    g.fillRect(0, 0, TILE, TILE);
    strokeTile();
    g.generateTexture("tile_empty", TILE, TILE);
    g.clear();
  }

  if (!scene.textures.exists("tile_solid")) {
    g.fillStyle(0x4a4a4a, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.lineStyle(2, 0x2a2a2a, 1);
    g.strokeRect(1, 1, TILE - 2, TILE - 2);
    strokeTile();
    g.generateTexture("tile_solid", TILE, TILE);
    g.clear();
  }

  if (!scene.textures.exists("tile_breakable")) {
    g.fillStyle(0xb5651d, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.lineStyle(2, 0x6b3a0f, 1);
    g.strokeRect(2, 2, TILE - 4, TILE - 4);
    strokeTile();
    g.generateTexture("tile_breakable", TILE, TILE);
    g.clear();
  }

  const playerKeys = ["player_down", "player_up", "player_left", "player_right"] as const;

  for (let i = 0; i < 4; i++) {
    const key = playerKeys[i];
    if (scene.textures.exists(key)) continue;
    const cx = PLAYER_BODY_DISPLAY_SIZE / 2;
    const cy = PLAYER_BODY_DISPLAY_SIZE / 2;
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy, PLAYER_BODY_DISPLAY_SIZE * 0.42);
    g.lineStyle(2, 0x333333, 1);
    g.strokeCircle(cx, cy, PLAYER_BODY_DISPLAY_SIZE * 0.42);
    g.fillStyle(0x222222, 1);
    if (i === 0) {
      g.fillTriangle(cx - 8, cy + 2, cx + 8, cy + 2, cx, cy + 16);
    } else if (i === 1) {
      g.fillTriangle(cx - 8, cy - 2, cx + 8, cy - 2, cx, cy - 16);
    } else if (i === 2) {
      g.fillTriangle(cx - 2, cy - 8, cx - 2, cy + 8, cx - 16, cy);
    } else {
      g.fillTriangle(cx + 2, cy - 8, cx + 2, cy + 8, cx + 16, cy);
    }
    g.generateTexture(key, PLAYER_BODY_DISPLAY_SIZE, PLAYER_BODY_DISPLAY_SIZE);
    g.clear();
  }

  if (!scene.textures.exists("bomb")) {
    const r = 16;
    const c = TILE / 2;
    g.fillStyle(0x2c3e50, 1);
    g.fillCircle(c, c, r);
    g.lineStyle(2, 0x000000, 1);
    g.strokeCircle(c, c, r);
    g.fillStyle(0xff6600, 1);
    g.fillCircle(c, c - r + 5, 4);
    g.generateTexture("bomb", TILE, TILE);
    g.clear();
  }

  if (!scene.textures.exists("explosion_cell")) {
    const pad = 4;
    const w = TILE - pad;
    g.fillStyle(0xff4500, 0.95);
    g.fillRoundedRect(pad / 2, pad / 2, w, w, 6);
    g.lineStyle(2, 0xffcc00, 0.8);
    g.strokeRoundedRect(pad / 2, pad / 2, w, w, 6);
    g.generateTexture("explosion_cell", TILE, TILE);
    g.clear();
  }

  g.destroy();
}

export const PLAYER_TEXTURE_BY_DIRECTION: Record<number, string> = {
  0: "player_down",
  1: "player_up",
  2: "player_left",
  3: "player_right",
};
