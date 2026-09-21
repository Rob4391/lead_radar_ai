# Changelog

## 0.2.0 - Phase 4

- Add deduplication merge behavior: emails, urls, and titles are merged into deterministic lists.
- Add `--mx-check` opt-in MX validation for deduped emails (requires `dnspython`).
- Add integration E2E tests for crawl→extract→dedupe→export (uses `responses` mocking).
- Exporter now writes `urls` and `titles` joined by `;` in CSV output.
- CI updated to install test deps and run integration tests.
