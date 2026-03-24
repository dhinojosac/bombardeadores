import Phaser from "phaser";

const TILE_SIZE = 48;

export class BombSprite {
  private sprite: Phaser.GameObjects.Sprite;
  private tween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, tileX: number, tileY: number) {
    const px = tileX * TILE_SIZE + TILE_SIZE / 2;
    const py = tileY * TILE_SIZE + TILE_SIZE / 2;

    this.sprite = scene.add.sprite(px, py, "bomb");
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setDisplaySize(TILE_SIZE * 0.85, TILE_SIZE * 0.85);
    this.sprite.setDepth(5);

    this.tween = scene.tweens.add({
      targets: [this.sprite],
      scaleX: { from: 1, to: 1.12 },
      scaleY: { from: 1, to: 1.12 },
      duration: 300,
      yoyo: true,
      repeat: -1,
    });
  }

  destroy(): void {
    this.tween.destroy();
    this.sprite.destroy();
  }
}
