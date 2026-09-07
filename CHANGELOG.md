# Release notes

## v0.2.0 — unreleased

- Automatic connection with one Connect/Refresh button and completed-deck progress inside it.
- Labeled demo fallback after initial failure; failed refreshes preserve stale live data.
- Searchable glass deck picker and matching history-period dropdown with keyboard navigation.
- Rolling last-7-day, last-30-day, last-6-month, and last-year history views.
- Cards learned now counts unique cards by their first recorded learning date, including today's new-card metric.
- Removed settings and API-key entry; today's day boundary is fixed at 04:00 local time.

## v0.1.0

The first public release of AnkiHub: a quiet dashboard for your daily Anki practice.

- Black glass interface with responsive layouts.
- Today's queue, time estimate, learning activity, and retention.
- All-history review totals, study time, and learning events.
- Collection and nested-deck filters.
- Sample-data demo that works without Anki.
- Direct, read-only AnkiConnect integration with connection guidance.

Live use requires desktop Anki, AnkiConnect API v6, the site's origin in AnkiConnect's allowed origins, and browser permission to access localhost where prompted. Match the study-day start setting to Anki (default 04:00). History excludes deleted cards and reflects current deck membership. Learning counts are review events, not unique cards. This independent project is not affiliated with Anki or AnkiHub.net.
