# Production schema audit imports

Task 59 expects the owner-exported Supabase result at:

`docs/database-audits/production-schema-audit-2026-10-02.json`

That file is intentionally not included until the actual export is available.
Do not create a placeholder or paste the earlier readiness document into this
location. Validate and import the real JSON with:

```text
node scripts/import-production-schema-audit.mjs <exported-json-or-txt>
```

The importer accepts the raw SQL Editor JSON result, a Supabase single-column
row export, or a wrapper containing `data` and
`production_schema_audit`. It writes only after validating the audit shape.
