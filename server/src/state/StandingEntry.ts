import { Schema, type } from "@colyseus/schema";

/** Una fila del ranking final (sincronizado al terminar la partida). */
export class StandingEntry extends Schema {
  @type("uint8") place: number = 0;
  @type("string") name: string = "";
  @type("uint16") score: number = 0;
  @type("string") sessionId: string = "";
}
