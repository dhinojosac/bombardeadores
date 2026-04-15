import Phaser from "phaser";
import { PLAYER_BODY_DISPLAY_SIZE, PLAYER_TEXTURE_BY_DIRECTION } from "../assets/registerTextures";
import { PLAYER_COLORS } from "bomberman-shared";

/** Solo render: la colisión real la calcula el servidor (`PLAYER_HITBOX_SIZE`, p. ej. 30 px). */
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
  private tauntBubble: Phaser.GameObjects.Text | null = null;
  private tauntTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    name: string,
    isLocal: boolean,
    initialDirection: number = 0,
    initialColorIndex: number = 0
  ) {
    this.isLocal = isLocal;
    this.targetX = x;
    this.targetY = y;
    this.color = PLAYER_COLORS[initialColorIndex % PLAYER_COLORS.length] ?? 0xffffff;
    this.direction = initialDirection & 3;

    this.body = scene.add.sprite(0, 0, textureForDirection(this.direction));
    this.body.setDisplaySize(PLAYER_BODY_DISPLAY_SIZE, PLAYER_BODY_DISPLAY_SIZE);
    this.body.setTint(this.color);

    this.nameText = scene.add.text(0, -PLAYER_BODY_DISPLAY_SIZE / 2 - 10, name, {
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

  setColorIndex(index: number): void {
    this.color = PLAYER_COLORS[index % PLAYER_COLORS.length] ?? 0xffffff;
    if (!this.invulnerable) {
      this.body.setTint(this.color);
    }
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
    this.body.setDisplaySize(PLAYER_BODY_DISPLAY_SIZE, PLAYER_BODY_DISPLAY_SIZE);
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

  showTaunt(scene: Phaser.Scene, text: string): void {
    // Remove any active taunt bubble before showing the new one
    this.tauntBubble?.destroy();
    this.tauntTimer?.destroy();
    this.tauntBubble = null;
    this.tauntTimer = null;

    const bubble = scene.add.text(0, -PLAYER_BODY_DISPLAY_SIZE / 2 - 32, text, {
      fontSize: "13px",
      color: "#222222",
      backgroundColor: "#ffffffee",
      padding: { x: 6, y: 3 },
      fontFamily: "monospace",
    });
    bubble.setOrigin(0.5, 1);
    bubble.setDepth(20);
    this.container.add(bubble);
    this.tauntBubble = bubble;

    // Fade out and destroy after 2.5s (2000ms visible + 500ms fade)
    this.tauntTimer = scene.time.addEvent({
      delay: 2000,
      callback: () => {
        scene.tweens.add({
          targets: bubble,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            bubble.destroy();
            this.tauntBubble = null;
          },
        });
      },
    });
  }

  update(): void {
    this.container.x = Phaser.Math.Linear(this.container.x, this.targetX, LERP_SPEED);
    this.container.y = Phaser.Math.Linear(this.container.y, this.targetY, LERP_SPEED);
  }

  destroy(): void {
    this.tauntBubble?.destroy();
    this.tauntTimer?.destroy();
    this.container.destroy();
  }
}
