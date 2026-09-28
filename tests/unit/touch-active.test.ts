// F-015 R-013 (acceptance criterion 6): iOS Safari applies :active only when a
// touchstart listener exists, so enableActiveStatesOnTouch registers exactly
// one passive touchstart listener. A fake target records every registration;
// whether iOS then shows the press is a manual real-device check.
import { describe, expect, it } from "vitest";
import { enableActiveStatesOnTouch } from "../../src/ui/touch-active";

interface ListenerRegistration {
  eventType: string;
  listener: EventListenerOrEventListenerObject | null;
  options: boolean | AddEventListenerOptions | undefined;
}

function createRecordingTarget(): {
  target: Pick<EventTarget, "addEventListener">;
  registrations: ListenerRegistration[];
} {
  const registrations: ListenerRegistration[] = [];
  return {
    registrations,
    target: {
      addEventListener(eventType, listener, options) {
        registrations.push({ eventType, listener, options });
      },
    },
  };
}

describe("enableActiveStatesOnTouch (F-015 R-013)", () => {
  it("registers exactly one touchstart listener, passive, and nothing else", () => {
    const { target, registrations } = createRecordingTarget();

    enableActiveStatesOnTouch(target);

    expect(registrations).toHaveLength(1);
    const [registration] = registrations;
    expect(registration?.eventType).toBe("touchstart");
    expect(registration?.options).toEqual({ passive: true });
    expect(registration?.listener).not.toBeNull();
  });

  it("registers a listener that does not cancel the touch", () => {
    const { target, registrations } = createRecordingTarget();
    enableActiveStatesOnTouch(target);
    const listener = registrations[0]?.listener;
    let wasDefaultPrevented = false;
    const touchEvent = {
      preventDefault: () => {
        wasDefaultPrevented = true;
      },
    } as unknown as Event;

    if (typeof listener === "function") {
      listener(touchEvent);
    } else {
      listener?.handleEvent(touchEvent);
    }

    expect(wasDefaultPrevented).toBe(false);
  });
});
