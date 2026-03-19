export const TILE_SIZE = 48;
export const MAP_WIDTH = 15;
export const MAP_HEIGHT = 13;
export const TICK_RATE = 20;
export const TICK_INTERVAL = 1000 / TICK_RATE;

export const BOMB_FUSE_TIME = 2000;
export const EXPLOSION_DURATION = 400;
export const RESPAWN_TIME = 2000;
export const INVULNERABILITY_TIME = 1500;
export const PLAYER_SPEED = 150;
export const DEFAULT_BOMB_COUNT = 1;
export const DEFAULT_EXPLOSION_RADIUS = 2;

export const PLAYER_HITBOX_SIZE = 40;

export enum TileType {
  EMPTY = 0,
  SOLID = 1,
  BREAKABLE = 2,
}
