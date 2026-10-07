#!/usr/bin/env node
/**
 * Validate and import the read-only Supabase schema audit export.
 *
 * This utility never connects to Supabase and never executes SQL. It accepts
 * JSON exported from the SQL Editor, including a single-column row such as
 * [{"production_schema_audit": {...}}], then writes a canonical unwrapped
 * audit JSON to the Task 59 import location.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { unwrapAuditExport } from "./analyze-production-schema-audit.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const defaultOutput = path.join(
  rootDir,
  "docs",
  "database-audits",
  "production-schema-audit-2026-10-02.json",
);

export function validateAuditExport(value) {
  const audit = unwrapAuditExport(value);
  if (!audit || typeof audit !== "object" || Array.isArray(audit)) {
    throw new Error("Audit export must contain one production_schema_audit object.");
  }
  if (!audit.audit || audit.audit.name !== "share_barabara_production_schema_audit") {
    throw new Error("The export is not the Share Barabara production schema audit.");
  }
  for (const field of [
    "migration_history",
    "migration_targets",
    "object_presence",
    "dependency_checks",
    "tables",
    "columns",
    "rls_policies",
    "triggers",
    "functions",
    "constraints",
    "indexes",
    "table_grants",
    "routine_grants",
    "extensions",
  ]) {
    if (!Array.isArray(audit[field])) {
      throw new Error(`Audit export is missing array field: ${field}`);
    }
  }
  if (audit.audit.read_only_statement !== true) {
    throw new Error("Audit export is not marked read-only.");
  }
  return audit;
}

export function importAudit(inputPath, outputPath = defaultOutput) {
  const source = path.resolve(process.cwd(), inputPath);
  const parsed = JSON.parse(fs.readFileSync(source, "utf8"));
  const audit = validateAuditExport(parsed);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  return { outputPath, migrationCount: audit.migration_history.length };
}

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] ? path.resolve(process.cwd(), process.argv[3]) : defaultOutput;
  if (!inputPath || inputPath === "--help") {
    console.error("Usage: node scripts/import-production-schema-audit.mjs <exported-json-or-txt> [output-json]");
    process.exitCode = inputPath === "--help" ? 0 : 2;
    return;
  }
  const result = importAudit(inputPath, outputPath);
  process.stdout.write(`Validated and imported ${result.migrationCount} migration-history rows to ${result.outputPath}\n`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main();
}
