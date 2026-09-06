import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const requiredDocuments = [
  "docs/operations/backup-and-restore.md",
  "docs/operations/migration-release.md",
  "docs/operations/incident-response.md",
  "docs/operations/production-release-checklist.md",
];

for (const document of requiredDocuments) {
  await access(path.join(root, document));
}

const migrationDirectory = path.join(root, "supabase", "migrations");
const migrations = (await readdir(migrationDirectory))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const timestamps = new Set();

for (const migration of migrations) {
  const match = /^(\d{12,14})_[a-z0-9_]+\.sql$/u.exec(migration);
  if (!match) throw new Error(`Invalid migration filename: ${migration}`);
  if (timestamps.has(match[1])) throw new Error(`Duplicate migration timestamp: ${match[1]}`);
  timestamps.add(match[1]);
}

const exampleEnvironment = await readFile(path.join(root, ".env.example"), "utf8");
for (const variable of [
  "SUPABASE_SERVICE_ROLE_KEY",
  "MOYASAR_SECRET_KEY",
  "MOYASAR_WEBHOOK_SECRET",
  "BUNNY_STREAM_API_KEY",
  "BUNNY_STREAM_TOKEN_KEY",
  "EMAIL_API_KEY",
]) {
  if (!exampleEnvironment.includes(`${variable}=`)) {
    throw new Error(`Missing environment variable documentation: ${variable}`);
  }
}

console.log(`Release readiness structure verified: ${migrations.length} migrations and ${requiredDocuments.length} runbooks.`);
