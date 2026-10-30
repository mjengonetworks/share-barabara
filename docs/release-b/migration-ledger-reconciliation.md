# Release B migration-ledger reconciliation

The atomic SQL Editor script intentionally does not insert rows into
supabase_migrations.schema_migrations. Supabase SQL Editor executes SQL but does
not automatically register a migration file as applied, and fabricated ledger
rows would not prove that the SQL ran successfully.

After the owner confirms the complete SQL Editor batch committed:

1. Save the SQL Editor execution result, UTC timestamp, operator and checksum of
   the exact combined script.
2. Re-run the read-only ledger query in
   production-compatibility-queries.sql. If the three versions are absent, do
   not insert them manually from SQL Editor.
3. When an approved Supabase CLI maintenance session is available, use the
   supported migration reconciliation command with the three exact versions
   marked applied, after reviewing the CLI's target project and diff. The
   reconciliation must be recorded separately from SQL execution and must not
   run any additional migration.
4. Re-run the ledger query and retain the CLI output with the SQL Editor
   evidence.

If the project does not permit supported ledger reconciliation, leave the
versions absent and record the successful SQL Editor execution in the release
manifest rather than fabricating history. Future migration tooling must treat
these three files as already applied and must not replay them.

