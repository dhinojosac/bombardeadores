import express from "express";
import { createServer } from "http";
import path from "path";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { BombermanRoom } from "./rooms/BombermanRoom";

const PORT = Number(process.env.PORT) || 2567;

const app = express();

const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));

app.get("/", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("bomberman", BombermanRoom);

httpServer.listen(PORT, () => {
  console.log(`Bomberman server listening on http://localhost:${PORT}`);
});
