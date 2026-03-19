# Bomberman Multiplayer

Juego 2D multijugador estilo Bomberman construido con **Phaser 3** (cliente) y **Colyseus** (servidor), usando TypeScript en ambos lados.

- Partida única siempre activa — todos los jugadores conectados entran automáticamente
- Servidor completamente autoritativo — los clientes solo envían inputs y renderizan
- Sincronización de estado en tiempo real vía WebSocket (20 Hz)
- Soporte para jugar online a través de un tunnel público con localtunnel

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

---

## Modo producción / tunnel (jugar con amigos online)

El servidor sirve el cliente compilado y el WebSocket desde un **único puerto (2567)**, lo que permite exponerlo con una sola URL pública.

```bash
# 1. Compilar el cliente
npm run build:client

# 2. Terminal A — servidor completo en http://localhost:2567
npm run tunnel:serve

# 3. Terminal B — abrir tunnel público
npm run tunnel:open
```

El tunnel genera una URL del tipo `https://xyz.loca.lt`. Compartirla con los amigos.

> **Contraseña del tunnel:** la primera vez que alguien accede desde un navegador, localtunnel pide una contraseña. Esta contraseña es tu IP pública. Para obtenerla, abrir `https://loca.lt/mytunnelpassword` desde la misma máquina que corre el servidor y compartirla junto con la URL.

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
- **Movimiento continuo** con colisiones AABB contra la grilla
- **Bombas** con 2 segundos de mecha; se colocan en la posición del jugador y explotan en cruz (radio 2)
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

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm install` | Instala dependencias de todos los workspaces |
| `npm run dev:server` | Inicia servidor en modo watch (desarrollo) |
| `npm run dev:client` | Inicia cliente con Vite (desarrollo) |
| `npm run build:client` | Compila el cliente para producción |
| `npm run tunnel:serve` | Inicia servidor sirviendo el cliente compilado |
| `npm run tunnel:open` | Abre el tunnel público con localtunnel |

---

## Arquitectura

```
multiplayer-game/
├── package.json              — Workspace root (npm workspaces)
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
│           └── GameEngine.ts     — Lógica pura: movimiento, bombas, explosiones, respawn
└── client/                   — Phaser 3 + Vite (TypeScript)
    ├── index.html
    └── src/
        ├── main.ts               — Boot de Phaser
        ├── network/
        │   └── NetworkManager.ts — Cliente Colyseus, auto-detección de URL, callbacks
        ├── scenes/
        │   └── GameScene.ts      — Render del mapa, sprites, input, interpolación
        ├── sprites/
        │   ├── PlayerSprite.ts   — Rectángulo con nombre y lerp de posición
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
