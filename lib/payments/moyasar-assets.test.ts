import { describe, expect, it } from "vitest";

import {
  createMoyasarAssetLoader,
  MOYASAR_CSS_URL,
  MOYASAR_SCRIPT_URL,
  MoyasarAssetError,
} from "./moyasar-assets";

class FakeAssetElement {
  async = false;
  href = "";
  rel = "";
  src = "";
  removed = false;
  private listeners = new Map<string, Set<() => void>>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const callback = typeof listener === "function" ? listener : () => listener.handleEvent(new Event(type));
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(callback as () => void);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.get(type)?.delete(listener as () => void);
  }

  dispatch(type: "load" | "error") {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }

  remove() {
    this.removed = true;
  }
}

function createEnvironment() {
  const elements: FakeAssetElement[] = [];
  let ready = false;
  const documentObject = {
    createElement: () => new FakeAssetElement(),
    head: { appendChild: (element: FakeAssetElement) => elements.push(element) },
    querySelector: (selector: string) => elements.find((element) => !element.removed && (
      selector.startsWith("script") ? element.src === MOYASAR_SCRIPT_URL : element.href === MOYASAR_CSS_URL
    ),
    ) ?? null,
  };

  return {
    elements,
    get ready() { return ready; },
    set ready(value: boolean) { ready = value; },
    loader: createMoyasarAssetLoader(() => ({
      documentObject: documentObject as unknown as Document,
      isGatewayReady: () => ready,
    })),
  };
}

describe("Moyasar asset loader", () => {
  it("does not create any assets until purchase intent calls the loader", () => {
    const environment = createEnvironment();
    expect(environment.elements).toHaveLength(0);
  });

  it("deduplicates repeated calls and resolves after both assets load", async () => {
    const environment = createEnvironment();
    const first = environment.loader();
    const second = environment.loader();
    expect(first).toBe(second);
    expect(environment.elements).toHaveLength(2);

    environment.ready = true;
    for (const element of environment.elements) element.dispatch("load");
    await expect(first).resolves.toBeUndefined();
  });

  it("rejects a failed script load and removes assets created by that attempt", async () => {
    const environment = createEnvironment();
    const attempt = environment.loader();
    const script = environment.elements.find((element) => element.src === MOYASAR_SCRIPT_URL)!;
    script.dispatch("error");

    await expect(attempt).rejects.toEqual(expect.objectContaining<Partial<MoyasarAssetError>>({ kind: "script" }));
    expect(environment.elements.every((element) => element.removed)).toBe(true);
  });

  it("starts a fresh attempt after failure", async () => {
    const environment = createEnvironment();
    const first = environment.loader();
    environment.elements.find((element) => element.src === MOYASAR_SCRIPT_URL)!.dispatch("error");
    await expect(first).rejects.toBeInstanceOf(MoyasarAssetError);

    const retry = environment.loader();
    expect(retry).not.toBe(first);
    expect(environment.elements).toHaveLength(4);
    environment.ready = true;
    for (const element of environment.elements.slice(2)) element.dispatch("load");
    await expect(retry).resolves.toBeUndefined();
  });
});
