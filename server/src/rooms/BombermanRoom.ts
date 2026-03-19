import { Room, Client } from "colyseus";
import { GameState } from "../state/GameState";
import { PlayerState, PlayerInput } from "../state/PlayerState";
import { GameMap } from "../game/GameMap";
import { GameEngine } from "../game/GameEngine";
import {
  TICK_RATE,
  TILE_SIZE,
  DEFAULT_BOMB_COUNT,
  DEFAULT_EXPLOSION_RADIUS,
} from "../game/constants";

export class BombermanRoom extends Room<GameState> {
  private gameMap!: GameMap;
  private engine!: GameEngine;

  onCreate(): void {
    this.setState(new GameState());

    this.gameMap = new GameMap(this.state.tiles);
    this.gameMap.generate();
    this.engine = new GameEngine(this.gameMap);

    this.onMessage("input", (client: Client, data: PlayerInput) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.currentInput = {
          left: !!data.left,
          right: !!data.right,
          up: !!data.up,
          down: !!data.down,
        };
      }
    });

    this.onMessage("bomb", (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.engine.placeBomb(this.state, player);
      }
    });

    this.setSimulationInterval((deltaTime) => {
      this.engine.update(this.state, deltaTime);
    }, 1000 / TICK_RATE);
  }

  onJoin(client: Client, options: { name?: string }): void {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.name = options.name || `Player ${this.clients.length}`;
    player.bombsAvailable = DEFAULT_BOMB_COUNT;
    player.maxBombs = DEFAULT_BOMB_COUNT;
    player.explosionRadius = DEFAULT_EXPLOSION_RADIUS;
    player.alive = true;
    player.invulnerable = true;
    player.invulnerabilityTimer = 1500;

    const occupiedTiles = new Set<string>();
    this.state.players.forEach((p) => {
      const tx = this.gameMap.pixelToTile(p.x);
      const ty = this.gameMap.pixelToTile(p.y);
      occupiedTiles.add(`${tx},${ty}`);
    });

    const spawn = this.gameMap.getSpawnPoint(occupiedTiles);
    player.x = spawn.tileX * TILE_SIZE + TILE_SIZE / 2;
    player.y = spawn.tileY * TILE_SIZE + TILE_SIZE / 2;

    this.state.players.set(client.sessionId, player);

    console.log(`${player.name} joined (${client.sessionId})`);
  }

  onLeave(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`${player.name} left (${client.sessionId})`);
    }
    this.state.players.delete(client.sessionId);
  }

  onDispose(): void {
    console.log("BombermanRoom disposed");
  }
}
