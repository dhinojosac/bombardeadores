# Assets personalizados (opcional)

El juego **intenta cargar** todos los archivos listados abajo en cada arranque. No hace falta tocar código:

- Si el archivo **no existe** o la petición **falla** (404, red, etc.), verás un aviso en consola y se usa el **fallback** generado por código (texturas) o **silencio** (audio).
- Si el PNG **carga pero tiene tamaño 0×0** (corrupto o inválido), se **elimina** esa textura y también se usa fallback.
- Si el tamaño **no es 48×48**, solo se muestra un **info** en consola; el juego **sigue usando tu imagen** y la escala con `setDisplaySize`.

**Solo cuenta lo que copies aquí:** si solo añades los tiles, el personaje y la bomba seguirán siendo placeholders hasta que añadas sus archivos.

Los nombres de archivo deben coincidir con las rutas en `client/src/assets/optionalAssets.ts` (guiones bajos). Las URLs de carga usan `import.meta.env.BASE_URL` para despliegues con `base` distinto de `/`.

---

## Sprites (imágenes)

| Archivo (en `public/assets/`)   | Clave Phaser      | Uso                     |
|---------------------------------|-------------------|-------------------------|
| `tile_empty.png`                | `tile_empty`      | Suelo                   |
| `tile_solid.png`                | `tile_solid`      | Muro fijo               |
| `tile_breakable.png`            | `tile_breakable`  | Caja                    |
| `bomb.png`                      | `bomb`            | Bomba                   |
| `explosion.png`                 | `explosion_cell`  | Celda de explosión      |
| `player_down.png`               | `player_down`     | Jugador mirando abajo   |
| `player_up.png`                 | `player_up`       | Jugador mirando arriba  |
| `player_left.png`               | `player_left`     | Jugador mirando izquierda |
| `player_right.png`              | `player_right`    | Jugador mirando derecha |
| `powerup_bomb.png`              | `powerup_bomb`    | Power-up: bomba extra   |
| `powerup_radius.png`            | `powerup_radius`  | Power-up: radio extra   |
| `powerup_speed.png`             | `powerup_speed`   | Power-up: velocidad     |

Tamaño recomendado: **48×48 px** con fondo transparente. Si el tamaño difiere, el juego lo escala.

Arte con IA u otros: [Sprite AI](https://www.sprite-ai.art/) (revisa licencia comercial en su sitio).

---

## Audio (música y efectos)

Los archivos van en la subcarpeta `public/assets/audio/`. El juego acepta **OGG y/o MP3** por cada pista; Phaser elige el formato que soporte el navegador. Si no existe ninguno de los dos, el juego continúa en silencio.

### Formatos soportados

| Formato     | Compatibilidad                 | Notas                             |
|-------------|--------------------------------|-----------------------------------|
| **OGG**     | Chrome, Firefox, Edge          | Primera opción (mejor compresión) |
| **MP3**     | Todos los navegadores modernos | Más universal                     |
| **WAV**     | Todos, pero muy pesado         | Solo recomendado para SFX cortos  |
| **M4A/AAC** | Safari, Chrome                 | Alternativa macOS/iOS             |

Puedes poner solo el MP3 si no tienes el OGG; funciona bien en la práctica.

### Archivos esperados

| Archivo (en `public/assets/audio/`)         | Uso                                         |
|---------------------------------------------|---------------------------------------------|
| `music_game.ogg` / `music_game.mp3`         | Música de fondo durante la partida          |
| `music_frenzy.ogg` / `music_frenzy.mp3`     | Música de frenesí (cuando no quedan cajas)  |
| `sfx_bomb_place.ogg` / `sfx_bomb_place.mp3` | Sonido al colocar una bomba                 |
| `sfx_explosion.ogg` / `sfx_explosion.mp3`   | Sonido de explosión                         |
| `sfx_powerup.ogg` / `sfx_powerup.mp3`       | Recoger un power-up                         |
| `sfx_death.ogg` / `sfx_death.mp3`           | Muerte de jugador                           |
| `sfx_victory.ogg` / `sfx_victory.mp3`       | Fin de partida / victoria                   |

Volúmenes base por pista definidos en `client/src/assets/optionalAudio.ts` (ajustables). En el juego, el panel lateral permite **bajar o silenciar la música** en cuatro pasos (normal, medio, bajo, mute); eso se aplica encima de esos valores base.

### Convertir tus archivos de música

Sin instalar nada (conversión online):
- [audio.online-convert.com](https://audio.online-convert.com/)
- [cloudconvert.com/audio-converter](https://cloudconvert.com/audio-converter)

Con ffmpeg (local):
```bash
# WAV/M4A/FLAC → OGG
ffmpeg -i cancion.wav -q:a 4 cancion.ogg

# WAV/M4A/FLAC → MP3
ffmpeg -i cancion.wav -q:a 2 cancion.mp3
```

Cualquier formato de entrada (WAV, FLAC, M4A, AAC, etc.) funciona. No hay restricciones de bitrate ni sample rate.
