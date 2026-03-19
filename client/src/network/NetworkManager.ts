import { Client, Room, getStateCallbacks } from "colyseus.js";

export interface PlayerInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export type StateCallbackProxy = ReturnType<typeof getStateCallbacks>;

function resolveServerUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get("server");
  if (explicit) return explicit;

  const loc = window.location;

  // Dev mode: Vite runs on 3000, Colyseus on 2567
  if (loc.hostname === "localhost" && loc.port === "3000") {
    return "ws://localhost:2567";
  }

  // Production / tunnel: client served from the same origin as the WS server
  const protocol = loc.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${loc.host}`;
}

export class NetworkManager {
  private client: Client;
  room: Room | null = null;
  private $!: StateCallbackProxy;

  constructor(serverUrl?: string) {
    const url = serverUrl ?? resolveServerUrl();
    console.log("Connecting to:", url);
    this.client = new Client(url);
  }

  async connect(name: string): Promise<Room> {
    this.room = await this.client.joinOrCreate("bomberman", { name });
    this.$ = getStateCallbacks(this.room);
    return this.room;
  }

  getCallbackProxy(): StateCallbackProxy {
    return this.$;
  }

  sendInput(input: PlayerInput): void {
    this.room?.send("input", input);
  }

  sendBomb(): void {
    this.room?.send("bomb");
  }

  disconnect(): void {
    this.room?.leave();
    this.room = null;
  }
}
