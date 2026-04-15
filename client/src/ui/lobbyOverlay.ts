import { PLAYER_COLORS } from "bomberman-shared";

const STATE = {
  onColorSelect: null as ((idx: number) => void) | null,
  onStartGame: null as (() => void) | null,
  onVolumeChange: null as (() => void) | null,
};

const VOLUME_LABELS: Record<string, string> = {
  normal: "♪  VOL: NORMAL",
  medio:  "♪  VOL: MEDIO",
  bajo:   "♪  VOL: BAJO",
  mute:   "✕  VOL: MUTE",
};

const VOLUME_COLORS: Record<string, string> = {
  normal: "#66dd88",
  medio:  "#aade88",
  bajo:   "#cccccc",
  mute:   "#888888",
};

export function initLobbyOverlay(
  onColorSelect: (idx: number) => void, 
  onStartGame: () => void,
  onVolumeChange: () => void
) {
  STATE.onColorSelect = onColorSelect;
  STATE.onStartGame = onStartGame;
  STATE.onVolumeChange = onVolumeChange;

  const btn = document.getElementById("lobby-start-btn");
  if (btn) {
    btn.onclick = () => {
      if (STATE.onStartGame) STATE.onStartGame();
    };
  }

  const volBtn = document.getElementById("lobby-vol-btn");
  if (volBtn) {
    volBtn.onclick = () => {
      if (STATE.onVolumeChange) STATE.onVolumeChange();
    };
  }

  // Generar botones de colores
  const container = document.getElementById("lobby-color-picker");
  if (container) {
    container.innerHTML = "";
    PLAYER_COLORS.forEach((colorCode, index) => {
      const btn = document.createElement("button");
      btn.className = "color-btn";
      btn.id = `lobby-color-${index}`;
      btn.style.backgroundColor = `#${colorCode.toString(16).padStart(6, "0")}`;
      btn.onclick = () => {
        if (STATE.onColorSelect) STATE.onColorSelect(index);
      };
      container.appendChild(btn);
    });
  }
}

export function showLobbyOverlay() {
  const el = document.getElementById("lobby-overlay");
  if (el) el.style.display = "flex";
}

export function updateLobbyVolBtn(level: string) {
  const volBtn = document.getElementById("lobby-vol-btn");
  if (volBtn) {
    volBtn.innerText = VOLUME_LABELS[level] ?? "♪ VOL";
    volBtn.style.color = VOLUME_COLORS[level] ?? "#ffffff";
  }
}

export function hideLobbyOverlay() {
  const el = document.getElementById("lobby-overlay");
  if (el) el.style.display = "none";
}

export function updateLobbyState(playersMap: Map<string, any>, localSessionId: string) {
  const listEl = document.getElementById("lobby-player-list");
  if (!listEl) return;

  listEl.innerHTML = "";
  
  const occupiedColors = new Set<number>();
  let localPlayerIsHost = false;
  let hasHost = false;

  playersMap.forEach((p, sid) => {
    occupiedColors.add(p.colorIndex);
    if (p.isHost) {
      hasHost = true;
      if (sid === localSessionId) localPlayerIsHost = true;
    }

    const colorCode = PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length] ?? 0xffffff;
    const isMe = sid === localSessionId;

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="lobby-color-preview" style="background-color: #${colorCode.toString(16).padStart(6, "0")}"></div>
      <span style="${isMe ? 'font-weight:bold;color:#3498db;' : ''}">
        ${p.name} ${isMe ? '(Tú)' : ''} ${p.isHost ? '👑' : ''}
      </span>
    `;
    listEl.appendChild(li);
  });

  // Actualizar botones de colores
  const localPlayer = playersMap.get(localSessionId);
  const myColorIndex = localPlayer ? localPlayer.colorIndex : -1;

  PLAYER_COLORS.forEach((_, index) => {
    const btn = document.getElementById(`lobby-color-${index}`) as HTMLButtonElement | null;
    if (btn) {
      const isTaken = occupiedColors.has(index);
      const isMine = index === myColorIndex;
      
      if (isMine) {
        btn.classList.add("selected");
        btn.disabled = false;
      } else {
        btn.classList.remove("selected");
        btn.disabled = isTaken;
      }
    }
  });

  // Mostrar el botón Start solo si somos el host
  const startBtn = document.getElementById("lobby-start-btn");
  const waitingText = document.getElementById("lobby-waiting-text");
  
  if (startBtn && waitingText) {
    if (localPlayerIsHost) {
      startBtn.style.display = "block";
      waitingText.style.display = "none";
    } else {
      startBtn.style.display = "none";
      waitingText.style.display = "block";
    }
  }
}
