import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { themeInitializationScript } from "./theme";

describe("first-paint theme", () => {
  it.each([
    ["dark", false, "dark"], ["light", true, "light"],
    [null, true, "dark"], [null, false, "light"], ["invalid", true, "dark"],
  ])("resolves saved %s and system dark=%s to %s", (saved, systemDark, expected) => {
    const document = { documentElement: { dataset: {} as Record<string, string> } };
    runInNewContext(themeInitializationScript, { document, localStorage: { getItem: () => saved }, matchMedia: () => ({ matches: systemDark }) });
    expect(document.documentElement.dataset.theme).toBe(expected);
  });
  it("still initializes when browser storage is blocked", () => {
    const document = { documentElement: { dataset: {} as Record<string, string> } };
    runInNewContext(themeInitializationScript, { document, localStorage: { getItem: () => { throw new Error("blocked"); } }, matchMedia: () => ({ matches: true }) });
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});

function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}

describe("theme text contrast", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const [name, selector] of [["light", /:root\s*\{([^}]+)\}/], ["dark", /:root\[data-theme="dark"\]\s*\{([^}]+)\}/]] as const) {
    const tokens = Object.fromEntries([...css.match(selector)![1].matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map(match => [match[1], match[2]]));
    for (const [text, background] of [["ink", "surface"], ["body", "surface"], ["muted", "raised"], ["accent", "raised"], ["on-accent", "accent"], ["on-accent", "ink"], ["danger", "danger-surface"], ["warning", "warning-surface"], ["success", "success-surface"]]) {
      it(`${name}: ${text} on ${background} meets AA for normal text`, () => {
        const values = [luminance(tokens[text]), luminance(tokens[background])].sort((a, b) => b - a);
        expect((values[0] + .05) / (values[1] + .05)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
