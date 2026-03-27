/**
 * Asegura que exista un ejecutable de cloudflared antes de abrir el túnel.
 * - Windows: si no hay cloudflared.exe en la raíz ni en PATH, descarga el binario oficial.
 * - Linux/macOS: comprueba PATH; si falta, muestra instrucciones (sin descarga automática por variedad de arquitecturas).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const winExe = path.join(root, "cloudflared.exe");

const WIN_DOWNLOAD_URL =
  "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe";

const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

function logInfo(msg) {
  console.log(`${GREEN}[tunnel]${RESET} ${msg}`);
}

function logWarn(msg) {
  console.log(`${YELLOW}[tunnel]${RESET} ${msg}`);
}

function logErr(msg) {
  console.log(`${RED}[tunnel]${RESET} ${msg}`);
}

function cloudflaredOnPath() {
  try {
    if (process.platform === "win32") {
      execSync("where cloudflared", { stdio: "ignore", shell: true });
    } else {
      execSync("which cloudflared", { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

async function downloadWindowsBinary() {
  logWarn(`No se encontró cloudflared. Descargando desde GitHub (${DIM}una sola vez${RESET})…`);
  const res = await fetch(WIN_DOWNLOAD_URL, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Descarga fallida: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 50_000) {
    throw new Error("El archivo descargado parece inválido (demasiado pequeño).");
  }
  await fs.promises.writeFile(winExe, buf);
  logInfo(`Guardado: ${path.relative(root, winExe)}`);
}

async function ensureCloudflared() {
  if (cloudflaredOnPath()) {
    logInfo("Usando cloudflared del PATH.");
    return;
  }

  if (process.platform === "win32") {
    if (fs.existsSync(winExe)) {
      logInfo(`Usando ${path.basename(winExe)} en la raíz del proyecto.`);
      return;
    }
    try {
      await downloadWindowsBinary();
    } catch (e) {
      logErr("No se pudo descargar cloudflared automáticamente.");
      console.error(
        `${BOLD}Qué puedes hacer:${RESET}\n` +
          `  1. Descarga manual: ${WIN_DOWNLOAD_URL}\n` +
          `     Guárdalo como ${DIM}cloudflared.exe${RESET} en la raíz del repo.\n` +
          `  2. O instala cloudflared y añádelo al PATH.\n`
      );
      console.error(e.message || e);
      process.exit(1);
    }
    return;
  }

  logErr("cloudflared no está instalado ni en el PATH.");
  console.error(
    `${BOLD}Instálalo, por ejemplo:${RESET}\n` +
      `  ${DIM}macOS:${RESET}  brew install cloudflared\n` +
      `  ${DIM}Linux:${RESET} https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/\n` +
      `  O descarga el binario para tu arquitectura desde:\n` +
      `  https://github.com/cloudflare/cloudflared/releases/latest\n`
  );
  process.exit(1);
}

module.exports = { ensureCloudflared };

if (require.main === module) {
  ensureCloudflared().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
