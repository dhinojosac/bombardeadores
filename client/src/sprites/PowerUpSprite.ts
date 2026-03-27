import Phaser from "phaser";
import { TILE_SIZE } from "bomberman-shared";

export class PowerUpSprite {
  private sprite: Phaser.GameObjects.Sprite;
  private tween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, tileX: number, tileY: number, textureKey: string) {
    const px = tileX * TILE_SIZE + TILE_SIZE / 2;
    const py = tileY * TILE_SIZE + TILE_SIZE / 2;

    this.sprite = scene.add.sprite(px, py, textureKey);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setDisplaySize(TILE_SIZE * 0.6, TILE_SIZE * 0.6);
    this.sprite.setDepth(4);

    this.tween = scene.tweens.add({
      targets: [this.sprite],
      alpha: { from: 1, to: 0.75 },
      scaleX: { from: 1, to: 1.15 },
      scaleY: { from: 1, to: 1.15 },
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  destroy(): void {
    this.tween.destroy();
    this.sprite.destroy();
  }
}
