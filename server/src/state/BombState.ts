import { Schema, type } from "@colyseus/schema";

export class BombState extends Schema {
  @type("uint8") tileX: number = 0;
  @type("uint8") tileY: number = 0;
  @type("string") ownerId: string = "";
  @type("uint8") radius: number = 2;

  // Server-only
  fuseTimer: number = 2000;
}
