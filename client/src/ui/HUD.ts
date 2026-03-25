import Phaser from "phaser";
import { TILE_SIZE, MAP_WIDTH } from "bomberman-shared";
const SCORE_START_Y = 78;
const ROW_H = 24;

function formatCountdown(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private scoreTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private bg: Phaser.GameObjects.Rectangle;
  private timerText: Phaser.GameObjects.Text;
  private goalText: Phaser.GameObjects.Text;
  private gameOverText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const panelX = MAP_WIDTH * TILE_SIZE + 10;

    this.bg = scene.add.rectangle(panelX, 0, 200, scene.scale.height, 0x16213e);
    this.bg.setOrigin(0, 0);
    this.bg.setDepth(100);

    const title = scene.add.text(panelX + 10, 10, "PARTIDA", {
      fontSize: "16px",
      color: "#e0e0e0",
      fontFamily: "monospace",
      fontStyle: "bold",
    });
    title.setDepth(101);

    this.timerText = scene.add.text(panelX + 10, 32, "Tiempo: —:—", {
      fontSize: "13px",
      color: "#a8d8ff",
      fontFamily: "monospace",
    });
    this.timerText.setDepth(101);

    this.goalText = scene.add.text(panelX + 10, 52, "Objetivo: — pts", {
      fontSize: "12px",
      color: "#cccccc",
      fontFamily: "monospace",
    });
    this.goalText.setDepth(101);

    const scoreTitle = scene.add.text(panelX + 10, 68, "MARCADOR", {
      fontSize: "11px",
      color: "#888888",
      fontFamily: "monospace",
    });
    scoreTitle.setDepth(101);

    this.gameOverText = scene.add.text(panelX + 10, scene.scale.height - 100, "", {
      fontSize: "12px",
      color: "#ffd54f",
      fontFamily: "monospace",
      wordWrap: { width: 180 },
      lineSpacing: 4,
    });
    this.gameOverText.setDepth(102);
    this.gameOverText.setVisible(false);

    this.container = scene.add.container(0, 0, [
      this.bg,
      title,
      this.timerText,
      this.goalText,
      scoreTitle,
      this.gameOverText,
    ]);
    this.container.setDepth(100);
  }

  setTimerMs(ms: number): void {
    this.timerText.setText(`Tiempo: ${formatCountdown(ms)}`);
  }

  setScoreTarget(n: number): void {
    this.goalText.setText(`Objetivo: ${n} pts`);
  }

  setMatchEnd(_phase: string, _winnerName: string, _endReason: string): void {
    this.gameOverText.setVisible(false);
  }

  addPlayer(sessionId: string, name: string): void {
    const panelX = MAP_WIDTH * TILE_SIZE + 10;
    const yOffset = SCORE_START_Y + this.scoreTexts.size * ROW_H;
    const text = this.scene.add.text(panelX + 10, yOffset, `${name}: 0`, {
      fontSize: "13px",
      color: "#ffffff",
      fontFamily: "monospace",
    });
    text.setDepth(101);
    this.container.add(text);
    this.scoreTexts.set(sessionId, text);
  }

  updateScore(sessionId: string, name: string, score: number, alive: boolean, scoreTarget?: number): void {
    const text = this.scoreTexts.get(sessionId);
    if (text) {
      const status = alive ? "" : " [DEAD]";
      const meta =
        scoreTarget !== undefined ? ` (${score}/${scoreTarget})` : "";
      text.setText(`${name}: ${score}${meta}${status}`);
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
      text.setPosition(panelX + 10, SCORE_START_Y + idx * ROW_H);
      idx++;
    });
  }
}
