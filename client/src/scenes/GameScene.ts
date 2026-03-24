import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { NetworkManager, PlayerInput } from "../network/NetworkManager";
import { PlayerSprite } from "../sprites/PlayerSprite";
import { BombSprite } from "../sprites/BombSprite";
import { ExplosionSprite } from "../sprites/ExplosionSprite";
import { HUD } from "../ui/HUD";
import { registerGameTextures } from "../assets/registerTextures";
import { OPTIONAL_IMAGE_ASSETS } from "../assets/optionalAssets";
import { validateOptionalTextures } from "../assets/validateTextures";
import { showNameOverlay, DISPLAY_NAME_STORAGE_KEY } from "../ui/nameOverlay";
import {
  showResultsOverlay,
  hideResultsOverlay,
  collectStandingsFromState,
} from "../ui/resultsOverlay";

const TILE_SIZE = 48;

const TILE_KEYS: Record<number, string> = {
  0: "tile_empty",
  1: "tile_solid",
  2: "tile_breakable",
};

export class GameScene extends Phaser.Scene {
  private network!: NetworkManager;
  private players: Map<string, PlayerSprite> = new Map();
  private bombs: Map<string, BombSprite> = new Map();
  private explosions: Map<string, ExplosionSprite> = new Map();
  private hud!: HUD;
  private tileLayer!: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private bombKey!: Phaser.Input.Keyboard.Key;
  private lastInput: PlayerInput = { left: false, right: false, up: false, down: false };
  private connected = false;
  private matchPlaying = true;
  private mapWidth = 15;
  private mapHeight = 13;
  private colyseusRoom: Room | null = null;

  constructor() {
    super({ key: "GameScene" });
  }

  preload(): void {
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.warn(`[assets] Falló la carga de "${file.key}". Se usará fallback generado.`);
    });

    for (const { key, url } of OPTIONAL_IMAGE_ASSETS) {
      this.load.image(key, url);
    }
  }

  create(): void {
    validateOptionalTextures(this);
    registerGameTextures(this);

    this.tileLayer = this.add.container(0, 0);
    this.tileLayer.setDepth(0);

    this.hud = new HUD(this);

    showNameOverlay((raw) => {
      let displayName = raw;
      if (!displayName) {
        displayName = `Player_${Math.floor(Math.random() * 9999)}`;
      } else {
        try {
          localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, displayName);
        } catch {
          /* ignore */
        }
      }
      void this.connectToServer(displayName);
    });
  }

  private syncMatchHud(rs: {
    matchPhase: string;
    winnerName: string;
    endReason: string;
  }): void {
    this.hud.setMatchEnd(rs.matchPhase, rs.winnerName, rs.endReason);
  }

  private refreshResultsOverlay(rs: any): void {
    if (!this.colyseusRoom) return;
    if (rs.matchPhase !== "finished") {
      hideResultsOverlay();
      return;
    }
    const rows = collectStandingsFromState(rs.finalStandings);
    showResultsOverlay(rows, this.colyseusRoom.sessionId, rs.endReason ?? "");
  }

  private scheduleResultsOverlay(rs: any): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.refreshResultsOverlay(rs));
    });
  }

  /** Tras el overlay de nombre: si se registra antes, Phaser captura WASD y no llegan al campo de texto. */
  private initKeyboard(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.bombKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  private async connectToServer(displayName: string): Promise<void> {
    this.network = new NetworkManager();

    try {
      const room = await this.network.connect(displayName);
      this.colyseusRoom = room;
      this.initKeyboard();
      this.connected = true;
      const $ = this.network.getCallbackProxy();
      const rs = room.state as any;

      this.mapWidth = rs.mapWidth || 15;
      this.mapHeight = rs.mapHeight || 13;

      this.matchPlaying = rs.matchPhase === "playing";
      this.hud.setTimerMs(rs.timeRemainingMs);
      this.hud.setScoreTarget(rs.scoreTarget);
      this.syncMatchHud(rs);
      if (rs.matchPhase === "finished") {
        this.scheduleResultsOverlay(rs);
      }

      $(rs).listen("timeRemainingMs", (value: number) => {
        this.hud.setTimerMs(value);
      });
      $(rs).listen("scoreTarget", (value: number) => {
        this.hud.setScoreTarget(value);
      });
      $(rs).listen("matchPhase", (value: string) => {
        this.matchPlaying = value === "playing";
        this.syncMatchHud(rs);
        if (value === "finished") {
          this.scheduleResultsOverlay(rs);
        } else {
          hideResultsOverlay();
        }
      });
      $(rs).listen("winnerName", () => this.syncMatchHud(rs));
      $(rs).listen("endReason", () => this.syncMatchHud(rs));

      $(rs).finalStandings.onAdd(() => {
        if (rs.matchPhase === "finished") {
          this.scheduleResultsOverlay(rs);
        }
      });

      room.onStateChange.once(() => {
        this.drawMap(rs.tiles);
      });

      $(rs).tiles.onChange(() => {
        this.drawMap(rs.tiles);
      });

      $(rs).players.onAdd((player: any, sessionId: string) => {
        const isLocal = sessionId === room.sessionId;
        const sprite = new PlayerSprite(
          this,
          player.x,
          player.y,
          player.name,
          isLocal,
          player.direction ?? 0
        );
        this.players.set(sessionId, sprite);
        this.hud.addPlayer(sessionId, player.name);
        this.hud.updateScore(sessionId, player.name, player.score, player.alive, rs.scoreTarget);

        $(player).listen("x", (value: number) => {
          sprite.setTargetX(value);
        });

        $(player).listen("y", (value: number) => {
          sprite.setTargetY(value);
        });

        $(player).listen("direction", (value: number) => {
          sprite.setDirection(value);
        });

        $(player).listen("alive", (value: boolean) => {
          sprite.setAlive(value);
          this.hud.updateScore(sessionId, player.name, player.score, value, rs.scoreTarget);
        });

        $(player).listen("invulnerable", (value: boolean) => {
          sprite.setInvulnerable(value);
        });

        $(player).listen("score", (value: number) => {
          this.hud.updateScore(sessionId, player.name, value, player.alive, rs.scoreTarget);
        });
      });

      $(rs).players.onRemove((_player: any, sessionId: string) => {
        const sprite = this.players.get(sessionId);
        if (sprite) {
          sprite.destroy();
          this.players.delete(sessionId);
        }
        this.hud.removePlayer(sessionId);
      });

      $(rs).bombs.onAdd((_bomb: any, key: string) => {
        const sprite = new BombSprite(this, _bomb.tileX, _bomb.tileY);
        this.bombs.set(key, sprite);
      });

      $(rs).bombs.onRemove((_bomb: any, key: string) => {
        const sprite = this.bombs.get(key);
        if (sprite) {
          sprite.destroy();
          this.bombs.delete(key);
        }
      });

      $(rs).explosions.onAdd((explosion: any, key: string) => {
        const sprite = new ExplosionSprite(this, explosion.cells);
        this.explosions.set(key, sprite);
      });

      $(rs).explosions.onRemove((_explosion: any, key: string) => {
        const sprite = this.explosions.get(key);
        if (sprite) {
          sprite.destroy();
          this.explosions.delete(key);
        }
      });
    } catch (err) {
      console.error("Failed to connect:", err);
    }
  }

  private drawMap(tiles: any): void {
    this.tileLayer.removeAll(true);
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tileType = tiles[y * this.mapWidth + x] ?? 0;
        const key = TILE_KEYS[tileType] ?? "tile_empty";
        const px = x * TILE_SIZE + TILE_SIZE / 2;
        const py = y * TILE_SIZE + TILE_SIZE / 2;
        const img = this.add.image(px, py, key);
        img.setOrigin(0.5, 0.5);
        img.setDisplaySize(TILE_SIZE, TILE_SIZE);
        this.tileLayer.add(img);
      }
    }
  }

  update(): void {
    if (!this.connected) return;

    this.players.forEach((sprite) => sprite.update());

    if (!this.matchPlaying) return;

    const input: PlayerInput = {
      left: this.cursors.left.isDown || this.wasd.A.isDown,
      right: this.cursors.right.isDown || this.wasd.D.isDown,
      up: this.cursors.up.isDown || this.wasd.W.isDown,
      down: this.cursors.down.isDown || this.wasd.S.isDown,
    };

    if (
      input.left !== this.lastInput.left ||
      input.right !== this.lastInput.right ||
      input.up !== this.lastInput.up ||
      input.down !== this.lastInput.down
    ) {
      this.network.sendInput(input);
      this.lastInput = { ...input };
    }

    if (Phaser.Input.Keyboard.JustDown(this.bombKey)) {
      this.network.sendBomb();
    }
  }
}
