import { ArraySchema } from "@colyseus/schema";
import { MAP_WIDTH, MAP_HEIGHT, TileType, TILE_SIZE } from "./constants";

export interface SpawnPoint {
  tileX: number;
  tileY: number;
}

const SPAWN_POINTS: SpawnPoint[] = [
  { tileX: 1, tileY: 1 },
  { tileX: MAP_WIDTH - 2, tileY: 1 },
  { tileX: 1, tileY: MAP_HEIGHT - 2 },
  { tileX: MAP_WIDTH - 2, tileY: MAP_HEIGHT - 2 },
  { tileX: Math.floor(MAP_WIDTH / 2), tileY: 1 },
  { tileX: Math.floor(MAP_WIDTH / 2), tileY: MAP_HEIGHT - 2 },
  { tileX: 1, tileY: Math.floor(MAP_HEIGHT / 2) },
  { tileX: MAP_WIDTH - 2, tileY: Math.floor(MAP_HEIGHT / 2) },
];

export class GameMap {
  private tiles: ArraySchema<number>;

  constructor(tiles: ArraySchema<number>) {
    this.tiles = tiles;
  }

  generate(): void {
    this.tiles.length = 0;

    const safeTiles = new Set<string>();
    for (const sp of SPAWN_POINTS) {
      safeTiles.add(`${sp.tileX},${sp.tileY}`);
      safeTiles.add(`${sp.tileX + 1},${sp.tileY}`);
      safeTiles.add(`${sp.tileX - 1},${sp.tileY}`);
      safeTiles.add(`${sp.tileX},${sp.tileY + 1}`);
      safeTiles.add(`${sp.tileX},${sp.tileY - 1}`);
    }

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        let tile: TileType;

        if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
          tile = TileType.SOLID;
        } else if (x % 2 === 0 && y % 2 === 0) {
          tile = TileType.SOLID;
        } else if (safeTiles.has(`${x},${y}`)) {
          tile = TileType.EMPTY;
        } else {
          tile = Math.random() < 0.6 ? TileType.BREAKABLE : TileType.EMPTY;
        }

        this.tiles.push(tile);
      }
    }
  }

  tileAt(tileX: number, tileY: number): TileType {
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
      return TileType.SOLID;
    }
    return this.tiles[tileY * MAP_WIDTH + tileX] as TileType;
  }

  isWalkable(tileX: number, tileY: number): boolean {
    return this.tileAt(tileX, tileY) === TileType.EMPTY;
  }

  destroyTile(tileX: number, tileY: number): boolean {
    if (this.tileAt(tileX, tileY) === TileType.BREAKABLE) {
      this.tiles[tileY * MAP_WIDTH + tileX] = TileType.EMPTY;
      return true;
    }
    return false;
  }

  getSpawnPoint(usedPositions: Set<string>): SpawnPoint {
    const available = SPAWN_POINTS.filter(
      (sp) => !usedPositions.has(`${sp.tileX},${sp.tileY}`)
    );
    const list = available.length > 0 ? available : SPAWN_POINTS;
    return list[Math.floor(Math.random() * list.length)];
  }

  tileToPixel(tile: number): number {
    return tile * TILE_SIZE + TILE_SIZE / 2;
  }

  pixelToTile(pixel: number): number {
    return Math.floor(pixel / TILE_SIZE);
  }
}
