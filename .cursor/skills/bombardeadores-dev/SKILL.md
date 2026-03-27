---
name: bombardeadores-dev
description: >-
  Workflow del proyecto Bomberman multiplayer (bombardeadores): levantar el juego,
  testear online, compartir link, desarrollo local, audio opcional, taunts, volumen
  y dónde tocar código. Usar cuando el usuario pregunte cómo arrancar, testear con
  amigos, o trabajar en cliente/servidor. Comando principal de prueba online: npm run start:online.
---

# Bombardeadores — Dev workflow

## Cómo levantar y compartir (lo que el usuario usa siempre)

Desde la **raíz del repo**:

```bash
npm run start:online
```

Equivale a `npm run tunnel:all`. Hace en secuencia:

1. `free-port` — libera el puerto **2567** si hace falta
2. `build:client` — compila el cliente Vite
3. Servidor único en **http://localhost:2567** (HTML estático + WebSocket Colyseus)
4. **cloudflared** (Quick Tunnel): en Windows puede **descargar** `cloudflared.exe` a la raíz vía `scripts/ensure-cloudflared.cjs` si no está en PATH
5. En consola del proceso del tunnel aparece la URL pública, p. ej. `https://xxxx.trycloudflare.com` — misma base para página y WebSocket

**Compartir:** esa URL con amigos; todos entran a la misma sala.

**Comprobar cloudflared:** `npm run ensure-cloudflared`

## Desarrollo local (sin tunnel)

```bash
# Terminal A — servidor ws://localhost:2567
npm run dev:server

# Terminal B — cliente http://localhost:3000
npm run dev:client
```

Varias pestañas en `:3000` para probar multijugador.

## Estructura del monorepo

| Workspace | Rol |
|-----------|-----|
| `shared/` | Constantes y tipos compartidos (`TILE_SIZE`, `MAP_*`, enums) |
| `server/` | Colyseus: `BombermanRoom`, `GameEngine`, estado schema |
| `client/` | Phaser 3 + Vite |

**Autoridad:** toda la lógica de juego en el servidor; el cliente envía `input`, `bomb`, `taunt` y renderiza estado.

## Audio (música y SFX)

- Archivos opcionales en `client/public/assets/audio/` (ver `client/src/assets/optionalAudio.ts` y `client/public/assets/README.md`)
- El loader intenta **MP3 → WAV → OGG** por clave si falla un formato (no usar solo arrays de URLs en Phaser sin reintentos)
- `client/src/audio/AudioManager.ts`: música, SFX, desbloqueo por gesto del usuario, niveles de volumen **normal / medio / bajo / mute** (panel lateral en HUD)

## Controles en el juego (referencia rápida)

- Movimiento: **WASD** o flechas
- Bomba: **Espacio**
- Burlas (ruleta local): **E** — cicla 3 mensajes; solo tú ves el preview; tras **500 ms** sin pulsar **E** se envía a los demás
- Tras elegir nombre: overlay de **guía de controles** (`controlsOverlay` + `#controls-overlay` en `index.html`)

## Características recientes útiles al depurar

- **Modo frenesí:** al destruir el último bloque rompible, boosts para todos; al respawn se reaplican si sigue activo (`isFrenzy` en estado)
- **Taunts:** mensaje `taunt` en sala; servidor hace broadcast a **otros** (`except` emisor); índice 0–2
- **Schema Colyseus:** si cambias `GameState` u otros schemas, reiniciar servidor y recargar cliente

## Archivos clave

| Área | Rutas |
|------|--------|
| Escena principal | `client/src/scenes/GameScene.ts` |
| Red | `client/src/network/NetworkManager.ts` |
| Sala / mensajes | `server/src/rooms/BombermanRoom.ts` |
| Motor | `server/src/game/GameEngine.ts` |
| Tunnel | `scripts/tunnel-cf.cjs`, `scripts/ensure-cloudflared.cjs` |

## Documentación en repo

- Raíz: `README.md` (controles, tunnel, arquitectura)
- Assets: `client/public/assets/README.md`
