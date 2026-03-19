import Phaser from "phaser";

const TILE_SIZE = 48;

export class ExplosionSprite {
  private rects: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene, cellsStr: string) {
    const cells = this.parseCells(cellsStr);

    for (const cell of cells) {
      const px = cell.x * TILE_SIZE + TILE_SIZE / 2;
      const py = cell.y * TILE_SIZE + TILE_SIZE / 2;

      const rect = scene.add.rectangle(px, py, TILE_SIZE - 4, TILE_SIZE - 4, 0xff4500);
      rect.setAlpha(0.8);
      rect.setDepth(8);

      scene.tweens.add({
        targets: rect,
        alpha: { from: 0.9, to: 0.3 },
        scaleX: { from: 1, to: 0.6 },
        scaleY: { from: 1, to: 0.6 },
        duration: 400,
        ease: "Power2",
      });

      this.rects.push(rect);
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
    for (const r of this.rects) {
      r.destroy();
    }
    this.rects = [];
  }
}
