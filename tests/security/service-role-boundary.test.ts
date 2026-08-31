import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const ignoredDirectories = new Set([".git", ".next", "coverage", "node_modules"]);

async function findSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await findSourceFiles(path.join(directory, entry.name))));
      }

      continue;
    }

    if (/\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(path.join(directory, entry.name));
    }
  }

  return files;
}

describe("Supabase service-role boundary", () => {
  it("references the service-role variable only in approved server modules", async () => {
    const sourceFiles = await findSourceFiles(projectRoot);
    const matches: string[] = [];
    const serviceRoleVariable = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join(
      "_",
    );

    for (const file of sourceFiles) {
      const content = await readFile(file, "utf8");

      if (content.includes(serviceRoleVariable)) {
        matches.push(path.relative(projectRoot, file).replaceAll("\\", "/"));
      }
    }

    expect(matches.sort()).toEqual([
      "lib/env/server.ts",
      "lib/supabase/admin.ts",
    ]);
  });
});
