import Phaser from "phaser";

const TILE_SIZE = 48;
const BOMB_RADIUS = 16;

export class BombSprite {
  private circle: Phaser.GameObjects.Arc;
  private fuse: Phaser.GameObjects.Arc;
  private tween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, tileX: number, tileY: number) {
    const px = tileX * TILE_SIZE + TILE_SIZE / 2;
    const py = tileY * TILE_SIZE + TILE_SIZE / 2;

    this.circle = scene.add.circle(px, py, BOMB_RADIUS, 0x2c3e50);
    this.circle.setStrokeStyle(2, 0x000000);
    this.circle.setDepth(5);

    this.fuse = scene.add.circle(px, py - BOMB_RADIUS + 4, 3, 0xff6600);
    this.fuse.setDepth(6);

    this.tween = scene.tweens.add({
      targets: [this.circle],
      scaleX: { from: 1, to: 1.15 },
      scaleY: { from: 1, to: 1.15 },
      duration: 300,
      yoyo: true,
      repeat: -1,
    });
  }

  destroy(): void {
    this.tween.destroy();
    this.circle.destroy();
    this.fuse.destroy();
  }
}
