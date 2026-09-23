import { describe, expect, it } from "vitest";

import {
  dateInputToIso,
  formatHalalas,
  isoToDateInput,
  parseSearchParameters,
  toSearchString,
  withPage,
} from "./presentation";

describe("admin presentation helpers", () => {
  it("keeps only single, non-empty URL values", () => {
    expect(parseSearchParameters({ status: "paid", page: "2", ignored: ["a", "b"], blank: "" })).toEqual({
      status: "paid",
      page: "2",
    });
  });

  it("builds a stable query string without empty filters", () => {
    expect(toSearchString({ status: "paid", search: "", page: 2, from: undefined })).toBe("?status=paid&page=2");
  });

  it("formats halalas as a western-numeral SAR value", () => {
    expect(formatHalalas(12550)).toContain("125.50");
    expect(formatHalalas(12550)).toContain("SAR");
  });

  it("replaces only the current page", () => {
    expect(withPage({ status: "paid", page: 1 }, 3)).toEqual({ status: "paid", page: 3 });
  });

  it("turns date-only filters into contract-compatible UTC intervals", () => {
    expect(dateInputToIso("2026-09-15", "start")).toBe("2026-09-15T00:00:00.000Z");
    expect(dateInputToIso("2026-09-15", "end")).toBe("2026-09-15T23:59:59.999Z");
    expect(dateInputToIso("15-09-2026", "start")).toBeUndefined();
    expect(isoToDateInput("2026-09-15T23:59:59.999Z")).toBe("2026-09-15");
  });
});
