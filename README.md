# Bomberman Multiplayer

Juego 2D multijugador estilo Bomberman construido con **Phaser 3** (cliente) y **Colyseus** (servidor), usando TypeScript en ambos lados.

- Partida única siempre activa — todos los jugadores conectados entran automáticamente
- Servidor completamente autoritativo — los clientes solo envían inputs y renderizan
- Sincronización de estado en tiempo real vía WebSocket (20 Hz)
- Soporte para jugar online a través de tunnel público (Cloudflare Tunnel recomendado)

**Para levantar todo lo necesario y jugar por internet con un solo comando** (tras `npm install`):

```bash
npm run tunnel:all
```

Antes de arrancar, **`npm run free-port`** (incluido en `tunnel:all`, `tunnel:serve` y `dev:server`) intenta liberar el puerto **2567** matando el proceso que lo use, para evitar `EADDRINUSE`. Puedes ejecutarlo solo: `npm run free-port`. Puerto distinto: `GAME_PORT=3000 node scripts/free-port.cjs` (debe coincidir con `PORT` del servidor si lo cambias).

Compila el cliente, arranca el servidor en el puerto **2567** (juego + WebSocket) y abre **Cloudflare Tunnel**; la URL pública sale en consola. Necesitas **cloudflared** (`cloudflared.exe` en la raíz del repo o en el `PATH`). Equivalente: `npm run start:online`.

---

## Requisitos

- Node.js 18+
- npm 9+

---

## Modo desarrollo (local)

```bash
# 1. Instalar dependencias
npm install

# 2. Terminal A — servidor Colyseus en ws://localhost:2567
npm run dev:server

# 3. Terminal B — cliente Vite en http://localhost:3000
npm run dev:client
```

Abrir múltiples pestañas en `http://localhost:3000` para probar el multijugador.

El cliente detecta automáticamente el entorno: si corre en `localhost:3000` (Vite), conecta al servidor en `ws://localhost:2567`.

**Nombre en pantalla:** puedes fijarlo con `?name=TuNombre` en la URL (se guarda en `localStorage` bajo `bomberman_display_name`). Si no hay nombre en la URL ni valor guardado, al entrar al juego aparece un `prompt` opcional; si lo cancelas o lo dejas vacío, se usa un nombre aleatorio `Player_XXXX`. El servidor trunca y limpia el nombre (máx. 24 caracteres, sin caracteres de control).

---

## Modo producción / tunnel (jugar con amigos online)

El servidor sirve el cliente compilado y el WebSocket desde un **único puerto (2567)**, lo que permite exponerlo con una sola URL pública.

### Todo en uno (recomendado)

Este es el flujo principal para **online**: un solo comando hace **build del cliente**, **servidor HTTP+WS en :2567** y **tunnel Cloudflare** (espera a que el servidor responda antes de abrir el tunnel).

Necesitas **cloudflared**: `cloudflared.exe` en la raíz del proyecto (Windows) o el binario en el `PATH`.

```bash
npm run tunnel:all
# mismo efecto:
npm run start:online
```

En Windows también puedes usar:

```powershell
.\scripts\tunnel.ps1
```

`Ctrl+C` detiene servidor y tunnel a la vez.

### Opcion manual: Cloudflare Tunnel (sin contraseña)

```bash
# 1. Compilar el cliente
npm run build:client

# 2. Terminal A — servidor completo en http://localhost:2567
npm run tunnel:serve

# 3. Terminal B — abrir tunnel Cloudflare
npm run tunnel:cf
```

Genera una URL del tipo `https://xxxx.trycloudflare.com` y se puede compartir directamente.

### Opcion alternativa: localtunnel

```bash
# Con el servidor ya corriendo
npm run tunnel:open
```

Genera una URL `https://xyz.loca.lt`, pero puede ser menos estable y pedir contraseña.
La contraseña se obtiene en `https://loca.lt/mytunnelpassword`.

---

## Controles

| Tecla | Acción |
|---|---|
| `W` / `↑` | Mover arriba |
| `S` / `↓` | Mover abajo |
| `A` / `←` | Mover izquierda |
| `D` / `→` | Mover derecha |
| `Espacio` | Colocar bomba |

---

## Mecánicas del juego

- **Mapa fijo** de 15 × 13 tiles con paredes sólidas, pilares indestructibles y bloques rompibles
- **Movimiento continuo** con colisiones AABB contra la grilla; el **hitbox del jugador** es un cuadrado de 30×30 px (alineado con el círculo visible) para reducir el roce en esquinas frente a bloques
- **Bombas** con 2 segundos de mecha; se colocan en la posición del jugador y explotan en cruz (radio 2). En el **servidor**, un tile con bomba **bloquea el paso** salvo mientras el **centro del jugador** sigue en ese mismo tile (puedes colocar y salir sin quedar encerrado)
- **Explosiones** que se propagan en 4 direcciones, destruyen bloques rompibles, matan jugadores y detonan en cadena otras bombas
- **Respawn** automático a los 2 segundos en un punto de spawn libre, con 1.5 segundos de invulnerabilidad
- **Puntaje** acumulativo: +1 punto por eliminar a otro jugador

### Valores por defecto

| Parámetro | Valor |
|---|---|
| Tick rate del servidor | 20 Hz |
| Tiempo de mecha de bomba | 2 000 ms |
| Duración de explosión | 400 ms |
| Radio de explosión | 2 tiles |
| Tiempo de respawn | 2 000 ms |
| Invulnerabilidad tras respawn | 1 500 ms |
| Velocidad del jugador | 150 px/s |
| Hitbox del jugador (AABB) | 30 × 30 px |

---

## Sprites opcionales (PNG)

Puedes sustituir los gráficos generados por código colocando PNG en `client/public/assets/`. La lista de archivos y claves está en `client/src/assets/optionalAssets.ts`; los nombres usan **guiones bajos** (por ejemplo `tile_empty.png`, `tile_solid.png`). Detalle en [`client/public/assets/README.md`](client/public/assets/README.md).

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm install` | Instala dependencias de todos los workspaces |
| `npm run free-port` | Libera el puerto 2567 (o `GAME_PORT`) antes de arrancar |
| `npm run dev:server` | Libera 2567 e inicia servidor en modo watch (desarrollo) |
| `npm run dev:client` | Inicia cliente con Vite (desarrollo) |
| `npm run build:client` | Compila el cliente para producción |
| `npm run tunnel:serve` | Inicia servidor sirviendo el cliente compilado |
| `npm run tunnel:all` / `npm run start:online` | **Todo para jugar online:** build + servidor :2567 + Cloudflare Tunnel |
| `npm run tunnel:cf` | Abre Cloudflare Tunnel (recomendado) |
| `npm run tunnel:open` | Abre el tunnel público con localtunnel |

---

## Arquitectura

```
multiplayer-game/
├── package.json              — Workspace root (npm workspaces)
├── scripts/
│   ├── tunnel-cf.cjs         — Lanza cloudflared (exe local o PATH)
│   └── tunnel.ps1            — Atajo Windows: npm install + tunnel:all
├── server/                   — Colyseus game server (TypeScript)
│   └── src/
│       ├── app.config.ts     — Entry point: HTTP + WebSocket en un solo puerto
│       ├── rooms/
│       │   └── BombermanRoom.ts  — Ciclo de vida de la sala, mensajes, loop de simulación
│       ├── state/
│       │   ├── GameState.ts      — Estado raíz (jugadores, bombas, explosiones, mapa)
│       │   ├── PlayerState.ts    — Posición, vida, bombas, puntaje, dirección
│       │   ├── BombState.ts      — Posición en tile, dueño, radio
│       │   └── ExplosionState.ts — Celdas afectadas, dueño, TTL
│       └── game/
│           ├── constants.ts      — Todos los parámetros del juego
│           ├── GameMap.ts        — Generación del mapa 15×13, spawn points, colisiones
│           └── GameEngine.ts     — Movimiento (incl. colisión con bombas), explosiones, respawn
└── client/                   — Phaser 3 + Vite (TypeScript)
    ├── index.html
    └── src/
        ├── main.ts               — Boot de Phaser
        ├── network/
        │   └── NetworkManager.ts — Cliente Colyseus, auto-detección de URL, callbacks
        ├── assets/
        │   ├── optionalAssets.ts — URLs de PNG opcionales bajo public/assets/
        │   ├── registerTextures.ts
        │   └── validateTextures.ts
        ├── scenes/
        │   └── GameScene.ts      — Mapa, input, nombre (?name= / storage / prompt), conexión
        ├── sprites/
        │   ├── PlayerSprite.ts   — Cuerpo + nombre, lerp de posición
        │   ├── BombSprite.ts     — Círculo animado (pulso)
        │   └── ExplosionSprite.ts — Rectángulos naranjas con fade-out
        └── ui/
            └── HUD.ts            — Scoreboard lateral con puntaje en tiempo real
```

### Flujo de datos

```
Cliente                    Servidor
  │                           │
  │──── send("input") ───────►│
  │──── send("bomb")  ───────►│
  │                           │
  │              cada 50ms    │
  │           ┌───────────────┤
  │           │  GameEngine   │
  │           │  .update()    │
  │           └───────────────┤
  │                           │
  │◄─── delta de estado ──────│  (binario, solo campos cambiados)
  │                           │
  interpolación + render
```

- El **servidor** es la única fuente de verdad. Valida todas las acciones.
- El **cliente** interpola posiciones entre actualizaciones para suavidad visual (lerp por frame).
- La lógica de juego (`GameEngine`) está desacoplada del networking, facilitando agregar múltiples salas en el futuro.
