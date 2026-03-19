import Phaser from "phaser";

const PLAYER_COLORS = [0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xecf0f1];
let colorIndex = 0;

const TILE_SIZE = 48;
const HITBOX_SIZE = 40;
const LERP_SPEED = 0.25;

export class PlayerSprite {
  container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private targetX: number;
  private targetY: number;
  private color: number;
  private scene: Phaser.Scene;
  isLocal: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, name: string, isLocal: boolean) {
    this.scene = scene;
    this.isLocal = isLocal;
    this.targetX = x;
    this.targetY = y;
    this.color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    colorIndex++;

    this.body = scene.add.rectangle(0, 0, HITBOX_SIZE, HITBOX_SIZE, this.color);
    this.body.setStrokeStyle(2, 0xffffff);

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

  setAlive(alive: boolean): void {
    this.container.setAlpha(alive ? 1 : 0.2);
  }

  setInvulnerable(invulnerable: boolean): void {
    if (invulnerable) {
      this.body.setAlpha(0.6);
      this.body.setStrokeStyle(2, 0xffff00);
    } else {
      this.body.setAlpha(1);
      this.body.setStrokeStyle(2, 0xffffff);
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
