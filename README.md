# AnkiHub

A monochrome glass dashboard for your local Anki collection.

## Run

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Keep Anki running with AnkiConnect API v6 enabled. The supplied `anki-connect plugin` is the integration reference; neither plugin directory is modified by this application.

The browser connects directly to `http://127.0.0.1:8765`. If the connection is blocked, add the exact browser origin to AnkiConnect's `webCorsOriginList` and restart Anki. You can enter an optional API key through the settings button. Credentials and collection history stay in memory. No analytics or cloud backend is used; the font stylesheet is loaded from Google Fonts, with a system-font fallback.

Match **Study day starts at** in dashboard settings to Anki's next-day start preference (default 04:00). The supplied plugin does not expose that preference. Dashboard day boundaries use the computer's local timezone. Settings reset when the page reloads.

## Metrics

- Focus uses scheduler new, learning and review queue counts, including scheduler limits. Parent totals include children and are counted only once.
- History is fetched separately for every exact deck, since `cardReviews` does not include descendants. A selected parent includes child histories. History reflects current deck membership and excludes deleted cards because that is what the API exposes.
- Learning counts are learning **events**, including repeated steps. Due activity includes review and relearning events. Filtered events contribute to totals. Manual scheduling entries with no answer are excluded.
- Retention is successful answers (Hard, Good or Easy) divided by valid answer events across all types. No answers yields an undefined rate rather than zero percent.
- Time uses recorded Anki durations. Estimated focus time uses today's average answer duration and is approximate, especially when cards require repeated learning steps.
- Data loads on opening or manual refresh. Failed refreshes preserve the last snapshot with a stale notice. Nothing edits or reviews cards through the app.

```sh
npm test
npm run build
```
