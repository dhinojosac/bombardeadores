export type StandingRow = {
  place: number;
  name: string;
  score: number;
  sessionId: string;
};

export function collectStandingsFromState(finalStandings: unknown): StandingRow[] {
  const out: StandingRow[] = [];
  if (!finalStandings || typeof (finalStandings as any).forEach !== "function") return out;
  (finalStandings as any).forEach((e: any) => {
    out.push({
      place: e.place,
      name: e.name,
      score: e.score,
      sessionId: e.sessionId ?? "",
    });
  });
  return out;
}

export function endReasonLabel(endReason: string): string {
  if (endReason === "score") return "Objetivo de puntos";
  if (endReason === "time") return "Tiempo agotado";
  if (endReason === "lastAlive") return "Último sobreviviente";
  return endReason;
}

export function showResultsOverlay(
  rows: StandingRow[],
  localSessionId: string,
  endReason: string
): void {
  const overlay = document.getElementById("results-overlay");
  const reasonEl = document.getElementById("results-reason");
  const listEl = document.getElementById("results-list");
  const closeBtn = document.getElementById("results-close");
  if (!overlay || !reasonEl || !listEl || !closeBtn) {
    console.warn("[resultsOverlay] Faltan elementos DOM");
    return;
  }

  reasonEl.textContent = endReasonLabel(endReason);
  listEl.replaceChildren();

  for (const r of rows) {
    const li = document.createElement("li");
    const livesLabel = r.score === 1 ? "vida" : "vidas";
    li.textContent = `${r.place}º — ${r.name} — ${r.score} ${livesLabel} restante${r.score === 1 ? "" : "s"}`;
    if (r.sessionId && r.sessionId === localSessionId) {
      li.classList.add("results-you");
    }
    listEl.appendChild(li);
  }

  if (rows.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Sin jugadores en la partida.";
    listEl.appendChild(li);
  }

  overlay.style.display = "flex";

  closeBtn.onclick = (): void => {
    overlay.style.display = "none";
    closeBtn.onclick = null;
  };
}

export function hideResultsOverlay(): void {
  const overlay = document.getElementById("results-overlay");
  if (overlay) overlay.style.display = "none";
  const countdown = document.getElementById("results-countdown");
  if (countdown) countdown.textContent = "";
}

export function updateResultsCountdown(ms: number): void {
  const el = document.getElementById("results-countdown");
  if (!el) return;
  if (ms <= 0) {
    el.textContent = "";
    return;
  }
  const sec = Math.ceil(ms / 1000);
  el.textContent = `Próxima partida en ${sec}s...`;
}
