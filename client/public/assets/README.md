# Sprites personalizados (opcional)

El juego **intenta cargar** todos los PNG listados abajo en cada arranque. No hace falta tocar código:

- Si el archivo **no existe** o la petición **falla** (404, red, etc.), verás un aviso en consola y se usa el **fallback** generado por código.
- Si el PNG **carga pero tiene tamaño 0×0** (corrupto o inválido), se **elimina** esa textura y también se usa fallback.
- Si el tamaño **no es 48×48**, solo se muestra un **info** en consola; el juego **sigue usando tu imagen** y la escala con `setDisplaySize`.

Los nombres de archivo deben coincidir con las rutas en `client/src/assets/optionalAssets.ts` (guiones bajos, no guiones).

| Archivo (en esta carpeta `public/assets/`) | Clave Phaser | Uso |
|---------------------------------------------|--------------|-----|
| `tile_empty.png` | `tile_empty` | Suelo |
| `tile_solid.png` | `tile_solid` | Muro fijo |
| `tile_breakable.png` | `tile_breakable` | Caja |
| `bomb.png` | `bomb` | Bomba |
| `explosion.png` | `explosion_cell` | Celda de explosión |
| `player_down.png` | `player_down` | Jugador abajo |
| `player_up.png` | `player_up` | Arriba |
| `player_left.png` | `player_left` | Izquierda |
| `player_right.png` | `player_right` | Derecha |

Puedes tener **solo algunos** archivos: el resto seguirá con placeholders.

Arte con IA u otros: [Sprite AI](https://www.sprite-ai.art/) (revisa licencia comercial en su sitio).
