import Phaser from "phaser";
import { GameScene } from "./scenes/GameScene";

const TILE_SIZE = 48;
const MAP_WIDTH = 15;
const MAP_HEIGHT = 13;
const HUD_WIDTH = 200;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: MAP_WIDTH * TILE_SIZE + HUD_WIDTH,
  height: MAP_HEIGHT * TILE_SIZE,
  backgroundColor: "#1a1a2e",
  parent: document.body,
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
