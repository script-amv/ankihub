<div align="center">

# AnkiHub

**A little better, every day.**

A quiet, glass dashboard for your daily Anki practice.

[Open AnkiHub](https://ankihub.vercel.app) · [Report an issue](https://github.com/script-amv/ankihub/issues) · [Release notes](CHANGELOG.md)

[![Checks](https://github.com/script-amv/ankihub/actions/workflows/ci.yml/badge.svg)](https://github.com/script-amv/ankihub/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-white.svg?labelColor=111111&color=dddddd)](LICENSE)

![AnkiHub dashboard displaying synthetic demo data](public/demo.png)

</div>

AnkiHub brings your remaining cards, today's progress, and long-term effort into one monochrome dashboard. Built with React, TypeScript, and Vite; inspired by Raycast's visual design.

This is an independent project by [script-amv](https://github.com/script-amv), **not affiliated with Anki or AnkiHub.net**.

## What you get

- **Today's focus:** due, new, and learning queues, a time estimate based on today's pace, and a little encouragement.
- **Today's session:** reviews, learning activity, study time, seconds per card, and overall answer retention.
- **History ranges:** total reviews, time invested, and unique cards learned over the last 7 days, 30 days, 6 months, year, or all history.
- **Deck filters:** searchable glass dropdowns for your whole collection or a parent deck and its children.
- **Automatic connection:** connects on opening, with completed-deck progress inside the Connect/Refresh button.
- **Demo fallback:** labeled synthetic data when the initial connection fails.
- **Read-only integration:** live data comes directly from AnkiConnect on your computer.

## Connect your Anki

Live stats require **desktop Anki on the same computer as your browser**. If the automatic connection fails, the dashboard shows labeled demo data and a **Connect** button to retry.

1. Install [AnkiConnect](https://ankiweb.net/shared/info/2055492159) in Anki using add-on code `2055492159`, then restart Anki. API v6 is required.
2. Open **Tools → Add-ons → AnkiConnect → Config**. Add the deployed origin to the existing `webCorsOriginList`, preserving any entries you already use:

   ```json
   "webCorsOriginList": ["http://localhost", "https://ankihub.vercel.app"]
   ```

3. Restart Anki and keep it open. Open [AnkiHub](https://ankihub.vercel.app); it connects automatically.
4. Allow local-network access when your browser prompts. If the initial attempt fails, press **Connect** to retry.

The button shows completed decks while loading (for example, **12 / 80 decks**) and becomes **Refresh** after a successful connection. This version supports AnkiConnect without an API key; it has no credential or settings form. Today's session uses a fixed **04:00 local-time** day boundary. Nothing is persisted across reloads.

### Troubleshooting

| Symptom | What to check |
| --- | --- |
| Can't reach Anki | Anki is open on this computer; AnkiConnect listens at `127.0.0.1:8765`. |
| Loading pauses on macOS | Bring Anki to the foreground and retry. Background Anki can respond slowly. Large histories also take longer to load. |
| Connection blocked | The exact site origin is allowed in AnkiConnect; restart Anki after changing its config. |
| Browser permission denied | Allow local-network access in the site's browser permissions, then reconnect. |
| Invalid key | This version does not support AnkiConnect installations that require an API key. |
| Today's totals differ | Check the selected deck. The dashboard uses 04:00 local time; a different Anki day boundary can produce different totals. |
| A refresh fails | The last successful live snapshot stays visible and is marked stale. |

The supported live setup is desktop Chrome with localhost access allowed. Other browsers may impose different local-network restrictions; the demo remains available. Phones cannot connect to Anki running on another computer through this app's localhost endpoint.

## What the numbers mean

| Metric | Definition |
| --- | --- |
| Cards to go | Scheduler new + learning + review counts, respecting Anki's queue limits. Parent totals include their children once. |
| Total reviews | Answer events with an Again, Hard, Good, or Easy response; unanswered scheduling records are excluded. |
| Cards learned | Unique card IDs whose earliest valid Learn event falls in the selected period. Repeated learning steps and relearning never count again. Today's new-card metric uses the same definition. |
| Due activity | Review and Relearn events. Filtered events still contribute to total reviews. |
| Retention | Hard, Good, and Easy responses divided by all valid answers, including learning. No answers displays `—`. |
| Time | Recorded Anki answer durations, rather than wall-clock session time. |
| Estimate | Today's average answer duration × remaining queue count. Repeated learning steps can make actual time longer. |

History covers cards **currently in your collection** and follows their current deck membership. Deleted cards are not returned by the plugin's history endpoint. Cards without a recorded Learn event cannot be assigned a first learning date.

History defaults to **All history**. Other ranges roll backward from the loaded snapshot's timestamp by 7 or 30 calendar days, or 6 or 12 calendar months, in local time. Month-end dates are clamped to the last valid day. Changing the period filters only the History section; changing the deck updates all sections. Neither action fetches data again. The plugin does not expose the study-day preference, so today's cutoff stays at 04:00 internally.

## Privacy

Review data stays in memory in your browser tab. Opening the dashboard attempts a read-only connection directly to your local AnkiConnect instance; it has no collection-data backend or analytics. Demo data is generated locally after a failed initial attempt, with no background retries. Vercel serves the static app and may retain ordinary hosting request logs. Google Fonts provides the font stylesheet, with a system-font fallback. The screenshots and demo contain only synthetic data.

## Develop locally

Requires Node.js 24 and npm.

```sh
git clone https://github.com/script-amv/ankihub.git
cd ankihub
npm ci
npm run dev
```

Open the URL printed by Vite. For live use, allow that exact origin in AnkiConnect too.

```sh
npm test
npm run build
npx playwright install chromium
npx playwright test
```

On systems that need installed Chrome instead of bundled Chromium, run `PLAYWRIGHT_CHANNEL=chrome npx playwright test`. GitHub Actions runs the unit tests, build, and browser tests on Linux.

## Contribute

Issues and pull requests are welcome. Include reproduction steps and your Anki/browser versions when reporting connection problems; do not attach API keys or personal collection data. Keep the UI monochrome, use synthetic test fixtures, and run the checks above before opening a PR.

## License

[MIT](LICENSE). The license covers this dashboard's source; Anki, AnkiConnect, and Raycast are separate projects.
