# Roadmap de mejoras

Registro de lo que se hizo y lo que queda pendiente, en orden de prioridad.

---

## Completado

### 1. Fix: `express` como dependencia explícita
`express` ahora está declarado en `server/package.json`. Antes dependía de que npm hoistease la dependencia transitiva de Colyseus, lo que podía fallar en entornos aislados (`npm ci`).

### 2. Fix: `mapWidth`/`mapHeight` asignados desde constantes
`BombermanRoom.onCreate()` ahora asigna `state.mapWidth = MAP_WIDTH` y `state.mapHeight = MAP_HEIGHT` explícitamente, eliminando el riesgo de desync si se cambia `constants.ts`.

### 3. Reinicio automático de partida
10 segundos después de terminar la partida, el servidor regenera el mapa, resetea scores y stats de todos los jugadores y arranca una nueva partida. El overlay de resultados muestra la cuenta regresiva en tiempo real (`restartCountdownMs` sincronizado vía schema).

### 4. Paquete `shared/`
Nuevo workspace `shared/src/index.ts` con las constantes y tipos comunes:
- `TILE_SIZE`, `MAP_WIDTH`, `MAP_HEIGHT`
- `TileType`, `PowerUpType` (enums)
- `PlayerInput` (interface)

El servidor re-exporta desde `shared/` en `constants.ts`. El cliente importa directamente `from "bomberman-shared"`. Se eliminaron todas las constantes duplicadas en `main.ts`, `GameScene.ts`, `HUD.ts`, `BombSprite.ts`, `ExplosionSprite.ts` y `registerTextures.ts`.

### 5. Sistema de power-ups
Al destruir bloques rompibles hay un 30% de probabilidad de que aparezca un power-up. Tres tipos:
- **Bomba extra** (rojo) — +1 bomba simultánea, máximo 5
- **Radio extra** (naranja) — +1 radio de explosión, máximo 6 tiles
- **Velocidad** (verde) — +20 px/s de velocidad, máximo 250

Los power-ups se recogen al pisar el tile. Las explosiones los destruyen. Al hacer respawn, los stats se resetean a los valores iniciales.

Cambios técnicos:
- Nuevo schema `PowerUpState` (tileX, tileY, powerUpType)
- `PlayerState` tiene campo `speed: uint8` sincronizado al cliente
- `GameEngine` gestiona pickup, drop y reset de power-ups
- `PowerUpSprite` en el cliente con animación de pulso alpha
- Texturas procedurales para los tres tipos (sustituibles por PNG opcionales: `powerup_bomb.png`, `powerup_radius.png`, `powerup_speed.png`)

---

## Pendiente

### 6. Tipado fuerte en el cliente (prioridad: alta)
`GameScene.ts` usa `any` extensivamente para el room state. Definir interfaces que reflejen los schemas del servidor o importar tipos desde `shared/`.

### 7. Optimizar `drawMap` (prioridad: media)
Actualmente destruye y recrea 195 sprites en cada cambio de tile. Mantener un array de sprites y solo actualizar la textura del tile que cambió.

### 8. `bombAtTile` O(n) sin early exit (prioridad: baja)
`MapSchema.forEach` no soporta break, por lo que `bombAtTile` recorre todas las bombas aunque encuentre match. Alternativa: índice auxiliar `Map<"tileX,tileY", key>`.

### 9. Tests (prioridad: alta)
No hay tests. Cubrir al menos:
- Unit: `GameEngine` (movimiento, colisión, detonación, chain reaction, damage, power-ups)
- Unit: `GameMap` (generación, spawn points)
- Integration: `BombermanRoom` (join, leave, match flow, restart)

### 10. Audio (prioridad: media)
No hay efectos de sonido. Agregar al menos: explosión, muerte, colocar bomba, recoger power-up, countdown de fin de partida.

### 11. ESLint + Prettier (prioridad: media)
No hay linting ni formatting configurados. Agregar `eslint` + `@typescript-eslint` + `prettier` al workspace raíz.

### 12. Soporte mobile (prioridad: baja)
No hay controles táctiles. Joystick virtual + botón de bomba ampliaría la audiencia considerablemente.

### 13. Lobby pre-game (prioridad: baja)
Actualmente es "join and play" directo. Un mini-lobby con lista de jugadores y botón "Listo" mejoraría la coordinación.

### 14. `.env.example`
Documentar todas las variables de entorno del servidor en un archivo de ejemplo.
