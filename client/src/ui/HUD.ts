import Phaser from "phaser";

const TILE_SIZE = 48;
const MAP_WIDTH = 15;

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private scoreTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private bg: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const panelX = MAP_WIDTH * TILE_SIZE + 10;

    this.bg = scene.add.rectangle(panelX, 0, 200, scene.scale.height, 0x16213e);
    this.bg.setOrigin(0, 0);
    this.bg.setDepth(100);

    const title = scene.add.text(panelX + 10, 10, "SCOREBOARD", {
      fontSize: "16px",
      color: "#e0e0e0",
      fontFamily: "monospace",
      fontStyle: "bold",
    });
    title.setDepth(101);

    this.container = scene.add.container(0, 0, [this.bg, title]);
    this.container.setDepth(100);
  }

  addPlayer(sessionId: string, name: string): void {
    const panelX = MAP_WIDTH * TILE_SIZE + 10;
    const yOffset = 40 + this.scoreTexts.size * 24;
    const text = this.scene.add.text(panelX + 10, yOffset, `${name}: 0`, {
      fontSize: "13px",
      color: "#ffffff",
      fontFamily: "monospace",
    });
    text.setDepth(101);
    this.container.add(text);
    this.scoreTexts.set(sessionId, text);
  }

  updateScore(sessionId: string, name: string, score: number, alive: boolean): void {
    const text = this.scoreTexts.get(sessionId);
    if (text) {
      const status = alive ? "" : " [DEAD]";
      text.setText(`${name}: ${score}${status}`);
      text.setColor(alive ? "#ffffff" : "#888888");
    }
  }

  removePlayer(sessionId: string): void {
    const text = this.scoreTexts.get(sessionId);
    if (text) {
      text.destroy();
      this.scoreTexts.delete(sessionId);
      this.relayout();
    }
  }

  private relayout(): void {
    const panelX = MAP_WIDTH * TILE_SIZE + 10;
    let idx = 0;
    this.scoreTexts.forEach((text) => {
      text.setPosition(panelX + 10, 40 + idx * 24);
      idx++;
    });
  }
}
