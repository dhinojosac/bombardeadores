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

export const PLAYER_COLORS = [
  0x3498db, // Azul
  0xe74c3c, // Rojo
  0x2ecc71, // Verde
  0xf39c12, // Naranja
  0x9b59b6, // Morado
  0x1abc9c, // Turquesa
  0xe67e22, // Naranja oscuro
  0xecf0f1, // Blanco/Plata
];
