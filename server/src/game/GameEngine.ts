import { MapSchema } from "@colyseus/schema";
import { GameState } from "../state/GameState";
import { PlayerState } from "../state/PlayerState";
import { BombState } from "../state/BombState";
import { ExplosionState } from "../state/ExplosionState";
import { PowerUpState } from "../state/PowerUpState";
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
  PowerUpType,
  POWERUP_DROP_CHANCE,
  MAX_BOMBS,
  MAX_RADIUS,
  MAX_SPEED,
  SPEED_BOOST_AMOUNT,
  FRENZY_SPEED_BONUS,
  DEFAULT_BOMB_COUNT,
  DEFAULT_EXPLOSION_RADIUS,
  DEFAULT_LIVES,
} from "./constants";

export class GameEngine {
  private map: GameMap;
  private nextBombId = 0;
  private nextExplosionId = 0;
  private nextPowerUpId = 0;

  constructor(map: GameMap) {
    this.map = map;
  }

  update(state: GameState, deltaMs: number): void {
    if (state.matchPhase !== "playing") return;

    this.processMovement(state, deltaMs);
    this.updateBombs(state, deltaMs);
    this.updateExplosions(state, deltaMs);
    this.applyExplosionDamage(state);
    this.checkPowerUpPickup(state);
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

      const speed = player.speed * dt;
      const newX = player.x + vx * speed;
      const newY = player.y + vy * speed;

      player.x = this.resolveCollisionX(state, player, player.x, player.y, newX);
      player.y = this.resolveCollisionY(state, player, player.x, player.y, newY);
    });
  }

  /** Mapa + bombas; si hay bomba en el tile pero el centro del jugador sigue en ese tile, permite salir. */
  private tileBlocksMovement(
    state: GameState,
    player: PlayerState,
    tileX: number,
    tileY: number
  ): boolean {
    if (!this.map.isWalkable(tileX, tileY)) return true;
    if (!this.bombAtTile(state.bombs, tileX, tileY)) return false;
    const cx = this.map.pixelToTile(player.x);
    const cy = this.map.pixelToTile(player.y);
    if (tileX === cx && tileY === cy) return false;
    return true;
  }

  private resolveCollisionX(
    state: GameState,
    player: PlayerState,
    oldX: number,
    y: number,
    newX: number
  ): number {
    const half = PLAYER_HITBOX_SIZE / 2;
    const top = y - half;
    const bottom = y + half - 1;

    if (newX > oldX) {
      const edgeX = newX + half;
      const tileX = Math.floor(edgeX / TILE_SIZE);
      const tileYTop = Math.floor(top / TILE_SIZE);
      const tileYBottom = Math.floor(bottom / TILE_SIZE);
      if (
        this.tileBlocksMovement(state, player, tileX, tileYTop) ||
        this.tileBlocksMovement(state, player, tileX, tileYBottom)
      ) {
        return tileX * TILE_SIZE - half - 0.01;
      }
    } else if (newX < oldX) {
      const edgeX = newX - half;
      const tileX = Math.floor(edgeX / TILE_SIZE);
      const tileYTop = Math.floor(top / TILE_SIZE);
      const tileYBottom = Math.floor(bottom / TILE_SIZE);
      if (
        this.tileBlocksMovement(state, player, tileX, tileYTop) ||
        this.tileBlocksMovement(state, player, tileX, tileYBottom)
      ) {
        return (tileX + 1) * TILE_SIZE + half + 0.01;
      }
    }

    return newX;
  }

  private resolveCollisionY(
    state: GameState,
    player: PlayerState,
    x: number,
    oldY: number,
    newY: number
  ): number {
    const half = PLAYER_HITBOX_SIZE / 2;
    const left = x - half;
    const right = x + half - 1;

    if (newY > oldY) {
      const edgeY = newY + half;
      const tileY = Math.floor(edgeY / TILE_SIZE);
      const tileXLeft = Math.floor(left / TILE_SIZE);
      const tileXRight = Math.floor(right / TILE_SIZE);
      if (
        this.tileBlocksMovement(state, player, tileXLeft, tileY) ||
        this.tileBlocksMovement(state, player, tileXRight, tileY)
      ) {
        return tileY * TILE_SIZE - half - 0.01;
      }
    } else if (newY < oldY) {
      const edgeY = newY - half;
      const tileY = Math.floor(edgeY / TILE_SIZE);
      const tileXLeft = Math.floor(left / TILE_SIZE);
      const tileXRight = Math.floor(right / TILE_SIZE);
      if (
        this.tileBlocksMovement(state, player, tileXLeft, tileY) ||
        this.tileBlocksMovement(state, player, tileXRight, tileY)
      ) {
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

    const id = `b${this.nextBombId++}`;
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

    const { cells: affectedCells, destroyed } = this.calculateExplosionCells(
      bomb.tileX, bomb.tileY, bomb.radius
    );

    const explosion = new ExplosionState();
    explosion.tileX = bomb.tileX;
    explosion.tileY = bomb.tileY;
    explosion.radius = bomb.radius;
    explosion.cells = affectedCells.map((c) => `${c.x},${c.y}`).join(";");
    explosion.ttl = EXPLOSION_DURATION;
    explosion.ownerId = bomb.ownerId;

    const id = `e${this.nextExplosionId++}`;
    state.explosions.set(id, explosion);

    state.bombs.delete(bombKey);

    // Destroy power-ups caught in blast
    const puToRemove: string[] = [];
    state.powerUps.forEach((pu, key) => {
      for (const cell of affectedCells) {
        if (pu.tileX === cell.x && pu.tileY === cell.y) {
          puToRemove.push(key);
          break;
        }
      }
    });
    for (const key of puToRemove) {
      state.powerUps.delete(key);
    }

    // Spawn power-ups from destroyed blocks
    for (const tile of destroyed) {
      if (Math.random() < POWERUP_DROP_CHANCE) {
        const pu = new PowerUpState();
        pu.tileX = tile.x;
        pu.tileY = tile.y;
        pu.powerUpType = Math.floor(Math.random() * 3);
        state.powerUps.set(`p${this.nextPowerUpId++}`, pu);
      }
    }

    // Trigger frenzy when the last breakable block is destroyed
    if (destroyed.length > 0 && !state.isFrenzy && !this.map.hasBreakables()) {
      this.triggerFrenzy(state);
    }

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
    cx: number,
    cy: number,
    radius: number
  ): { cells: { x: number; y: number }[]; destroyed: { x: number; y: number }[] } {
    const cells: { x: number; y: number }[] = [{ x: cx, y: cy }];
    const destroyed: { x: number; y: number }[] = [];

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
          destroyed.push({ x: tx, y: ty });
          break;
        }
      }
    }

    return { cells, destroyed };
  }

  private triggerFrenzy(state: GameState): void {
    state.isFrenzy = true;
    state.players.forEach((player) => {
      player.maxBombs = Math.min(player.maxBombs + 1, MAX_BOMBS);
      player.bombsAvailable = Math.min(player.bombsAvailable + 1, player.maxBombs);
      player.explosionRadius = Math.min(player.explosionRadius + 1, MAX_RADIUS);
      player.speed = Math.min(player.speed + FRENZY_SPEED_BONUS, MAX_SPEED);
    });
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
    player.lives = Math.max(0, player.lives - 1);
    player.alive = false;

    if (state.matchPhase === "playing") {
      const killer = state.players.get(explosion.ownerId);
      if (killer && killer.sessionId !== player.sessionId) {
        killer.score++;
      }
    }

    // Si aún le quedan vidas, programa el respawn; si no, muere permanentemente
    if (player.lives > 0) {
      player.respawnTimer = RESPAWN_TIME;
    } else {
      player.timeOfDeathMs = state.timeRemainingMs;
      player.respawnTimer = 0;
    }
  }

  /** Retorna el número de jugadores que aún tienen al menos 1 vida. */
  countAlivePlayers(state: GameState): { count: number; lastAlive: { id: string; name: string } | null } {
    let count = 0;
    let lastAlive: { id: string; name: string } | null = null;
    state.players.forEach((p, sid) => {
      if (p.lives > 0) {
        count++;
        lastAlive = { id: sid, name: p.name };
      }
    });
    return { count, lastAlive };
  }

  // --- Power-ups ---

  private checkPowerUpPickup(state: GameState): void {
    const toRemove: string[] = [];

    state.players.forEach((player) => {
      if (!player.alive) return;
      const px = this.map.pixelToTile(player.x);
      const py = this.map.pixelToTile(player.y);

      state.powerUps.forEach((pu, key) => {
        if (pu.tileX === px && pu.tileY === py) {
          this.applyPowerUp(player, pu.powerUpType);
          toRemove.push(key);
        }
      });
    });

    for (const key of toRemove) {
      state.powerUps.delete(key);
    }
  }

  private applyPowerUp(player: PlayerState, type: number): void {
    switch (type) {
      case PowerUpType.EXTRA_BOMB:
        player.maxBombs = Math.min(player.maxBombs + 1, MAX_BOMBS);
        player.bombsAvailable = Math.min(player.bombsAvailable + 1, player.maxBombs);
        break;
      case PowerUpType.EXTRA_RADIUS:
        player.explosionRadius = Math.min(player.explosionRadius + 1, MAX_RADIUS);
        break;
      case PowerUpType.SPEED_BOOST:
        player.speed = Math.min(player.speed + SPEED_BOOST_AMOUNT, MAX_SPEED);
        break;
    }
  }

  // --- Respawns ---

  private handleRespawns(state: GameState, deltaMs: number): void {
    state.players.forEach((player) => {
      if (player.alive) return;
      // Sin vidas restantes: no reaparece
      if (player.lives === 0) return;

      player.respawnTimer -= deltaMs;
      if (player.respawnTimer <= 0) {
        this.respawnPlayer(state, player);
      }
    });
  }

  private respawnPlayer(state: GameState, player: PlayerState): void {
    const occupiedTiles = new Set<string>();

    state.bombs.forEach((bomb) => {
      occupiedTiles.add(`${bomb.tileX},${bomb.tileY}`);
    });

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

    // Reset to base stats, then re-apply frenzy bonus if active
    player.maxBombs = DEFAULT_BOMB_COUNT;
    player.bombsAvailable = DEFAULT_BOMB_COUNT;
    player.explosionRadius = DEFAULT_EXPLOSION_RADIUS;
    player.speed = PLAYER_SPEED;

    if (state.isFrenzy) {
      player.maxBombs = Math.min(player.maxBombs + 1, MAX_BOMBS);
      player.bombsAvailable = Math.min(player.bombsAvailable + 1, player.maxBombs);
      player.explosionRadius = Math.min(player.explosionRadius + 1, MAX_RADIUS);
      player.speed = Math.min(player.speed + FRENZY_SPEED_BONUS, MAX_SPEED);
    }
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
