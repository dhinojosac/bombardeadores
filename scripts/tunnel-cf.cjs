/**
 * Runs cloudflared pointing at the game server.
 * Prefers ./cloudflared.exe (Windows) next to repo root, else `cloudflared` on PATH.
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const winExe = path.join(root, "cloudflared.exe");

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
    "\n[ERROR] No se pudo ejecutar cloudflared.\n" +
      "  - Windows: descarga cloudflared.exe en la raíz del repo:\n" +
      "    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe\n" +
      "  - O instálalo y asegúrate de que `cloudflared` esté en el PATH.\n"
  );
  console.error(err.message);
  process.exit(1);
});

child.on("exit", (code) => process.exit(code ?? 0));
