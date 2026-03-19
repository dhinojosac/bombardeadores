import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { PlayerState } from "./PlayerState";
import { BombState } from "./BombState";
import { ExplosionState } from "./ExplosionState";

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: BombState }) bombs = new MapSchema<BombState>();
  @type({ map: ExplosionState }) explosions = new MapSchema<ExplosionState>();
  @type(["uint8"]) tiles = new ArraySchema<number>();
  @type("uint8") mapWidth: number = 15;
  @type("uint8") mapHeight: number = 13;
}
