import { Schema, type } from "@colyseus/schema";

export class PowerUpState extends Schema {
  @type("uint8") tileX: number = 0;
  @type("uint8") tileY: number = 0;
  @type("uint8") powerUpType: number = 0;
}
