// F-009 R-008: the announcer writes each message to the live region so screen
// readers hear it once per action. A non-empty text clears the region, then sets
// the text on the next animation frame, cancelling any pending frame; an empty
// text does nothing. The frame functions are injected fakes, so no DOM or clock.
import { describe, it, expect } from "vitest";
import { createAnnouncer } from "../../src/ui/announcer";

interface RecordingElement {
  element: { textContent: string | null };
  writes: (string | null)[];
}

interface FakeFrames {
  requestFrame: (callback: () => void) => number;
  cancelFrame: (handle: number) => void;
  runPendingFrames: () => void;
  pendingFrameCount: () => number;
  requestedFrameCount: () => number;
  cancelledHandles: number[];
}

/** An element whose every textContent write is recorded in order. */
function createRecordingElement(initialText: string): RecordingElement {
  const writes: (string | null)[] = [];
  let currentText: string | null = initialText;
  const element = {
    get textContent(): string | null {
      return currentText;
    },
    set textContent(text: string | null) {
      writes.push(text);
      currentText = text;
    },
  };
  return { element, writes };
}

/** A fake animation-frame queue that only runs when the test says so. */
function createFakeFrames(): FakeFrames {
  const callbacksByHandle = new Map<number, () => void>();
  const cancelledHandles: number[] = [];
  let nextHandle = 1;
  let requestCount = 0;
  return {
    requestFrame(callback) {
      const handle = nextHandle;
      nextHandle += 1;
      requestCount += 1;
      callbacksByHandle.set(handle, callback);
      return handle;
    },
    cancelFrame(handle) {
      cancelledHandles.push(handle);
      callbacksByHandle.delete(handle);
    },
    runPendingFrames() {
      const callbacks = [...callbacksByHandle.values()];
      callbacksByHandle.clear();
      for (const callback of callbacks) {
        callback();
      }
    },
    pendingFrameCount: () => callbacksByHandle.size,
    requestedFrameCount: () => requestCount,
    cancelledHandles,
  };
}

describe("createAnnouncer (F-009 R-008)", () => {
  it("clears the region at once and sets the text on the next frame (F-009 R-008)", () => {
    const recording = createRecordingElement("Previous announcement.");
    const frames = createFakeFrames();
    const announcer = createAnnouncer(recording.element, frames);

    announcer.announce("You placed X in row 1, column 1.");

    expect(recording.element.textContent).toBe("");
    expect(frames.pendingFrameCount()).toBe(1);

    frames.runPendingFrames();

    expect(recording.element.textContent).toBe(
      "You placed X in row 1, column 1.",
    );
    expect(recording.writes).toEqual(["", "You placed X in row 1, column 1."]);
  });

  it("two quick announcements end with only the second text, cancelling the first frame (F-009 R-008)", () => {
    const recording = createRecordingElement("");
    const frames = createFakeFrames();
    const announcer = createAnnouncer(recording.element, frames);

    announcer.announce("First message.");
    announcer.announce("Second message.");

    expect(frames.cancelledHandles).toHaveLength(1);
    expect(frames.pendingFrameCount()).toBe(1);

    frames.runPendingFrames();

    expect(recording.element.textContent).toBe("Second message.");
    const nonEmptyWrites = recording.writes.filter(
      (text) => text !== null && text !== "",
    );
    expect(nonEmptyWrites).toEqual(["Second message."]);
  });

  it("an empty text changes nothing and requests no frame (F-009 R-008)", () => {
    const recording = createRecordingElement("Row 2, column 2 is taken.");
    const frames = createFakeFrames();
    const announcer = createAnnouncer(recording.element, frames);

    announcer.announce("");
    frames.runPendingFrames();

    expect(recording.element.textContent).toBe("Row 2, column 2 is taken.");
    expect(recording.writes).toEqual([]);
    expect(frames.requestedFrameCount()).toBe(0);
    expect(frames.cancelledHandles).toEqual([]);
  });

  it("an empty text leaves a pending announcement in place (F-009 R-008)", () => {
    const recording = createRecordingElement("");
    const frames = createFakeFrames();
    const announcer = createAnnouncer(recording.element, frames);

    announcer.announce("It's a draw.");
    announcer.announce("");
    frames.runPendingFrames();

    expect(recording.element.textContent).toBe("It's a draw.");
    expect(frames.cancelledHandles).toEqual([]);
  });

  it("the same text announced twice is cleared and set again, so it is heard twice (F-009 R-008)", () => {
    const takenMessage = "Row 2, column 2 is taken. Choose an empty square.";
    const recording = createRecordingElement("");
    const frames = createFakeFrames();
    const announcer = createAnnouncer(recording.element, frames);

    announcer.announce(takenMessage);
    frames.runPendingFrames();
    announcer.announce(takenMessage);

    expect(recording.element.textContent).toBe("");

    frames.runPendingFrames();

    expect(recording.element.textContent).toBe(takenMessage);
    expect(recording.writes).toEqual(["", takenMessage, "", takenMessage]);
  });
});
