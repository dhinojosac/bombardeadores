import Phaser from "phaser";
import { TILE_SIZE } from "bomberman-shared";

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
    g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
  };

  if (!scene.textures.exists("tile_empty")) {
    g.fillStyle(0x7ec850, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    strokeTile();
    g.generateTexture("tile_empty", TILE_SIZE, TILE_SIZE);
    g.clear();
  }

  if (!scene.textures.exists("tile_solid")) {
    g.fillStyle(0x4a4a4a, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.lineStyle(2, 0x2a2a2a, 1);
    g.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    strokeTile();
    g.generateTexture("tile_solid", TILE_SIZE, TILE_SIZE);
    g.clear();
  }

  if (!scene.textures.exists("tile_breakable")) {
    g.fillStyle(0xb5651d, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.lineStyle(2, 0x6b3a0f, 1);
    g.strokeRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    strokeTile();
    g.generateTexture("tile_breakable", TILE_SIZE, TILE_SIZE);
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
    const c = TILE_SIZE / 2;
    g.fillStyle(0x2c3e50, 1);
    g.fillCircle(c, c, r);
    g.lineStyle(2, 0x000000, 1);
    g.strokeCircle(c, c, r);
    g.fillStyle(0xff6600, 1);
    g.fillCircle(c, c - r + 5, 4);
    g.generateTexture("bomb", TILE_SIZE, TILE_SIZE);
    g.clear();
  }

  if (!scene.textures.exists("explosion_cell")) {
    const pad = 4;
    const w = TILE_SIZE - pad;
    g.fillStyle(0xff4500, 0.95);
    g.fillRoundedRect(pad / 2, pad / 2, w, w, 6);
    g.lineStyle(2, 0xffcc00, 0.8);
    g.strokeRoundedRect(pad / 2, pad / 2, w, w, 6);
    g.generateTexture("explosion_cell", TILE_SIZE, TILE_SIZE);
    g.clear();
  }

  const puSize = TILE_SIZE * 0.6;
  const puOffset = (TILE_SIZE - puSize) / 2;

  if (!scene.textures.exists("powerup_bomb")) {
    g.fillStyle(0xe74c3c, 1);
    g.fillRoundedRect(puOffset, puOffset, puSize, puSize, 8);
    g.lineStyle(2, 0xc0392b, 1);
    g.strokeRoundedRect(puOffset, puOffset, puSize, puSize, 8);
    g.generateTexture("powerup_bomb", TILE_SIZE, TILE_SIZE);
    g.clear();
  }

  if (!scene.textures.exists("powerup_radius")) {
    g.fillStyle(0xf39c12, 1);
    g.fillRoundedRect(puOffset, puOffset, puSize, puSize, 8);
    g.lineStyle(2, 0xe67e22, 1);
    g.strokeRoundedRect(puOffset, puOffset, puSize, puSize, 8);
    g.generateTexture("powerup_radius", TILE_SIZE, TILE_SIZE);
    g.clear();
  }

  if (!scene.textures.exists("powerup_speed")) {
    g.fillStyle(0x2ecc71, 1);
    g.fillRoundedRect(puOffset, puOffset, puSize, puSize, 8);
    g.lineStyle(2, 0x27ae60, 1);
    g.strokeRoundedRect(puOffset, puOffset, puSize, puSize, 8);
    g.generateTexture("powerup_speed", TILE_SIZE, TILE_SIZE);
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
