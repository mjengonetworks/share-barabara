# Task 60 — Editorial AI Functionality Matrix

## Supported actions in this repository

| Surface | Action | Provider | Model/configuration | Source path | Production status |
|---|---|---|---|---|---|
| Article | Generate | Grok/xAI | `XAI_API_KEY`, configured xAI model | `generateEditorialDraft` | Runtime **UNVERIFIED** |
| Article | Auto-Populate | Groq | `GROQ_API_KEY`, default `openai/gpt-oss-120b` | `generateEditorialDraft` | Runtime **UNVERIFIED** |
| Article | Update Existing | Grok/xAI | `XAI_API_KEY` | `generateEditorialDraft` | Runtime **UNVERIFIED** |
| Accident Report | Generate | Grok/xAI | `XAI_API_KEY` | same server function | Runtime **UNVERIFIED** |
| Accident Report | Auto-Populate | Groq | `GROQ_API_KEY` | same server function | Runtime **UNVERIFIED** |
| Accident Report | Update Existing | Grok/xAI | `XAI_API_KEY` | same server function | Runtime **UNVERIFIED** |
| Alert | Generate | Grok/xAI | `XAI_API_KEY` | same server function | Runtime **UNVERIFIED** |
| Alert | Auto-Populate | Groq | `GROQ_API_KEY` | same server function | Runtime **UNVERIFIED** |
| Alert | Update Existing | Grok/xAI | `XAI_API_KEY` | same server function | Runtime **UNVERIFIED** |
| Public AI/chat/summary | Public assistance | Groq | `GROQ_API_KEY`, default `openai/gpt-oss-120b` | `public.functions.ts` | Runtime **UNVERIFIED** |

The routing is selected server-side from the editorial mode. No client code receives
provider secrets. Editorial authorization requires an approved contributor/editorial
role, and proposals are applied to local form state before normal human save/publish
actions. Update Existing receives the current unsaved form state and does not save by
itself.

## Evidence and risks

- `src/lib/ai/providers.server.ts` uses server-side environment bindings and bounded
  provider requests.
- `src/server.ts` assigns the Cloudflare request environment before server functions run.
- Provider errors are classified without exposing keys.
- Structured JSON is requested and allowlisted fields are validated server-side.
- Report `incident_type` is conditionally submitted when the live schema capability is
  detected, which is a compatibility guard rather than proof the migration is present.
- The outer editorial parser still intentionally returns a safe generic invalid-draft
  message for malformed responses. This prevents leakage but can obscure whether a
  provider returned malformed JSON or omitted usable fields.

## Production classification

The owner reports that production has both `GROQ_API_KEY` and `XAI_API_KEY`. This is not
independently verifiable from the repository or the unavailable Wrangler deployment
metadata. The current report therefore does not claim that any live AI action is fixed.
The minimum live diagnostic is a redacted request trace identifying route, action, provider,
HTTP status class, model name, and validation outcome, never prompt contents, tokens or
secrets.

## Project AI

No project-generation, project-autopopulate or project-update action exists in this
repository. Do not add a fake matrix entry or route. The external Mjengo adapter only
reads public project previews; it does not publish projects.
