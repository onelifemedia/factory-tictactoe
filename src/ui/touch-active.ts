// F-015 R-013: iOS Safari applies :active only when the document has a
// touchstart listener; one passive no-op listener turns the press state on.

function ignoreTouch(): void {
  // Deliberately empty: the listener's presence is what enables :active.
}

/** Registers one passive no-op touchstart listener on `target`. */
export function enableActiveStatesOnTouch(
  target: Pick<EventTarget, "addEventListener">,
): void {
  target.addEventListener("touchstart", ignoreTouch, { passive: true });
}
