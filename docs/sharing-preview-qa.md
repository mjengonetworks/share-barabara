# Sharing preview QA

The shareable detail routes emit their title, summary, canonical URL and image
in the initial server-rendered HTML. The metadata does not depend on client-side
JavaScript, so Open Graph-compatible crawlers, including WhatsApp's link
fetcher, can read it from the first response.

The production canonical origin is always `https://sharebarabara.co.ke`, even
when the same content is viewed on staging. Featured images are converted to
absolute `https://` or `http://` URLs; missing or unsupported image URLs fall
back to `https://sharebarabara.co.ke/icon-512.png`.

After production deployment, verify one published URL from each type:

- news/article: `/news/{slug}`
- accident report: `/reports/{id}`
- alert: `/alerts/{id}`
- infrastructure issue: `/infrastructure-issues/{id}`
- campaign: `/campaigns/{slug}`
- contributor profile: `/u/{username}`

Check the raw response (before JavaScript execution) for `og:title`,
`og:description`, `og:image`, `og:url`, `twitter:card`, `twitter:image` and a
matching canonical link. Confirm the image URL is publicly fetchable without
authentication or a signed URL that expires.

External preview services cache fetched metadata and images. A corrected page
may therefore continue showing an old preview until the service refreshes its
cache; this is outside the application and cannot be fixed by changing the
client toolbar. Re-test after cache expiry or use the platform's URL debugger
or refresh flow where available. Sharing the canonical production URL is
required for consistent cache keys.
