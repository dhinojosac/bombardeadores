import Phaser from "phaser";

const TILE_SIZE = 48;

export class ExplosionSprite {
  private sprites: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene, cellsStr: string) {
    const cells = this.parseCells(cellsStr);

    for (const cell of cells) {
      const px = cell.x * TILE_SIZE + TILE_SIZE / 2;
      const py = cell.y * TILE_SIZE + TILE_SIZE / 2;

      const sprite = scene.add.sprite(px, py, "explosion_cell");
      sprite.setOrigin(0.5, 0.5);
      sprite.setDisplaySize(TILE_SIZE - 4, TILE_SIZE - 4);
      sprite.setDepth(8);
      sprite.setAlpha(0.95);

      scene.tweens.add({
        targets: sprite,
        alpha: { from: 0.95, to: 0.25 },
        scaleX: { from: 1, to: 0.65 },
        scaleY: { from: 1, to: 0.65 },
        duration: 400,
        ease: "Power2",
      });

      this.sprites.push(sprite);
    }
  }

  private parseCells(cellsStr: string): { x: number; y: number }[] {
    if (!cellsStr) return [];
    return cellsStr.split(";").map((s) => {
      const [x, y] = s.split(",").map(Number);
      return { x, y };
    });
  }

  destroy(): void {
    for (const s of this.sprites) {
      s.destroy();
    }
    this.sprites = [];
  }
}
