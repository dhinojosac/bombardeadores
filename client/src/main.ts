import Phaser from "phaser";
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from "bomberman-shared";
import { GameScene } from "./scenes/GameScene";

const HUD_WIDTH = 200;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: MAP_WIDTH * TILE_SIZE + HUD_WIDTH,
  height: MAP_HEIGHT * TILE_SIZE,
  backgroundColor: "#1a1a2e",
  parent: document.getElementById("game-mount") ?? document.body,
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
