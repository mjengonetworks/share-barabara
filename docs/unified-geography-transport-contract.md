# Unified geography and transport contract (review proposal)

Status: executable migration candidate, not applied. This release does not execute SQL.

## Current audit

- `roads` and the road autocomplete/profile flow already provide canonical road IDs and aliases through the existing road data.
- Accident Reports and Alerts currently persist county/road text, optional road IDs, coordinates and content-specific fields, but do not have deployed country, administrative-area, transport-mode or transport-entity columns.
- News has optional location metadata and coordinates, but no canonical cross-content geography links.
- No deployed country reference table, international administrative-area table, transport-entity/alias table, or polymorphic content-geography link was found.
- The current map surface provides coordinate validation/location helpers; an existing public interactive map/filter architecture was not found to extend in this branch.
- Statistics must continue to use the approved incident sources only. Articles remain discovery content and must not become accident-statistics sources through geography links.

## Canonical contract

The second instance should review these names and keys before any migration is prepared for execution:

1. `countries`: ISO 3166-1 alpha-2 `iso_code` primary key, canonical English name, active flag.
2. `admin_areas`: stable text ID (`KE-001` through `KE-047` for Kenya), `country_code`, level (`county`, `state`, `province`, `region`, etc.), canonical name/code, optional parent ID, active flag. Existing Kenyan county data should be mapped by verified ID; no historical country backfill is implied.
3. `transport_entities`: UUID, entity type (`road`, `railway`, `airport`, `port`, `waterway`, `corridor`), canonical name/slug, country/admin-area references, optional verified geometry, verification state.
4. `transport_entity_aliases`: entity ID, normalized alias, source/verification metadata, unique entity/alias key.
5. `content_geography`: content type and stable content ID, country/admin-area/entity references, relationship kind, provenance, and uniqueness over content identity plus relationship. RLS must only expose public eligible records.
6. Supported content tables: nullable `country_code`, `admin_area_id`, `transport_mode`, and optional `transport_entity_id`; existing county/road/location columns remain during a reviewed compatibility period. `transport_mode` uses the second-instance canonical values.

`transport_mode` values are shared with the second-instance canonical statistics contract: `road`, `rail`, `aviation`, `maritime`, `inland_water`, and `other`. The UI keeps maritime and inland-water incident options distinct while persisting these canonical values.

## Dependency order

1. Agree country codes, administrative-area IDs and transport-mode values with the second instance.
2. Add country and administrative-area reference data, with verified Kenya county mappings and no speculative international subdivisions.
3. Add transport entities and aliases, reusing `roads` rather than creating a duplicate road table.
4. Add nullable content columns and/or `content_geography` relationships with indexes and RLS.
5. Add compatibility adapters for reports, alerts, articles, infrastructure and campaigns.
6. Add map and public discovery queries.
7. Add statistics mode segmentation and canonical-incident joins only after the second instance's incident identity contract is approved.

No step should rewrite historical location values, classify unknown records as Kenya or Road, or infer coordinates/geometries.

## Migration candidate and dependencies

The executable additive candidate is `supabase/migrations/20261028150000_unified_geography_transport_schema.sql`. It requires the existing editorial tables and `roads`, plus the second instance’s canonical incident, source and transport-mode tables. It seeds only Kenya’s verified 47 county reference rows, links existing roads by their existing UUIDs, adds nullable area/entity references to canonical incidents, and does not rewrite historical content. It must follow the second instance’s canonical incident identity and canonical transport-statistics migrations. It has not been executed.

## Application compatibility

The editor now probes for the complete reviewed schema and fails closed. Before it exists, the existing county/road fields continue to function and the app does not submit unknown columns. When the schema is present, all geographically relevant Add/Edit forms expose country, country-aware administrative areas, canonical transport mode and verified transport-entity selection; Reports and Alerts also expose mode-specific incident types.

Country defaults to `KE` only for new in-memory forms. Existing records use their stored values; no database default or historical rewrite is introduced here.

## Outstanding dependencies

- Reviewed additive SQL and reference data approval.
- Second-instance canonical incident identity/statistics contract.
- Third-instance public country/county/entity pages.
- Existing interactive map implementation or an owner-approved map extension point.
- Verified international administrative-area data.
