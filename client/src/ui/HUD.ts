import Phaser from "phaser";
import { TILE_SIZE, MAP_WIDTH } from "bomberman-shared";
import type { VolumeLevel } from "../audio/AudioManager";

const SCORE_START_Y = 78;
const ROW_H = 24;

function formatCountdown(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const PANEL_COLOR_NORMAL = 0x16213e;
const PANEL_COLOR_FRENZY = 0x4a0000;

const VOLUME_CYCLE: VolumeLevel[] = ["normal", "medio", "bajo", "mute"];

const VOLUME_LABELS: Record<VolumeLevel, string> = {
  normal: "♪  VOL: NORMAL",
  medio:  "♪  VOL: MEDIO",
  bajo:   "♪  VOL: BAJO",
  mute:   "✕  VOL: MUTE",
};

const VOLUME_COLORS: Record<VolumeLevel, string> = {
  normal: "#66dd88",
  medio:  "#aade88",
  bajo:   "#cccccc",
  mute:   "#888888",
};

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private scoreTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private bg: Phaser.GameObjects.Rectangle;
  private timerText: Phaser.GameObjects.Text;
  private goalText: Phaser.GameObjects.Text;
  private gameOverText: Phaser.GameObjects.Text;
  private frenzyText: Phaser.GameObjects.Text;
  private frenzyTween: Phaser.Tweens.Tween | null = null;
  private volBtn: Phaser.GameObjects.Text;
  private currentVolLevel: VolumeLevel = "normal";

  constructor(scene: Phaser.Scene, onVolumeChange?: (level: VolumeLevel) => void) {
    this.scene = scene;

    const panelX = MAP_WIDTH * TILE_SIZE + 10;

    this.bg = scene.add.rectangle(panelX, 0, 200, scene.scale.height, PANEL_COLOR_NORMAL);
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

    this.goalText = scene.add.text(panelX + 10, 52, "Vidas: 5 ♥", {
      fontSize: "12px",
      color: "#ff9999",
      fontFamily: "monospace",
    });
    this.goalText.setDepth(101);

    const scoreTitle = scene.add.text(panelX + 10, 68, "VIDAS", {
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

    this.frenzyText = scene.add.text(panelX + 100, scene.scale.height / 2, "¡FRENESÍ!", {
      fontSize: "18px",
      color: "#ff4444",
      fontFamily: "monospace",
      fontStyle: "bold",
    });
    this.frenzyText.setOrigin(0.5, 0.5);
    this.frenzyText.setDepth(103);
    this.frenzyText.setVisible(false);

    this.volBtn = scene.add.text(panelX + 10, scene.scale.height - 36, VOLUME_LABELS["normal"], {
      fontSize: "12px",
      color: VOLUME_COLORS["normal"],
      fontFamily: "monospace",
      backgroundColor: "#0d1b2a",
      padding: { x: 6, y: 4 },
    });
    this.volBtn.setDepth(103);
    this.volBtn.setInteractive({ useHandCursor: true });
    this.volBtn.on("pointerover", () => this.volBtn.setAlpha(0.8));
    this.volBtn.on("pointerout",  () => this.volBtn.setAlpha(1));
    this.volBtn.on("pointerdown", () => {
      const nextIdx = (VOLUME_CYCLE.indexOf(this.currentVolLevel) + 1) % VOLUME_CYCLE.length;
      this.currentVolLevel = VOLUME_CYCLE[nextIdx];
      this.updateVolBtn(this.currentVolLevel);
      onVolumeChange?.(this.currentVolLevel);
    });

    this.container = scene.add.container(0, 0, [
      this.bg,
      title,
      this.timerText,
      this.goalText,
      scoreTitle,
      this.gameOverText,
      this.frenzyText,
      this.volBtn,
    ]);
    this.container.setDepth(100);
  }

  setTimerMs(ms: number): void {
    this.timerText.setText(`Tiempo: ${formatCountdown(ms)}`);
  }

  setScoreTarget(n: number): void {
    this.goalText.setText(`Vidas: ${n} ${"\u2665".repeat(Math.min(n, 10))}`);
  }

  setMatchEnd(_phase: string, _winnerName: string, _endReason: string): void {
    this.gameOverText.setVisible(false);
  }

  setFrenzy(active: boolean): void {
    if (active) {
      this.bg.setFillStyle(PANEL_COLOR_FRENZY);
      this.frenzyText.setVisible(true);
      if (this.frenzyTween) this.frenzyTween.destroy();
      this.frenzyTween = this.scene.tweens.add({
        targets: this.frenzyText,
        alpha: { from: 1, to: 0.2 },
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else {
      this.bg.setFillStyle(PANEL_COLOR_NORMAL);
      this.frenzyText.setVisible(false);
      if (this.frenzyTween) {
        this.frenzyTween.destroy();
        this.frenzyTween = null;
      }
      this.frenzyText.setAlpha(1);
    }
  }

  updateVolBtn(level: VolumeLevel): void {
    this.currentVolLevel = level;
    this.volBtn.setText(VOLUME_LABELS[level]);
    this.volBtn.setColor(VOLUME_COLORS[level]);
  }

  /** Backward-compat wrapper for any code still using the old mute boolean. */
  updateMuteBtn(muted: boolean): void {
    this.updateVolBtn(muted ? "mute" : "normal");
  }

  addPlayer(sessionId: string, name: string): void {
    const panelX = MAP_WIDTH * TILE_SIZE + 10;
    const yOffset = SCORE_START_Y + this.scoreTexts.size * ROW_H;
    const text = this.scene.add.text(panelX + 10, yOffset, `${name}: ♥♥♥♥♥`, {
      fontSize: "13px",
      color: "#ff6666",
      fontFamily: "monospace",
    });
    text.setDepth(101);
    this.container.add(text);
    this.scoreTexts.set(sessionId, text);
  }

  updateScore(sessionId: string, name: string, score: number, alive: boolean, scoreTarget?: number, lives?: number, maxLives?: number): void {
    const text = this.scoreTexts.get(sessionId);
    if (text) {
      const livesCount = lives ?? 0;
      const maxL = maxLives ?? livesCount;
      const hearts = "♥".repeat(livesCount) + "♡".repeat(Math.max(0, maxL - livesCount));
      const status = alive ? "" : (livesCount === 0 ? " [KO]" : " ...");
      text.setText(`${name}: ${hearts}${status}`);
      text.setColor(livesCount === 0 ? "#555555" : alive ? "#ff6666" : "#ff9999");
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
