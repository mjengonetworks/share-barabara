# Public Alert Summary contract

The production baseline does not currently expose an editorial `summary` column on
`public.alerts`. The public Alert detail route therefore reads `summary` as an
optional field and renders the Alert Summary only when the API returns a non-empty
value. It never substitutes the AI Summary or the full description.

The minimum contract for the admin Alert Add/Edit workstream is:

- add nullable `public.alerts.summary TEXT`;
- expose it through the existing public `alerts` select policy/API;
- include it in the admin create/update payloads using the same canonical field;
- regenerate Supabase types after the schema is applied.

The prepared migration is intentionally not executed by this workstream:
`20261028100000_alert_editorial_summary.sql`.
