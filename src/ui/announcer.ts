// F-009 (R-008): writes announcements to the polite live region. The region is
// cleared first and the text set on the next frame, so a repeated message (A8
// twice) is announced again (ADR-012).
export interface Announcer {
  announce: (text: string) => void;
}

export interface AnnouncerOptions {
  requestFrame?: (callback: () => void) => number;
  cancelFrame?: (handle: number) => void;
}

export function createAnnouncer(
  element: { textContent: string | null },
  options: AnnouncerOptions = {},
): Announcer {
  const requestFrame =
    options.requestFrame ?? ((callback) => requestAnimationFrame(callback));
  const cancelFrame =
    options.cancelFrame ??
    ((handle) => {
      cancelAnimationFrame(handle);
    });
  let pendingFrame: number | null = null;

  return {
    announce(text) {
      if (text === "") {
        return;
      }
      if (pendingFrame !== null) {
        cancelFrame(pendingFrame);
      }
      element.textContent = "";
      pendingFrame = requestFrame(() => {
        pendingFrame = null;
        element.textContent = text;
      });
    },
  };
}
