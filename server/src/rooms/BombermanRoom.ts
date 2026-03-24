import { Room, Client } from "colyseus";
import { GameState } from "../state/GameState";
import { PlayerState, PlayerInput } from "../state/PlayerState";
import { StandingEntry } from "../state/StandingEntry";
import { GameMap } from "../game/GameMap";
import { GameEngine } from "../game/GameEngine";
import {
  TICK_RATE,
  TILE_SIZE,
  DEFAULT_BOMB_COUNT,
  DEFAULT_EXPLOSION_RADIUS,
  MATCH_SCORE_TARGET,
  MATCH_DURATION_MS,
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

  onCreate(): void {
    this.setState(new GameState());

    this.state.scoreTarget = Math.min(255, MATCH_SCORE_TARGET);
    this.state.timeRemainingMs = Math.min(2_147_483_647, MATCH_DURATION_MS);
    this.state.matchPhase = "playing";
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

    this.setSimulationInterval((deltaTime) => {
      this.engine.update(this.state, deltaTime);
      this.tickMatchRules(deltaTime);
    }, 1000 / TICK_RATE);
  }

  private tickMatchRules(deltaMs: number): void {
    if (this.state.matchPhase !== "playing") return;

    this.state.timeRemainingMs = Math.max(0, this.state.timeRemainingMs - deltaMs);

    const target = this.state.scoreTarget;
    const atTarget: { id: string; name: string }[] = [];
    this.state.players.forEach((p, sid) => {
      if (p.score >= target) atTarget.push({ id: sid, name: p.name });
    });

    if (atTarget.length === 1) {
      this.finishMatch(atTarget[0].id, atTarget[0].name, "score");
      return;
    }
    if (atTarget.length > 1) {
      this.finishMatchTie(
        atTarget.map((x) => x.name),
        "score"
      );
      return;
    }

    if (this.state.timeRemainingMs <= 0) {
      let max = -1;
      this.state.players.forEach((p) => {
        if (p.score > max) max = p.score;
      });
      if (max < 0 || this.state.players.size === 0) {
        this.finishMatch("", "Nadie", "time");
        return;
      }
      const leaders: { id: string; name: string }[] = [];
      this.state.players.forEach((p, sid) => {
        if (p.score === max) leaders.push({ id: sid, name: p.name });
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

  /**
   * Ranking 1,1,3… por puntos (empates mismo puesto).
   * Debe llamarse antes de fijar matchPhase = finished.
   */
  private rebuildFinalStandings(): void {
    this.state.finalStandings.clear();
    type Row = { sessionId: string; name: string; score: number };
    const rows: Row[] = [];
    this.state.players.forEach((p, sid) => {
      rows.push({ sessionId: sid, name: p.name, score: p.score });
    });
    rows.sort((a, b) => b.score - a.score);
    let place = 1;
    for (let i = 0; i < rows.length; i++) {
      if (i > 0 && rows[i].score !== rows[i - 1].score) {
        place = i + 1;
      }
      const e = new StandingEntry();
      e.place = Math.min(255, place);
      e.name = rows[i].name;
      e.score = rows[i].score;
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
  }

  private finishMatchTie(names: string[], endReason: string): void {
    this.rebuildFinalStandings();
    this.state.winnerSessionId = "";
    this.state.winnerName = `Empate: ${names.join(", ")}`;
    this.state.endReason = endReason;
    this.state.matchPhase = "finished";
  }

  onJoin(client: Client, options: { name?: string }): void {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    const defaultName = `Player ${this.clients.length}`;
    player.name = sanitizeDisplayName(options?.name, defaultName);
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
