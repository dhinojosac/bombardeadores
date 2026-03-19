import { Schema, type } from "@colyseus/schema";

export class ExplosionState extends Schema {
  @type("uint8") tileX: number = 0;
  @type("uint8") tileY: number = 0;
  @type("uint8") radius: number = 2;
  @type("string") cells: string = "";

  // Server-only
  ttl: number = 400;
  ownerId: string = "";
}
