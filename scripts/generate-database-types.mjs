import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const supabaseCommand = process.platform === "win32" ? "supabase.cmd" : "supabase";
const result = spawnSync(
  supabaseCommand,
  ["gen", "types", "typescript", "--local", "--schema", "public"],
  {
    encoding: "utf8",
    shell: process.platform === "win32",
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const outputPath = fileURLToPath(
  new URL("../lib/supabase/database.types.ts", import.meta.url),
);

writeFileSync(outputPath, `${result.stdout.trimEnd()}\n`, "utf8");
