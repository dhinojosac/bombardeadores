import { MapSchema } from "@colyseus/schema";
import { GameState } from "../state/GameState";
import { PlayerState } from "../state/PlayerState";
import { BombState } from "../state/BombState";
import { ExplosionState } from "../state/ExplosionState";
import { GameMap } from "./GameMap";
import {
  TILE_SIZE,
  PLAYER_SPEED,
  PLAYER_HITBOX_SIZE,
  BOMB_FUSE_TIME,
  EXPLOSION_DURATION,
  RESPAWN_TIME,
  INVULNERABILITY_TIME,
  MAP_WIDTH,
  MAP_HEIGHT,
  TileType,
} from "./constants";

let nextBombId = 0;
let nextExplosionId = 0;

export class GameEngine {
  private map: GameMap;

  constructor(map: GameMap) {
    this.map = map;
  }

  update(state: GameState, deltaMs: number): void {
    this.processMovement(state, deltaMs);
    this.updateBombs(state, deltaMs);
    this.updateExplosions(state, deltaMs);
    this.applyExplosionDamage(state);
    this.handleRespawns(state, deltaMs);
    this.updateInvulnerability(state, deltaMs);
  }

  // --- Movement ---

  private processMovement(state: GameState, deltaMs: number): void {
    const dt = deltaMs / 1000;
    state.players.forEach((player) => {
      if (!player.alive) return;

      const input = player.currentInput;
      let vx = 0;
      let vy = 0;

      if (input.left) vx -= 1;
      if (input.right) vx += 1;
      if (input.up) vy -= 1;
      if (input.down) vy += 1;

      if (vx !== 0 && vy !== 0) {
        const inv = 1 / Math.SQRT2;
        vx *= inv;
        vy *= inv;
      }

      if (vx !== 0 || vy !== 0) {
        if (Math.abs(vx) >= Math.abs(vy)) {
          player.direction = vx > 0 ? 3 : 2;
        } else {
          player.direction = vy > 0 ? 0 : 1;
        }
      }

      const speed = PLAYER_SPEED * dt;
      const newX = player.x + vx * speed;
      const newY = player.y + vy * speed;

      player.x = this.resolveCollisionX(player.x, player.y, newX);
      player.y = this.resolveCollisionY(player.x, player.y, newY);
    });
  }

  private resolveCollisionX(oldX: number, y: number, newX: number): number {
    const half = PLAYER_HITBOX_SIZE / 2;
    const top = y - half;
    const bottom = y + half - 1;

    if (newX > oldX) {
      const edgeX = newX + half;
      const tileX = Math.floor(edgeX / TILE_SIZE);
      const tileYTop = Math.floor(top / TILE_SIZE);
      const tileYBottom = Math.floor(bottom / TILE_SIZE);
      if (!this.map.isWalkable(tileX, tileYTop) || !this.map.isWalkable(tileX, tileYBottom)) {
        return tileX * TILE_SIZE - half - 0.01;
      }
    } else if (newX < oldX) {
      const edgeX = newX - half;
      const tileX = Math.floor(edgeX / TILE_SIZE);
      const tileYTop = Math.floor(top / TILE_SIZE);
      const tileYBottom = Math.floor(bottom / TILE_SIZE);
      if (!this.map.isWalkable(tileX, tileYTop) || !this.map.isWalkable(tileX, tileYBottom)) {
        return (tileX + 1) * TILE_SIZE + half + 0.01;
      }
    }

    return newX;
  }

  private resolveCollisionY(x: number, oldY: number, newY: number): number {
    const half = PLAYER_HITBOX_SIZE / 2;
    const left = x - half;
    const right = x + half - 1;

    if (newY > oldY) {
      const edgeY = newY + half;
      const tileY = Math.floor(edgeY / TILE_SIZE);
      const tileXLeft = Math.floor(left / TILE_SIZE);
      const tileXRight = Math.floor(right / TILE_SIZE);
      if (!this.map.isWalkable(tileXLeft, tileY) || !this.map.isWalkable(tileXRight, tileY)) {
        return tileY * TILE_SIZE - half - 0.01;
      }
    } else if (newY < oldY) {
      const edgeY = newY - half;
      const tileY = Math.floor(edgeY / TILE_SIZE);
      const tileXLeft = Math.floor(left / TILE_SIZE);
      const tileXRight = Math.floor(right / TILE_SIZE);
      if (!this.map.isWalkable(tileXLeft, tileY) || !this.map.isWalkable(tileXRight, tileY)) {
        return (tileY + 1) * TILE_SIZE + half + 0.01;
      }
    }

    return newY;
  }

  // --- Bombs ---

  placeBomb(state: GameState, player: PlayerState): void {
    if (!player.alive || player.bombsAvailable <= 0) return;

    const tileX = this.map.pixelToTile(player.x);
    const tileY = this.map.pixelToTile(player.y);

    const hasBombHere = this.bombAtTile(state.bombs, tileX, tileY);
    if (hasBombHere) return;

    const bomb = new BombState();
    bomb.tileX = tileX;
    bomb.tileY = tileY;
    bomb.ownerId = player.sessionId;
    bomb.radius = player.explosionRadius;
    bomb.fuseTimer = BOMB_FUSE_TIME;

    const id = `b${nextBombId++}`;
    state.bombs.set(id, bomb);
    player.bombsAvailable--;
  }

  private bombAtTile(bombs: MapSchema<BombState>, tileX: number, tileY: number): boolean {
    let found = false;
    bombs.forEach((bomb) => {
      if (bomb.tileX === tileX && bomb.tileY === tileY) {
        found = true;
      }
    });
    return found;
  }

  private updateBombs(state: GameState, deltaMs: number): void {
    const toExplode: string[] = [];

    state.bombs.forEach((bomb, key) => {
      bomb.fuseTimer -= deltaMs;
      if (bomb.fuseTimer <= 0) {
        toExplode.push(key);
      }
    });

    for (const key of toExplode) {
      this.detonateBomb(state, key);
    }
  }

  private detonateBomb(state: GameState, bombKey: string): void {
    const bomb = state.bombs.get(bombKey);
    if (!bomb) return;

    const owner = state.players.get(bomb.ownerId);
    if (owner) {
      owner.bombsAvailable = Math.min(owner.bombsAvailable + 1, owner.maxBombs);
    }

    const affectedCells = this.calculateExplosionCells(state, bomb.tileX, bomb.tileY, bomb.radius);

    const explosion = new ExplosionState();
    explosion.tileX = bomb.tileX;
    explosion.tileY = bomb.tileY;
    explosion.radius = bomb.radius;
    explosion.cells = affectedCells.map((c) => `${c.x},${c.y}`).join(";");
    explosion.ttl = EXPLOSION_DURATION;
    explosion.ownerId = bomb.ownerId;

    const id = `e${nextExplosionId++}`;
    state.explosions.set(id, explosion);

    state.bombs.delete(bombKey);

    // Chain reaction: detonate any bombs caught in the blast
    const chainKeys: string[] = [];
    state.bombs.forEach((otherBomb, otherKey) => {
      for (const cell of affectedCells) {
        if (otherBomb.tileX === cell.x && otherBomb.tileY === cell.y) {
          chainKeys.push(otherKey);
          break;
        }
      }
    });

    for (const ck of chainKeys) {
      this.detonateBomb(state, ck);
    }
  }

  private calculateExplosionCells(
    state: GameState,
    cx: number,
    cy: number,
    radius: number
  ): { x: number; y: number }[] {
    const cells: { x: number; y: number }[] = [{ x: cx, y: cy }];

    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    for (const dir of directions) {
      for (let i = 1; i <= radius; i++) {
        const tx = cx + dir.dx * i;
        const ty = cy + dir.dy * i;

        if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) break;

        const tile = this.map.tileAt(tx, ty);
        if (tile === TileType.SOLID) break;

        cells.push({ x: tx, y: ty });

        if (tile === TileType.BREAKABLE) {
          this.map.destroyTile(tx, ty);
          break;
        }
      }
    }

    return cells;
  }

  // --- Explosions ---

  private updateExplosions(state: GameState, deltaMs: number): void {
    const toRemove: string[] = [];
    state.explosions.forEach((explosion, key) => {
      explosion.ttl -= deltaMs;
      if (explosion.ttl <= 0) {
        toRemove.push(key);
      }
    });
    for (const key of toRemove) {
      state.explosions.delete(key);
    }
  }

  private applyExplosionDamage(state: GameState): void {
    state.explosions.forEach((explosion) => {
      const cells = this.parseExplosionCells(explosion.cells);

      state.players.forEach((player) => {
        if (!player.alive || player.invulnerable) return;

        const playerTileX = this.map.pixelToTile(player.x);
        const playerTileY = this.map.pixelToTile(player.y);

        for (const cell of cells) {
          if (playerTileX === cell.x && playerTileY === cell.y) {
            this.killPlayer(state, player, explosion);
            break;
          }
        }
      });
    });
  }

  private parseExplosionCells(cellsStr: string): { x: number; y: number }[] {
    if (!cellsStr) return [];
    return cellsStr.split(";").map((s) => {
      const [x, y] = s.split(",").map(Number);
      return { x, y };
    });
  }

  private killPlayer(state: GameState, player: PlayerState, explosion: ExplosionState): void {
    player.alive = false;
    player.respawnTimer = RESPAWN_TIME;

    // Award point to the bomb owner (if not suicide)
    const killer = state.players.get(explosion.ownerId);
    if (killer && killer.sessionId !== player.sessionId) {
      killer.score++;
    }
  }

  // --- Respawns ---

  private handleRespawns(state: GameState, deltaMs: number): void {
    state.players.forEach((player) => {
      if (player.alive) return;

      player.respawnTimer -= deltaMs;
      if (player.respawnTimer <= 0) {
        this.respawnPlayer(state, player);
      }
    });
  }

  private respawnPlayer(state: GameState, player: PlayerState): void {
    const occupiedTiles = new Set<string>();

    // Avoid spawning on bombs
    state.bombs.forEach((bomb) => {
      occupiedTiles.add(`${bomb.tileX},${bomb.tileY}`);
    });

    // Avoid spawning on active explosions
    state.explosions.forEach((explosion) => {
      const cells = this.parseExplosionCells(explosion.cells);
      for (const cell of cells) {
        occupiedTiles.add(`${cell.x},${cell.y}`);
      }
    });

    const spawn = this.map.getSpawnPoint(occupiedTiles);

    player.x = this.map.tileToPixel(spawn.tileX);
    player.y = this.map.tileToPixel(spawn.tileY);
    player.alive = true;
    player.invulnerable = true;
    player.invulnerabilityTimer = INVULNERABILITY_TIME;
    player.respawnTimer = 0;
  }

  // --- Invulnerability ---

  private updateInvulnerability(state: GameState, deltaMs: number): void {
    state.players.forEach((player) => {
      if (!player.invulnerable) return;

      player.invulnerabilityTimer -= deltaMs;
      if (player.invulnerabilityTimer <= 0) {
        player.invulnerable = false;
        player.invulnerabilityTimer = 0;
      }
    });
  }
}
