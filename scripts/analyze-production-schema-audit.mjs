#!/usr/bin/env node
/**
 * Compare a JSON export from production_schema_audit.sql with repository
 * migrations. This is deliberately advisory: an absent migration-history row
 * or absent object is reported as "not_confirmed", never as proof that a
 * migration is safe or unapplied.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const migrationDir = path.join(rootDir, "supabase", "migrations");
const knownApplied = new Set(["20260929120000"]);
const protectedMigrations = new Set(["20260929130000"]);

export function unwrapAuditExport(value) {
  if (Array.isArray(value) && value.length === 1) {
    return unwrapAuditExport(value[0]);
  }
  if (value && typeof value === "object" && value.production_schema_audit) {
    return unwrapAuditExport(value.production_schema_audit);
  }
  if (value && typeof value === "object" && value.data?.production_schema_audit) {
    return unwrapAuditExport(value.data.production_schema_audit);
  }
  return value;
}

function versionOf(fileName) {
  return fileName.match(/^(\d{14})/)?.[1] ?? null;
}

export function repositoryMigrations() {
  return fs.readdirSync(migrationDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((file) => ({ file, version: versionOf(file), protected: protectedMigrations.has(versionOf(file)) }));
}

function migrationSources() {
  return repositoryMigrations()
    .filter(({ version }) => version && version >= "20260930100000" && version <= "20261001120000")
    .filter(({ protected: isProtected }) => !isProtected)
    .map((migration) => ({ ...migration, sql: fs.readFileSync(path.join(migrationDir, migration.file), "utf8") }));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function extractExpectedObjects(sql) {
  const objects = [];
  const add = (kind, names) => names.forEach((name) => objects.push({ kind, name }));
  add("table", [...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]));
  add("index", [...sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]));
  add("function", [...sql.matchAll(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]));
  add("trigger", [...sql.matchAll(/CREATE\s+TRIGGER\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]));
  add("policy", [...sql.matchAll(/CREATE\s+POLICY\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]));
  return unique(objects.map((object) => JSON.stringify(object)))
    .map((object) => JSON.parse(object));
}

function historyRows(audit) {
  return Array.isArray(audit?.migration_history) ? audit.migration_history : [];
}

function presenceRows(audit) {
  return Array.isArray(audit?.object_presence) ? audit.object_presence : [];
}

export function analyzeAudit(audit) {
  const normalized = unwrapAuditExport(audit);
  if (!normalized || typeof normalized !== "object" || !normalized.audit) {
    throw new Error("The input does not contain a production_schema_audit result.");
  }
  const history = historyRows(normalized);
  const historyVersions = new Set(history.map((row) => String(row.version ?? "")));
  const migrations = repositoryMigrations();
  const migrationStatus = migrations.map((migration) => ({
    ...migration,
    status: migration.version && historyVersions.has(migration.version)
      ? "applied_in_report"
      : knownApplied.has(migration.version)
        ? "known_applied_but_missing_from_report"
        : "not_confirmed",
    execution_advice: migration.protected
      ? "excluded_protected"
      : knownApplied.has(migration.version)
        ? "do_not_replay_without_manual_review"
        : "compare_schema_and_review_before_execution",
  }));

  const reportedPresence = new Set(presenceRows(normalized)
    .filter((row) => row.present)
    .map((row) => `${row.kind}:${row.object_name}`));
  const expectedObjects = migrationSources().flatMap(({ file, sql }) =>
    extractExpectedObjects(sql).map((object) => ({ ...object, source_file: file })));
  const objectChecks = expectedObjects.map((object) => ({
    ...object,
    status: reportedPresence.has(`${object.kind}:${object.name}`)
      ? "present_in_report"
      : presenceRows(normalized).length
        ? "not_confirmed_in_report"
        : "not_reported",
  }));

  return {
    audit: normalized.audit,
    migration_status: migrationStatus,
    object_checks: objectChecks,
    warnings: [
      "This report is evidence for review, not authorization to execute a migration.",
      "A missing migration-history row is not classified as unapplied.",
      "Object presence does not prove object definitions are compatible; inspect the returned definitions and policies.",
      "The protected subscription migration is excluded from execution advice.",
    ],
  };
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath || inputPath === "--help") {
    console.error("Usage: node scripts/analyze-production-schema-audit.mjs <exported-audit.json>");
    process.exitCode = inputPath === "--help" ? 0 : 2;
    return;
  }
  const value = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), inputPath), "utf8"));
  process.stdout.write(`${JSON.stringify(analyzeAudit(value), null, 2)}\n`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main();
}
