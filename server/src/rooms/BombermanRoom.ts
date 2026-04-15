import { Room, Client } from "colyseus";
import type { PlayerInput } from "bomberman-shared";
import { PLAYER_COLORS } from "bomberman-shared";
import { GameState } from "../state/GameState";
import { PlayerState } from "../state/PlayerState";
import { StandingEntry } from "../state/StandingEntry";
import { GameMap } from "../game/GameMap";
import { GameEngine } from "../game/GameEngine";
import {
  TICK_RATE,
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  DEFAULT_BOMB_COUNT,
  DEFAULT_EXPLOSION_RADIUS,
  PLAYER_SPEED,
  INVULNERABILITY_TIME,
  MATCH_SCORE_TARGET,
  MATCH_DURATION_MS,
  RESTART_COUNTDOWN_MS,
  DEFAULT_LIVES,
} from "../game/constants";

const DISPLAY_NAME_MAX_LEN = 24;

function sanitizeDisplayName(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const noControl = raw.replace(/[\u0000-\u001F\u007F]/g, "");
  const trimmed = noControl.trim().slice(0, DISPLAY_NAME_MAX_LEN).trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export class BombermanRoom extends Room<GameState> {
  private gameMap!: GameMap;
  private engine!: GameEngine;
  private isMultiplayerMatch: boolean = false;

  onCreate(): void {
    this.setState(new GameState());

    this.state.mapWidth = MAP_WIDTH;
    this.state.mapHeight = MAP_HEIGHT;
    this.state.scoreTarget = Math.min(255, MATCH_SCORE_TARGET);
    this.state.timeRemainingMs = Math.min(2_147_483_647, MATCH_DURATION_MS);
    this.state.matchPhase = "lobby";
    this.state.winnerSessionId = "";
    this.state.winnerName = "";
    this.state.endReason = "";
    this.state.finalStandings.clear();

    this.gameMap = new GameMap(this.state.tiles);
    this.gameMap.generate();
    this.engine = new GameEngine(this.gameMap);

    this.onMessage("input", (client: Client, data: PlayerInput) => {
      if (this.state.matchPhase !== "playing") return;
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
      if (this.state.matchPhase !== "playing") return;
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.engine.placeBomb(this.state, player);
      }
    });

    this.onMessage("taunt", (client: Client, data: { index: number }) => {
      if (this.state.matchPhase !== "playing") return;
      const idx = Math.floor(Number(data?.index ?? 0));
      if (idx < 0 || idx > 2) return;
      // Broadcast to others only — sender already showed the preview locally
      this.broadcast("taunt", { sessionId: client.sessionId, index: idx }, { except: client });
    });

    this.onMessage("setColor", (client: Client, data: { colorIndex: number }) => {
      if (this.state.matchPhase !== "lobby") return;
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const newIndex = Number(data?.colorIndex ?? 0);
      if (newIndex < 0 || newIndex >= PLAYER_COLORS.length) return;

      // Check if color is already taken
      let isTaken = false;
      this.state.players.forEach((p) => {
        if (p.colorIndex === newIndex) isTaken = true;
      });

      if (!isTaken) {
        player.colorIndex = newIndex;
      }
    });

    this.onMessage("startGame", (client: Client) => {
      if (this.state.matchPhase !== "lobby") return;
      const player = this.state.players.get(client.sessionId);
      if (player && player.isHost) {
        this.startPlayingMatch();
      }
    });

    this.setSimulationInterval((deltaTime) => {
      this.engine.update(this.state, deltaTime);
      this.tickMatchRules(deltaTime);
      this.tickRestart(deltaTime);
    }, 1000 / TICK_RATE);
  }

  private tickMatchRules(deltaMs: number): void {
    if (this.state.matchPhase !== "playing") return;

    this.state.timeRemainingMs = Math.max(0, this.state.timeRemainingMs - deltaMs);

    // --- Condición de victoria por supervivencia o fin ---
    const { count, lastAlive } = this.engine.countAlivePlayers(this.state);
    
    if (this.isMultiplayerMatch) {
      if (count <= 1) {
        if (count === 1 && lastAlive) {
          this.finishMatch(lastAlive.id, lastAlive.name, "lastAlive");
        } else {
          this.finishMatchTie([], "lastAlive");
        }
        return;
      }
    } else {
      // Partida solitario/pruebas: termina al perder las vidas
      if (count === 0) {
        this.finishMatchTie([], "lastAlive");
        return;
      }
    }

    // --- Condición de tiempo agotado ---
    if (this.state.timeRemainingMs <= 0) {
      let max = -1;
      this.state.players.forEach((p) => {
        if (p.lives > max) max = p.lives;
      });
      if (max < 0 || this.state.players.size === 0) {
        this.finishMatch("", "Nadie", "time");
        return;
      }
      const leaders: { id: string; name: string }[] = [];
      this.state.players.forEach((p, sid) => {
        if (p.lives === max) leaders.push({ id: sid, name: p.name });
      });
      if (leaders.length === 1) {
        this.finishMatch(leaders[0].id, leaders[0].name, "time");
      } else {
        this.finishMatchTie(
          leaders.map((l) => l.name),
          "time"
        );
      }
    }
  }

  private tickRestart(deltaMs: number): void {
    if (this.state.matchPhase !== "finished") return;

    this.state.restartCountdownMs = Math.max(0, this.state.restartCountdownMs - deltaMs);
    if (this.state.restartCountdownMs <= 0) {
      this.restartMatch();
    }
  }

  private restartMatch(): void {
    // Al reiniciar desde finished, vamos al lobby
    this.state.bombs.clear();
    this.state.explosions.clear();
    this.state.powerUps.clear();
    this.state.finalStandings.clear();

    this.state.winnerSessionId = "";
    this.state.winnerName = "";
    this.state.endReason = "";
    this.state.restartCountdownMs = 0;
    this.state.isFrenzy = false;

    this.state.matchPhase = "lobby";
    console.log("Returned to lobby");
  }

  private startPlayingMatch(): void {
    this.state.bombs.clear();
    this.state.explosions.clear();
    this.state.powerUps.clear();
    this.state.finalStandings.clear();

    this.gameMap.generate();

    this.state.timeRemainingMs = Math.min(2_147_483_647, MATCH_DURATION_MS);
    this.state.scoreTarget = Math.min(255, MATCH_SCORE_TARGET);
    this.state.winnerSessionId = "";
    this.state.winnerName = "";
    this.state.endReason = "";
    this.state.restartCountdownMs = 0;
    this.state.isFrenzy = false;

    const occupiedTiles = new Set<string>();
    this.state.players.forEach((player) => {
      player.score = 0;
      player.lives = DEFAULT_LIVES;
      player.bombsAvailable = DEFAULT_BOMB_COUNT;
      player.maxBombs = DEFAULT_BOMB_COUNT;
      player.explosionRadius = DEFAULT_EXPLOSION_RADIUS;
      player.speed = PLAYER_SPEED;
      player.alive = true;
      player.invulnerable = true;
      player.invulnerabilityTimer = INVULNERABILITY_TIME;
      player.respawnTimer = 0;
      player.timeOfDeathMs = -1;
      player.currentInput = { left: false, right: false, up: false, down: false };

      const spawn = this.gameMap.getSpawnPoint(occupiedTiles);
      player.x = spawn.tileX * TILE_SIZE + TILE_SIZE / 2;
      player.y = spawn.tileY * TILE_SIZE + TILE_SIZE / 2;
      occupiedTiles.add(`${spawn.tileX},${spawn.tileY}`);
    });

    this.isMultiplayerMatch = this.state.players.size > 1;
    this.state.matchPhase = "playing";
    console.log(`Match started from lobby (Multiplayer: ${this.isMultiplayerMatch})`);
  }

  /**
   * Ranking 1,1,3… por vidas restantes (empates mismo puesto; kills como desempate).
   * Debe llamarse antes de fijar matchPhase = finished.
   */
  private rebuildFinalStandings(): void {
    this.state.finalStandings.clear();
    type Row = { sessionId: string; name: string; lives: number; kills: number; timeOfDeathMs: number };
    const rows: Row[] = [];
    this.state.players.forEach((p, sid) => {
      rows.push({ sessionId: sid, name: p.name, lives: p.lives, kills: p.score, timeOfDeathMs: p.timeOfDeathMs });
    });
    
    // Ordenar: 
    // 1- Más vidas primero
    // 2- Si ambos tienen 0 vidas, empata primero el que murió ÚLTIMO (timeOfDeathMs menor)
    // 3- Empates secundarios se deciden por kills
    rows.sort((a, b) => {
      if (a.lives !== b.lives) return b.lives - a.lives;
      if (a.lives === 0) {
        if (a.timeOfDeathMs !== b.timeOfDeathMs) {
          return a.timeOfDeathMs - b.timeOfDeathMs;
        }
      }
      return b.kills - a.kills;
    });

    let place = 1;
    for (let i = 0; i < rows.length; i++) {
      if (i > 0) {
        // En este sistema es complejo rastrear empates de muertes distintas. Solo el place
        // lo subiremos para el siguiente. Lo hacemos escalonado normal:
        const prev = rows[i - 1];
        if (rows[i].lives !== prev.lives || rows[i].timeOfDeathMs !== prev.timeOfDeathMs || rows[i].kills !== prev.kills) {
          place = i + 1;
        }
      }
      const e = new StandingEntry();
      e.place = Math.min(255, place);
      e.name = rows[i].name;
      // Reutilizamos el campo score para almacenar vidas restantes
      e.score = rows[i].lives;
      e.sessionId = rows[i].sessionId;
      this.state.finalStandings.push(e);
    }
  }

  private finishMatch(winnerSessionId: string, winnerName: string, endReason: string): void {
    this.rebuildFinalStandings();
    this.state.winnerSessionId = winnerSessionId;
    this.state.winnerName = winnerName;
    this.state.endReason = endReason;
    this.state.matchPhase = "finished";
    this.state.restartCountdownMs = RESTART_COUNTDOWN_MS;
  }

  private finishMatchTie(names: string[], endReason: string): void {
    this.rebuildFinalStandings();
    this.state.winnerSessionId = "";
    this.state.winnerName = `Empate: ${names.join(", ")}`;
    this.state.endReason = endReason;
    this.state.matchPhase = "finished";
    this.state.restartCountdownMs = RESTART_COUNTDOWN_MS;
  }

  onJoin(client: Client, options: { name?: string }): void {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    const defaultName = `Player ${this.clients.length}`;
    player.name = sanitizeDisplayName(options?.name, defaultName);
    player.bombsAvailable = DEFAULT_BOMB_COUNT;
    player.maxBombs = DEFAULT_BOMB_COUNT;
    player.explosionRadius = DEFAULT_EXPLOSION_RADIUS;
    player.speed = PLAYER_SPEED;
    player.lives = DEFAULT_LIVES;
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

    // Asignar rol de Host si es el primer jugador
    if (this.state.players.size === 0) {
      player.isHost = true;
    }

    // Encontrar primer color disponible
    const usedColors = new Set<number>();
    this.state.players.forEach((p) => usedColors.add(p.colorIndex));
    for (let i = 0; i < PLAYER_COLORS.length; i++) {
      if (!usedColors.has(i)) {
        player.colorIndex = i;
        break;
      }
    }

    // Late joiner spectating logic
    if (this.state.matchPhase !== "lobby") {
      player.alive = false;
      player.lives = 0;
    }

    this.state.players.set(client.sessionId, player);

    console.log(`${player.name} joined (${client.sessionId})`);
  }

  onLeave(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`${player.name} left (${client.sessionId})`);
      const wasHost = player.isHost;
      this.state.players.delete(client.sessionId);

      // Reassign host if the leaving player was host
      if (wasHost && this.state.players.size > 0) {
        // Obtenemos el primer jugador del mapa
        const firstEntry = this.state.players.entries().next().value;
        if (firstEntry) {
          const [firstSessionId, nextHost] = firstEntry;
          nextHost.isHost = true;
          console.log(`${nextHost.name} (${firstSessionId}) is the new Host`);
        }
      }
    } else {
      this.state.players.delete(client.sessionId);
    }
  }

  onDispose(): void {
    console.log("BombermanRoom disposed");
  }
}
