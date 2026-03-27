/**
 * Runs cloudflared pointing at the game server.
 * Prefers ./cloudflared.exe (Windows) next to repo root, else `cloudflared` on PATH.
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { ensureCloudflared } = require("./ensure-cloudflared.cjs");

const root = path.join(__dirname, "..");
const winExe = path.join(root, "cloudflared.exe");

function runTunnel() {
  let command;
  let args;

  if (process.platform === "win32" && fs.existsSync(winExe)) {
    command = winExe;
    args = ["tunnel", "--url", "http://localhost:2567"];
  } else {
    command = "cloudflared";
    args = ["tunnel", "--url", "http://localhost:2567"];
  }

  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  child.on("error", (err) => {
    console.error(
      "\n[tunnel] No se pudo ejecutar cloudflared. Ejecuta: node scripts/ensure-cloudflared.cjs\n"
    );
    console.error(err.message);
    process.exit(1);
  });

  child.on("exit", (code) => process.exit(code ?? 0));
}

(async () => {
  await ensureCloudflared();
  runTunnel();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
