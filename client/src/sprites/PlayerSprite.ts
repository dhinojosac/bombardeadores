import Phaser from "phaser";
import { PLAYER_TEXTURE_BY_DIRECTION } from "../assets/registerTextures";

const PLAYER_COLORS = [0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xecf0f1];
let colorIndex = 0;

/** Debe coincidir con PLAYER_HITBOX_SIZE del servidor para sensación coherente. */
const HITBOX_SIZE = 30;
const LERP_SPEED = 0.25;

function textureForDirection(dir: number): string {
  return PLAYER_TEXTURE_BY_DIRECTION[dir & 3] ?? PLAYER_TEXTURE_BY_DIRECTION[0];
}

export class PlayerSprite {
  container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Sprite;
  private nameText: Phaser.GameObjects.Text;
  private targetX: number;
  private targetY: number;
  private color: number;
  private direction: number;
  private invulnerable = false;
  isLocal: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    name: string,
    isLocal: boolean,
    initialDirection: number = 0
  ) {
    this.isLocal = isLocal;
    this.targetX = x;
    this.targetY = y;
    this.color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    colorIndex++;
    this.direction = initialDirection & 3;

    this.body = scene.add.sprite(0, 0, textureForDirection(this.direction));
    this.body.setDisplaySize(HITBOX_SIZE, HITBOX_SIZE);
    this.body.setTint(this.color);

    this.nameText = scene.add.text(0, -HITBOX_SIZE / 2 - 10, name, {
      fontSize: "11px",
      color: "#ffffff",
      fontFamily: "monospace",
      align: "center",
    });
    this.nameText.setOrigin(0.5, 1);

    this.container = scene.add.container(x, y, [this.body, this.nameText]);
    this.container.setDepth(10);
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  setTargetX(x: number): void {
    this.targetX = x;
  }

  setTargetY(y: number): void {
    this.targetY = y;
  }

  setDirection(dir: number): void {
    const d = dir & 3;
    if (d === this.direction) return;
    this.direction = d;
    this.body.setTexture(textureForDirection(d));
    this.body.setDisplaySize(HITBOX_SIZE, HITBOX_SIZE);
    this.body.setTint(this.invulnerable ? 0xffff00 : this.color);
  }

  setAlive(alive: boolean): void {
    this.container.setAlpha(alive ? 1 : 0.2);
  }

  setInvulnerable(invulnerable: boolean): void {
    this.invulnerable = invulnerable;
    if (invulnerable) {
      this.body.setAlpha(0.6);
      this.body.setTint(0xffff00);
    } else {
      this.body.setAlpha(1);
      this.body.setTint(this.color);
    }
  }

  update(): void {
    this.container.x = Phaser.Math.Linear(this.container.x, this.targetX, LERP_SPEED);
    this.container.y = Phaser.Math.Linear(this.container.y, this.targetY, LERP_SPEED);
  }

  destroy(): void {
    this.container.destroy();
  }
}
