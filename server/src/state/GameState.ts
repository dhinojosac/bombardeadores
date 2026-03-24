import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { PlayerState } from "./PlayerState";
import { BombState } from "./BombState";
import { ExplosionState } from "./ExplosionState";
import { StandingEntry } from "./StandingEntry";

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: BombState }) bombs = new MapSchema<BombState>();
  @type({ map: ExplosionState }) explosions = new MapSchema<ExplosionState>();
  @type(["uint8"]) tiles = new ArraySchema<number>();
  @type("uint8") mapWidth: number = 15;
  @type("uint8") mapHeight: number = 13;

  @type("string") matchPhase: string = "playing";
  @type("int32") timeRemainingMs: number = 0;
  @type("uint8") scoreTarget: number = 5;
  @type("string") winnerSessionId: string = "";
  @type("string") winnerName: string = "";
  @type("string") endReason: string = "";

  @type([StandingEntry]) finalStandings = new ArraySchema<StandingEntry>();
}
