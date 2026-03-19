import Phaser from "phaser";
import { NetworkManager, PlayerInput } from "../network/NetworkManager";
import { PlayerSprite } from "../sprites/PlayerSprite";
import { BombSprite } from "../sprites/BombSprite";
import { ExplosionSprite } from "../sprites/ExplosionSprite";
import { HUD } from "../ui/HUD";

const TILE_SIZE = 48;

const TILE_COLORS: Record<number, number> = {
  0: 0x7ec850, // empty — grass green
  1: 0x4a4a4a, // solid — dark gray
  2: 0xb5651d, // breakable — brown
};

export class GameScene extends Phaser.Scene {
  private network!: NetworkManager;
  private players: Map<string, PlayerSprite> = new Map();
  private bombs: Map<string, BombSprite> = new Map();
  private explosions: Map<string, ExplosionSprite> = new Map();
  private hud!: HUD;
  private tileGraphics!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private bombKey!: Phaser.Input.Keyboard.Key;
  private lastInput: PlayerInput = { left: false, right: false, up: false, down: false };
  private connected = false;
  private mapWidth = 15;
  private mapHeight = 13;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    this.tileGraphics = this.add.graphics();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.bombKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.hud = new HUD(this);

    this.connectToServer();
  }

  private async connectToServer(): Promise<void> {
    this.network = new NetworkManager();

    const name = `Player_${Math.floor(Math.random() * 9999)}`;

    try {
      const room = await this.network.connect(name);
      this.connected = true;
      const $ = this.network.getCallbackProxy();

      this.mapWidth = (room.state as any).mapWidth || 15;
      this.mapHeight = (room.state as any).mapHeight || 13;

      room.onStateChange.once(() => {
        this.drawMap((room.state as any).tiles);
      });

      $(room.state as any).tiles.onChange(() => {
        this.drawMap((room.state as any).tiles);
      });

      $(room.state as any).players.onAdd((player: any, sessionId: string) => {
        const isLocal = sessionId === room.sessionId;
        const sprite = new PlayerSprite(this, player.x, player.y, player.name, isLocal);
        this.players.set(sessionId, sprite);
        this.hud.addPlayer(sessionId, player.name);

        $(player).listen("x", (value: number) => {
          sprite.setTargetX(value);
        });

        $(player).listen("y", (value: number) => {
          sprite.setTargetY(value);
        });

        $(player).listen("alive", (value: boolean) => {
          sprite.setAlive(value);
          this.hud.updateScore(sessionId, player.name, player.score, value);
        });

        $(player).listen("invulnerable", (value: boolean) => {
          sprite.setInvulnerable(value);
        });

        $(player).listen("score", (value: number) => {
          this.hud.updateScore(sessionId, player.name, value, player.alive);
        });
      });

      $(room.state as any).players.onRemove((_player: any, sessionId: string) => {
        const sprite = this.players.get(sessionId);
        if (sprite) {
          sprite.destroy();
          this.players.delete(sessionId);
        }
        this.hud.removePlayer(sessionId);
      });

      $(room.state as any).bombs.onAdd((_bomb: any, key: string) => {
        const sprite = new BombSprite(this, _bomb.tileX, _bomb.tileY);
        this.bombs.set(key, sprite);
      });

      $(room.state as any).bombs.onRemove((_bomb: any, key: string) => {
        const sprite = this.bombs.get(key);
        if (sprite) {
          sprite.destroy();
          this.bombs.delete(key);
        }
      });

      $(room.state as any).explosions.onAdd((explosion: any, key: string) => {
        const sprite = new ExplosionSprite(this, explosion.cells);
        this.explosions.set(key, sprite);
      });

      $(room.state as any).explosions.onRemove((_explosion: any, key: string) => {
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
    this.tileGraphics.clear();
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        const tileType = tiles[y * this.mapWidth + x] ?? 0;
        const color = TILE_COLORS[tileType] ?? 0x000000;
        this.tileGraphics.fillStyle(color, 1);
        this.tileGraphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        this.tileGraphics.lineStyle(1, 0x000000, 0.15);
        this.tileGraphics.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  update(): void {
    if (!this.connected) return;

    this.players.forEach((sprite) => sprite.update());

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
