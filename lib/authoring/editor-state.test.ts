import { describe, expect, it } from "vitest";

import { getEditorSaveState } from "./editor-state";

describe("getEditorSaveState", () => {
  it.each([
    [{ dirty: false, saving: false, saved: false, failed: false }, "pristine"],
    [{ dirty: true, saving: false, saved: false, failed: false }, "dirty"],
    [{ dirty: true, saving: true, saved: false, failed: false }, "saving"],
    [{ dirty: false, saving: false, saved: true, failed: false }, "saved"],
    [{ dirty: true, saving: false, saved: false, failed: true }, "failed"],
  ] as const)("maps %o to %s", (input, expected) => {
    expect(getEditorSaveState(input)).toBe(expected);
  });

  it("returns to saving when a failed edit is retried", () => {
    expect(getEditorSaveState({ dirty: true, saving: true, saved: false, failed: true })).toBe("saving");
  });
});
