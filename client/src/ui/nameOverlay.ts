export const DISPLAY_NAME_STORAGE_KEY = "bomberman_display_name";

/** Valor sugerido para el campo (URL `?name=` o localStorage); puede quedar vacío. */
export function getDefaultDisplayName(): string {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("name");
  if (fromUrl != null) {
    const t = fromUrl.trim();
    if (t.length > 0) return t;
  }
  try {
    const stored = localStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
    if (stored && stored.trim().length > 0) return stored.trim();
  } catch {
    /* ignore */
  }
  return "";
}

export function showNameOverlay(onSubmit: (name: string) => void): void {
  const overlay = document.getElementById("name-overlay");
  const input = document.getElementById("name-input") as HTMLInputElement | null;
  const btn = document.getElementById("name-submit");
  if (!overlay || !input || !btn) {
    console.error("[nameOverlay] Faltan elementos #name-overlay, #name-input o #name-submit");
    onSubmit("");
    return;
  }

  input.value = getDefaultDisplayName();
  overlay.style.display = "flex";
  setTimeout(() => input.focus(), 50);

  const submit = (): void => {
    const raw = input.value.trim();
    overlay.style.display = "none";
    btn.removeEventListener("click", submit);
    input.removeEventListener("keydown", onKey);
    onSubmit(raw);
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  btn.addEventListener("click", submit);
  input.addEventListener("keydown", onKey);
}

export function hideNameOverlay(): void {
  const overlay = document.getElementById("name-overlay");
  if (overlay) overlay.style.display = "none";
}
