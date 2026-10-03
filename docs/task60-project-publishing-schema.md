# Task 60 — Project Publishing Schema Audit

## Finding

The reported “project generation works, but publishing encounters a schema error” cannot
be reproduced or mapped to a Share Barabara project workflow from this repository.

Repository evidence shows:

- no `projects` Supabase table or project-publishing migration;
- no project generation API route;
- no project editor or publish handler;
- no project form payload/schema;
- no project publication-status enum or RLS policy;
- no local project detail route;
- only read-only Mjengo Hub project previews in `src/lib/mjengo.functions.ts` and
  `src/components/site/mjengo-previews.tsx`.

The Task 59 production audit likewise did not return a `projects` table. It did confirm
an `infrastructure_issues` table, but that is a separate community issue workflow and
must not be conflated with project publishing.

## Classification

- Share Barabara project publishing mismatch: **BLOCKED / NOT EVIDENCED**.
- Mjengo Hub project publishing schema: **EXTERNAL / UNVERIFIED**.
- SQL correction: **NONE PREPARED**, because the target table and failing statement are
  unknown.

## Required evidence before a safe fix

The next owner-approved diagnostic must identify the system that owns the project editor,
the failing endpoint, a redacted validation/database error, and the expected public project
schema. Only then can an application mapping or review-only SQL correction be prepared.
No table should be dropped, recreated, or guessed from the Share Barabara preview adapter.

## Current Mjengo behavior

The adapter fetches bounded public HTML/RSS and exposes source-provided title, location,
status, image, description and canonical link fields when present. It does not invent
budgets, dates, percentages, statuses or publication records.
