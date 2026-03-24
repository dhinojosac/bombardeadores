/**
 * Libera el puerto del juego (por defecto 2567) matando el proceso que lo escucha.
 * Si ya está libre o no se puede matar, sale con código 0 para no bloquear el arranque.
 *
 * Uso: node scripts/free-port.cjs [puerto]
 *      GAME_PORT=3000 node scripts/free-port.cjs
 */
const killPort = require("kill-port");

const port = Number(process.argv[2] || process.env.GAME_PORT || process.env.PORT || 2567);

if (!Number.isFinite(port) || port < 1 || port > 65535) {
  console.warn("[free-port] Puerto inválido, se omite.");
  process.exit(0);
}

killPort(port, "tcp")
  .then(() => {
    console.log(`[free-port] Puerto ${port} liberado.`);
  })
  .catch((err) => {
    const msg = err && err.message ? err.message : String(err);
    console.log(`[free-port] Puerto ${port}: ${msg} (continuando).`);
  })
  .then(() => process.exit(0));
