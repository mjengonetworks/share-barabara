# Ngong Road geometry review

This is a review fixture, not a production backfill.

The two OpenStreetMap ways in the adjacent GeoJSON were retrieved on 30 October 2026:

- `33136417`, tagged `Ngong Road`, `UCB4;Nairobi`, secondary road.
- `4723377`, tagged `Ngong Road`, `UCB3`, secondary road.

They are separate mapped segments with a visible geographic gap between their extents. They do not establish the complete Nairobi–Ngong alignment and must not be published as the whole road without a wider OSM segment review and canonical context decision. The geometry is preserved without simplification, with source URLs and OSM attribution in the GeoJSON properties.

Production use still requires an approved canonical road record, a reviewed MultiLineString assembled from all verified connected segments, source identifiers, attribution, confidence and owner approval for the separate geographic backfill.
