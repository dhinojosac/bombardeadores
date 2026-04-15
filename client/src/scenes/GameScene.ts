import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, TileType, PowerUpType } from "bomberman-shared";
import { NetworkManager, PlayerInput } from "../network/NetworkManager";
import { PlayerSprite } from "../sprites/PlayerSprite";
import { BombSprite } from "../sprites/BombSprite";
import { ExplosionSprite } from "../sprites/ExplosionSprite";
import { PowerUpSprite } from "../sprites/PowerUpSprite";
import { HUD } from "../ui/HUD";
import { registerGameTextures } from "../assets/registerTextures";
import { OPTIONAL_IMAGE_ASSETS } from "../assets/optionalAssets";
import { OPTIONAL_AUDIO_ASSETS } from "../assets/optionalAudio";
import { AudioManager } from "../audio/AudioManager";
import { validateOptionalTextures } from "../assets/validateTextures";
import { showNameOverlay, DISPLAY_NAME_STORAGE_KEY } from "../ui/nameOverlay";
import { showControlsOverlay } from "../ui/controlsOverlay";
import {
  showResultsOverlay,
  hideResultsOverlay,
  collectStandingsFromState,
  updateResultsCountdown,
} from "../ui/resultsOverlay";

const TILE_KEYS: Record<number, string> = {
  [TileType.EMPTY]: "tile_empty",
  [TileType.SOLID]: "tile_solid",
  [TileType.BREAKABLE]: "tile_breakable",
};

const POWERUP_TEXTURES: Record<number, string> = {
  [PowerUpType.EXTRA_BOMB]: "powerup_bomb",
  [PowerUpType.EXTRA_RADIUS]: "powerup_radius",
  [PowerUpType.SPEED_BOOST]: "powerup_speed",
};

const TAUNT_TEXTS = ["Perkin!!", "Jiji!", "GG!", "Sorry!"];

export class GameScene extends Phaser.Scene {
  private network!: NetworkManager;
  private players: Map<string, PlayerSprite> = new Map();
  private bombs: Map<string, BombSprite> = new Map();
  private explosions: Map<string, ExplosionSprite> = new Map();
  private powerUps: Map<string, PowerUpSprite> = new Map();
  private hud!: HUD;
  private tileLayer!: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private bombKey!: Phaser.Input.Keyboard.Key;
  private tauntKey!: Phaser.Input.Keyboard.Key;
  private tauntIndex = 2; // starts at 2 so first press wraps to 0 ("¡Adiós!")
  private tauntDebounce: ReturnType<typeof setTimeout> | null = null;
  private lastInput: PlayerInput = { left: false, right: false, up: false, down: false };
  private connected = false;
  private matchPlaying = true;
  private mapWidth = MAP_WIDTH;
  private mapHeight = MAP_HEIGHT;
  private colyseusRoom: Room | null = null;
  private audio!: AudioManager;

  constructor() {
    super({ key: "GameScene" });
  }

  preload(): void {
    // Build per-key retry queues so we can try each format in sequence
    const audioRetryQueues = new Map<string, string[]>();
    for (const { key, urls } of OPTIONAL_AUDIO_ASSETS) {
      const queue = [...urls]; // ["mp3_url", "wav_url", "ogg_url"]
      audioRetryQueues.set(key, queue);
      const first = queue.shift();
      if (first) this.load.audio(key, first); // load only the first format
    }

    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      if (file.type === "image") {
        console.warn(`[assets] Falló la carga de "${file.key}". Se usará fallback generado.`);
        return;
      }
      if (file.type === "audio") {
        const queue = audioRetryQueues.get(file.key);
        if (queue && queue.length > 0) {
          const nextUrl = queue.shift()!;
          console.info(`[audio] Reintentando "${file.key}" con formato alternativo...`);
          this.load.audio(file.key, nextUrl);
          this.load.start(); // ensure loader processes the newly queued file
        } else {
          console.info(`[audio] "${file.key}" no disponible en ningún formato, silencio.`);
        }
      }
    });

    for (const { key, url } of OPTIONAL_IMAGE_ASSETS) {
      this.load.image(key, url);
    }
  }

  create(): void {
    validateOptionalTextures(this);
    registerGameTextures(this);

    this.audio = new AudioManager(this, OPTIONAL_AUDIO_ASSETS);

    this.tileLayer = this.add.container(0, 0);
    this.tileLayer.setDepth(0);

    this.hud = new HUD(this, (level) => {
      this.audio.setVolumeLevel(level);
    });

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
      // Show controls guide while connecting in the background
      showControlsOverlay();
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
    this.tauntKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
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

      // Start music once the match is confirmed playing
      if (rs.matchPhase === "playing") {
        this.audio.playMusic(rs.isFrenzy ? "music_frenzy" : "music_game");
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
          this.audio.playSfx("sfx_victory");
          this.audio.stopMusic();
        } else if (value === "playing") {
          hideResultsOverlay();
          this.audio.playMusic("music_game");
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
        this.hud.updateScore(sessionId, player.name, player.score, player.alive, rs.scoreTarget, player.lives, 5);

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
          this.hud.updateScore(sessionId, player.name, player.score, value, rs.scoreTarget, player.lives, 5);
          if (!value) this.audio.playSfx("sfx_death");
        });

        $(player).listen("invulnerable", (value: boolean) => {
          sprite.setInvulnerable(value);
        });

        $(player).listen("score", (value: number) => {
          this.hud.updateScore(sessionId, player.name, value, player.alive, rs.scoreTarget, player.lives, 5);
        });

        $(player).listen("lives", (value: number) => {
          this.hud.updateScore(sessionId, player.name, player.score, player.alive, rs.scoreTarget, value, 5);
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
        this.audio.playSfx("sfx_bomb_place");
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
        this.audio.playSfx("sfx_explosion");
      });

      $(rs).explosions.onRemove((_explosion: any, key: string) => {
        const sprite = this.explosions.get(key);
        if (sprite) {
          sprite.destroy();
          this.explosions.delete(key);
        }
      });

      $(rs).powerUps.onAdd((powerUp: any, key: string) => {
        const tex = POWERUP_TEXTURES[powerUp.powerUpType] ?? "powerup_bomb";
        const sprite = new PowerUpSprite(this, powerUp.tileX, powerUp.tileY, tex);
        this.powerUps.set(key, sprite);
      });

      $(rs).powerUps.onRemove((_pu: any, key: string) => {
        const sprite = this.powerUps.get(key);
        if (sprite) {
          sprite.destroy();
          this.powerUps.delete(key);
          this.audio.playSfx("sfx_powerup");
        }
      });

      $(rs).listen("restartCountdownMs", (value: number) => {
        updateResultsCountdown(value);
      });

      // Sync frenzy state for late-joiners and listen for activation
      if (rs.isFrenzy) {
        this.hud.setFrenzy(true);
        this.audio.playFrenzyMusic();
      }
      $(rs).listen("isFrenzy", (value: boolean) => {
        this.hud.setFrenzy(value);
        if (value) {
          this.audio.playFrenzyMusic();
        } else {
          this.audio.playMusic("music_game");
        }
      });

      room.onMessage("taunt", (data: { sessionId: string; index: number }) => {
        const sprite = this.players.get(data.sessionId);
        const text = TAUNT_TEXTS[data.index] ?? "¡!";
        sprite?.showTaunt(this, text);
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

    if (Phaser.Input.Keyboard.JustDown(this.tauntKey) && this.matchPlaying) {
      this.tauntIndex = (this.tauntIndex + 1) % 3;
      // Show preview immediately to the local player
      const localSprite = this.colyseusRoom
        ? this.players.get(this.colyseusRoom.sessionId)
        : undefined;
      localSprite?.showTaunt(this, TAUNT_TEXTS[this.tauntIndex]);
      // Send to server (and others) after 500ms of inactivity
      if (this.tauntDebounce) clearTimeout(this.tauntDebounce);
      this.tauntDebounce = setTimeout(() => {
        this.network.sendTaunt(this.tauntIndex);
        this.tauntDebounce = null;
      }, 500);
    }
  }
}
