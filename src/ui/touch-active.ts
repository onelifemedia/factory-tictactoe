// F-015 R-013: iOS Safari applies :active only when the document has a
// touchstart listener; one passive no-op listener turns the press state on.

/**
 * Registers one passive no-op touchstart listener on `target`. Stub for the
 * TDD red step; not implemented yet.
 */
export function enableActiveStatesOnTouch(
  target: Pick<EventTarget, "addEventListener">,
): void {
  throw new Error(
    `enableActiveStatesOnTouch is not implemented yet (F-015): ${typeof target.addEventListener}`,
  );
}
