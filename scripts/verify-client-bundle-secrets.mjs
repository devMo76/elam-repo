import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const clientBundleDirectory = path.join(projectRoot, ".next", "static");
const serverOnlyVariables = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "MOYASAR_SECRET_KEY",
  "MOYASAR_WEBHOOK_SECRET",
  "VIDEO_API_KEY",
  "VIDEO_TOKEN_SIGNING_KEY",
  "EMAIL_API_KEY",
];

async function findFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function parseEnvironmentFile(content) {
  const values = new Map();

  for (const sourceLine of content.split(/\r?\n/u)) {
    const line = sourceLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = /^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/u.exec(line);

    if (!match) {
      continue;
    }

    const [, name, sourceValue] = match;
    let value = sourceValue.trim();

    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    values.set(name, value);
  }

  return values;
}

async function readLocalEnvironment() {
  const values = new Map();

  for (const fileName of [".env", ".env.local"]) {
    try {
      const content = await readFile(path.join(projectRoot, fileName), "utf8");

      for (const [name, value] of parseEnvironmentFile(content)) {
        values.set(name, value);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  return values;
}

const localEnvironment = await readLocalEnvironment();
const forbiddenMarkers = serverOnlyVariables.flatMap((name) => {
  const configuredValue = process.env[name] ?? localEnvironment.get(name);
  const markers = [{ label: `${name} variable name`, value: name }];

  if (configuredValue && configuredValue.length >= 8) {
    markers.push({ label: `${name} configured value`, value: configuredValue });
  }

  return markers;
});

let clientBundleFiles;

try {
  clientBundleFiles = await findFiles(clientBundleDirectory);
} catch (error) {
  if (error?.code === "ENOENT") {
    throw new Error("Client bundle not found. Run `npm run build` first.");
  }

  throw error;
}

const violations = [];

for (const file of clientBundleFiles) {
  const content = await readFile(file);

  for (const marker of forbiddenMarkers) {
    if (content.includes(Buffer.from(marker.value))) {
      violations.push(
        `${marker.label} found in ${path.relative(projectRoot, file)}`,
      );
    }
  }
}

if (violations.length > 0) {
  throw new Error(
    `Server-only data was found in browser assets:\n${violations.join("\n")}`,
  );
}

console.log(
  `Verified ${clientBundleFiles.length} client bundle files contain no server-only variables or configured secret values.`,
);
