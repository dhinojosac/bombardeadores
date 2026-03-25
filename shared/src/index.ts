export const TILE_SIZE = 48;
export const MAP_WIDTH = 15;
export const MAP_HEIGHT = 13;

export enum TileType {
  EMPTY = 0,
  SOLID = 1,
  BREAKABLE = 2,
}

export enum PowerUpType {
  EXTRA_BOMB = 0,
  EXTRA_RADIUS = 1,
  SPEED_BOOST = 2,
}

export interface PlayerInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}
