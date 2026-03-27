# Bomberman Multiplayer

Juego 2D multijugador estilo Bomberman construido con **Phaser 3** (cliente) y **Colyseus** (servidor), usando TypeScript en ambos lados.

- Partida única siempre activa — todos los jugadores conectados entran automáticamente
- Servidor completamente autoritativo — los clientes solo envían inputs y renderizan
- Sincronización de estado en tiempo real vía WebSocket (20 Hz)
- **Reinicio automático de partida** con cuenta atrás de 10 s tras cada fin de partida
- **Power-ups** que aparecen al destruir bloques: bomba extra, radio extra y velocidad
- **Fin de partida** con objetivo de puntos, cuenta atrás configurable y **overlay de resultados** (ranking `finalStandings` desde el servidor)
- **Burlas (taunts):** con `E` eliges en local entre tres mensajes (globo solo visible para ti); al dejar de pulsar 500 ms se envía a los demás
- **Música:** volumen en el panel lateral en cuatro niveles (normal, medio, bajo, mute); los archivos opcionales van en `public/assets/audio/`
- **Guía de controles** al confirmar el nombre (overlay HTML; se cierra con un clic o cualquier tecla)
- Soporte para jugar online a través de tunnel público (Cloudflare Tunnel recomendado)

Tras cambiar el **schema** del estado en el servidor (`GameState`, etc.), reinicia el proceso del servidor y recarga el cliente para evitar desajustes binarios con Colyseus.

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

**Nombre en pantalla:** al cargar el juego aparece un **formulario dentro de la misma ventana** (sobre el área del juego). El campo se rellena por defecto con `?name=TuNombre` en la URL o con `localStorage` (`bomberman_display_name`) si existen; puedes dejarlo vacío y pulsar **Jugar** para usar un nombre aleatorio `Player_XXXX`. El servidor trunca y limpia el nombre (máx. 24 caracteres, sin caracteres de control). Tras confirmar, aparece un **resumen de controles** (movimiento, bomba, burla, volumen); puedes cerrarlo con **¡Entendido!** o con cualquier tecla.

---

## Modo producción / tunnel (jugar con amigos online)

El servidor sirve el cliente compilado y el WebSocket desde un **único puerto (2567)**, lo que permite exponerlo con una sola URL pública.

### Todo en uno (recomendado)

Este es el flujo principal para **online**: un solo comando hace **build del cliente**, **servidor HTTP+WS en :2567** y **tunnel Cloudflare** (espera a que el servidor responda antes de abrir el tunnel).

**cloudflared:** en **Windows**, si no está en el `PATH` ni existe `cloudflared.exe` en la raíz del repo, el primer `npm run tunnel:cf` (o `start:online`) **lo descarga solo** desde GitHub y lo guarda como `cloudflared.exe` (ignorado por git). En macOS/Linux hace falta tener `cloudflared` en el PATH; si falta, verás instrucciones en consola. Puedes comprobar el entorno con `npm run ensure-cloudflared`.

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
| `E` | Burla: cicla entre tres mensajes en local; si no pulsas de nuevo en 500 ms, se envía a los demás |

**Audio:** en el panel lateral, el botón **VOL** cicla entre normal, medio, bajo y mute (afecta sobre todo a la música de fondo; el mute silencia también los efectos).

---

## Mecánicas del juego

- **Mapa fijo** de 15 × 13 tiles con paredes sólidas, pilares indestructibles y bloques rompibles
- **Movimiento continuo** con colisiones AABB en el servidor; el **hitbox** del jugador es **30×30 px** (menor que el tile) para reducir el roce en esquinas. En el **cliente**, el sprite del cuerpo se dibuja a **~40 px** (`PLAYER_BODY_DISPLAY_SIZE`): es solo visual y no tiene que coincidir con el AABB del servidor
- **Bombas** con 2 segundos de mecha; se colocan en la posición del jugador y explotan en cruz (radio 2). En el **servidor**, un tile con bomba **bloquea el paso** salvo mientras el **centro del jugador** sigue en ese mismo tile (puedes colocar y salir sin quedar encerrado)
- **Explosiones** que se propagan en 4 direcciones, destruyen bloques rompibles, matan jugadores y detonan en cadena otras bombas
- **Power-ups** que aparecen al destruir bloques rompibles (30% de probabilidad). Los power-ups en el suelo se destruyen si una explosión los alcanza. Al morir y hacer respawn, los stats del jugador se resetean a los valores iniciales
  - 🔴 **Bomba extra** — aumenta el máximo de bombas simultáneas (+1, hasta 5)
  - 🟠 **Radio extra** — aumenta el radio de explosión (+1, hasta 6 tiles)
  - 🟢 **Velocidad** — aumenta la velocidad de movimiento (+20 px/s, hasta 250 px/s)
- **Respawn** automático a los 2 segundos en un punto de spawn libre, con 1.5 segundos de invulnerabilidad
- **Puntaje** acumulativo: +1 punto por eliminar a otro jugador
- **Fin de partida:** gana quien llegue primero al **objetivo de puntos** (por defecto **5**). Si nadie lo alcanza, al terminar la **cuenta atrás** (por defecto **5 minutos**) gana quien tenga **más puntos**; si hay empate en el máximo, se muestra **Empate**. Al terminar, la simulación se **congela** (no hay movimiento ni nuevas bombas). El servidor envía **`finalStandings`** (puesto 1,1,3… por puntos, con `sessionId` por fila) y el cliente abre un **overlay de resultados** con el ranking completo; tu fila va resaltada
- **Reinicio automático:** 10 segundos después de terminar la partida, el servidor regenera el mapa, resetea los scores y stats de todos los jugadores y arranca una nueva partida automáticamente. El overlay muestra la cuenta regresiva en tiempo real

### Valores por defecto

| Parámetro | Valor |
|---|---|
| Tick rate del servidor | 20 Hz |
| Tiempo de mecha de bomba | 2 000 ms |
| Duración de explosión | 400 ms |
| Radio de explosión inicial | 2 tiles (máx. 6) |
| Tiempo de respawn | 2 000 ms |
| Invulnerabilidad tras respawn | 1 500 ms |
| Velocidad inicial del jugador | 150 px/s (máx. 250) |
| Hitbox del jugador (AABB, servidor) | 30 × 30 px |
| Tamaño visual del cuerpo (cliente) | 40 × 40 px aprox. |
| Bombas simultáneas iniciales | 1 (máx. 5) |
| Probabilidad de drop de power-up | 30% |
| Objetivo para ganar (puntos) | 5 (`MATCH_SCORE_TARGET`) |
| Tiempo máximo de partida | 5 min (`MATCH_DURATION_MS` = 300000) |
| Cuenta atrás para reinicio | 10 s (`RESTART_COUNTDOWN_MS`) |

Variables de entorno (servidor, opcionales): `MATCH_SCORE_TARGET` (entero positivo), `MATCH_DURATION_MS` (milisegundos, entero positivo).

---

## Sprites opcionales (PNG)

Puedes sustituir los gráficos generados por código colocando PNG en `client/public/assets/`. La lista de archivos y claves está en `client/src/assets/optionalAssets.ts`; las rutas se resuelven con `import.meta.env.BASE_URL` para que sigan funcionando si cambias el `base` de Vite. Los nombres de archivo usan **guiones bajos** (por ejemplo `tile_empty.png`). **Solo se sustituye lo que exista en disco:** si solo tienes los tres tiles, bomba, explosión y jugador seguirán siendo placeholders generados por código (ver consola si falta un PNG). Detalle en [`client/public/assets/README.md`](client/public/assets/README.md).

Claves de sprite de los nuevos power-ups: `powerup_bomb.png`, `powerup_radius.png`, `powerup_speed.png` (48×48 recomendado).

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
├── package.json              — Workspace root (npm workspaces: shared, server, client)
├── scripts/
│   ├── tunnel-cf.cjs         — Lanza cloudflared (exe local o PATH)
│   └── tunnel.ps1            — Atajo Windows: npm install + tunnel:all
├── shared/                   — Paquete compartido (constantes, tipos, enums)
│   └── src/
│       └── index.ts          — TILE_SIZE, MAP_WIDTH/HEIGHT, TileType, PowerUpType, PlayerInput
├── server/                   — Colyseus game server (TypeScript)
│   └── src/
│       ├── app.config.ts     — Entry point: HTTP + WebSocket en un solo puerto
│       ├── rooms/
│       │   └── BombermanRoom.ts  — Sala, reglas de fin de partida, reinicio automático, mensajes
│       ├── state/
│       │   ├── GameState.ts      — Estado raíz (jugadores, bombas, explosiones, power-ups, fase)
│       │   ├── PlayerState.ts    — Posición, vida, bombas, radio, velocidad, puntaje
│       │   ├── StandingEntry.ts  — Fila del ranking final (puesto, nombre, score, sessionId)
│       │   ├── BombState.ts      — Posición en tile, dueño, radio
│       │   ├── ExplosionState.ts — Celdas afectadas, dueño, TTL
│       │   └── PowerUpState.ts   — Posición en tile, tipo (bomba/radio/velocidad)
│       └── game/
│           ├── constants.ts      — Todos los parámetros del juego (re-exporta shared)
│           ├── GameMap.ts        — Generación del mapa 15×13, spawn points, colisiones
│           └── GameEngine.ts     — Movimiento, explosiones, power-ups, respawn, invulnerabilidad
└── client/                   — Phaser 3 + Vite (TypeScript)
    ├── index.html              — `#app`, canvas `#game-mount`, overlays nombre, controles y resultados
    └── src/
        ├── main.ts               — Boot de Phaser (constantes desde shared)
        ├── network/
        │   └── NetworkManager.ts — Cliente Colyseus, auto-detección de URL, callbacks
        ├── assets/
        │   ├── optionalAssets.ts — URLs de PNG opcionales bajo public/assets/
        │   ├── optionalAudio.ts  — Claves y URLs de música/SFX opcionales
        │   ├── registerTextures.ts — Texturas procedurales (tiles, jugador, bomba, power-ups)
        │   └── validateTextures.ts
        ├── audio/
        │   └── AudioManager.ts   — Música, SFX, niveles de volumen, desbloqueo por gesto
        ├── scenes/
        │   └── GameScene.ts      — Mapa, input, taunts, power-ups, countdown de reinicio
        ├── sprites/
        │   ├── PlayerSprite.ts   — Cuerpo + nombre, lerp, globo de burla
        │   ├── BombSprite.ts     — Círculo animado (pulso)
        │   ├── ExplosionSprite.ts — Rectángulos naranjas con fade-out
        │   └── PowerUpSprite.ts  — Ícono de power-up con animación de pulso alpha
        └── ui/
            ├── HUD.ts            — Panel partida: tiempo, objetivo, marcador, volumen
            ├── nameOverlay.ts    — Formulario de nombre antes de conectar
            ├── controlsOverlay.ts — Guía de controles tras confirmar nombre
            └── resultsOverlay.ts — Ranking final + countdown de reinicio
```

### Flujo de datos

```
Cliente                    Servidor
  │                           │
  │──── send("input") ───────►│
  │──── send("bomb")  ───────►│
  │──── send("taunt") ───────►│
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
- Las constantes compartidas (tile size, dimensiones del mapa, tipos) viven en el paquete `shared/` para evitar duplicación entre servidor y cliente.
