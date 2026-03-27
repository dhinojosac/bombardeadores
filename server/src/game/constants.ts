export { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, TileType, PowerUpType } from "bomberman-shared";

export const TICK_RATE = 20;
export const TICK_INTERVAL = 1000 / TICK_RATE;

export const BOMB_FUSE_TIME = 2000;
export const EXPLOSION_DURATION = 400;
export const RESPAWN_TIME = 2000;
export const INVULNERABILITY_TIME = 1500;
export const PLAYER_SPEED = 150;
export const DEFAULT_BOMB_COUNT = 1;
export const DEFAULT_EXPLOSION_RADIUS = 2;

export const PLAYER_HITBOX_SIZE = 30;

function envPositiveInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Puntos para ganar la partida (override: env MATCH_SCORE_TARGET). */
export const MATCH_SCORE_TARGET = envPositiveInt("MATCH_SCORE_TARGET", 5);

/** Duración máxima en ms; al llegar a 0 gana quien tenga más puntos (override: env MATCH_DURATION_MS). */
export const MATCH_DURATION_MS = envPositiveInt("MATCH_DURATION_MS", 5 * 60 * 1000);

export const RESTART_COUNTDOWN_MS = 10_000;

export const POWERUP_DROP_CHANCE = 0.3;
export const MAX_BOMBS = 5;
export const MAX_RADIUS = 6;
export const MAX_SPEED = 250;
export const SPEED_BOOST_AMOUNT = 20;
export const FRENZY_SPEED_BONUS = 30;
