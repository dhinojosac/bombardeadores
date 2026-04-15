import { Schema, type } from "@colyseus/schema";
import type { PlayerInput } from "bomberman-shared";

export type { PlayerInput };

export class PlayerState extends Schema {
  @type("string") name: string = "";
  @type("float32") x: number = 0;
  @type("float32") y: number = 0;
  @type("boolean") alive: boolean = true;
  @type("uint8") direction: number = 0; // 0=down, 1=up, 2=left, 3=right
  @type("uint8") bombsAvailable: number = 1;
  @type("uint8") maxBombs: number = 1;
  @type("uint8") explosionRadius: number = 2;
  @type("uint16") score: number = 0;
  @type("boolean") invulnerable: boolean = false;
  @type("uint8") speed: number = 150;
  @type("uint8") lives: number = 5;

  // Server-only (not synced)
  respawnTimer: number = 0;
  invulnerabilityTimer: number = 0;
  currentInput: PlayerInput = { left: false, right: false, up: false, down: false };
  sessionId: string = "";
}
