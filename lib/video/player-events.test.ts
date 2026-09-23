import { describe, expect, it, vi } from "vitest";

import { detachPlayerEventListeners, type PlayerEventListener } from "./player-events";

const listener: PlayerEventListener = () => undefined;

describe("detachPlayerEventListeners", () => {
  it("detaches every listener from an active player", () => {
    const off = vi.fn();

    detachPlayerEventListeners({ off }, [["ready", listener], ["pause", listener]]);

    expect(off).toHaveBeenNthCalledWith(1, "ready", listener);
    expect(off).toHaveBeenNthCalledWith(2, "pause", listener);
  });

  it("does not throw when Bunny has already disposed its iframe target", () => {
    const off = vi.fn(() => {
      throw new TypeError("Cannot read properties of null (reading 'postMessage')");
    });

    expect(() => detachPlayerEventListeners({ off }, [["timeupdate", listener], ["ended", listener]])).not.toThrow();
    expect(off).toHaveBeenCalledTimes(2);
  });
});
