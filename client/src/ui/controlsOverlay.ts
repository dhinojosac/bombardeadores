/**
 * Muestra una guía breve de controles justo después de que el jugador confirma su nombre.
 * Se cierra al hacer click en "Entendido" o presionando cualquier tecla.
 */
export function showControlsOverlay(onClose?: () => void): void {
  const overlay = document.getElementById("controls-overlay");
  const btn = document.getElementById("controls-close");
  if (!overlay || !btn) return;

  overlay.style.display = "flex";

  const close = (): void => {
    overlay.style.display = "none";
    btn.removeEventListener("click", close);
    document.removeEventListener("keydown", onAnyKey);
    onClose?.();
  };

  const onAnyKey = (e: KeyboardEvent): void => {
    // Ignore modifier-only keys
    if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
    close();
  };

  btn.addEventListener("click", close);
  // Small delay so the Enter/click that closed the name overlay doesn't immediately close this one
  setTimeout(() => document.addEventListener("keydown", onAnyKey), 300);
}
