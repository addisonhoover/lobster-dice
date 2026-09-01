# 🦞 Lobster Dice

[![tests](https://github.com/addisonhoover/lobster-dice/actions/workflows/test.yml/badge.svg)](https://github.com/addisonhoover/lobster-dice/actions/workflows/test.yml) [![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Scorepad + stakes tracker** for the dice game Lobster Dice — replaces pen, paper, and mental math. Enter names, tap each roll as it lands, and the app enforces every rule, tracks the money, and settles the series.

**Live app:** https://lobster-dice.vercel.app · app design by addison hoover

**Crimson Dice** is a path skin of this same app (not a second project). `/` stays Lobster Dice. `/crimson` and `/crimson/01`…`/crimson/25` load the crimson/white theme, elephant pip, and kit tracking. Owner roster: `/crimson/activity` (needs `CRIMSON_OWNER_KEY` + `SUPABASE_SERVICE_ROLE_KEY` — see the PR). Apply `supabase/crimson.sql` on the existing Supabase project. Printable pouch QRs: `kits/qr/sheet.html`.

## The game in one paragraph

Two dice whose 1-faces are lobsters (🦞, 2–6). Keep rolling to build a turn total, then bank it — one lobster wipes the turn, two lobsters wipe your whole banked score. You can't get on the board until you bank 21+ in a single turn, no one may ever stop on exactly 69, and doubles force a re-roll (4 and 12 are *always* doubles, so the app auto-forces those). First to bank 101+ becomes the leader; the dice keep going around the table and the game ends the moment they'd return to the current leader — ties with the leader are illegal, and every lead change gives everyone else one more turn. Winner collects stake × point-gap from each opponent; anyone finishing on 0 pays double.

## Stack

Single self-contained `index.html` (vanilla JS, no build step, no framework). Installable PWA (`manifest.webmanifest`, `sw.js` — network-first HTML so updates land immediately, cache-first assets for offline). Local-first: game state, history, and series ledgers persist in `localStorage` and the game never waits on the network.

Optional **crew sync** adds a Supabase backend (`supabase/*.sql`): finished games queue in an outbox and upload when possible, so any phone holding the 4-character crew code sees the shared history and ledger. The scorekeeper's phone also broadcasts live state that watcher phones poll. The `games` ledger is append-only by design — the schema grants `insert`/`select` to anon and deliberately defines no update or delete policy, so recorded history cannot be rewritten.

## Develop

```bash
npm install        # test dependencies only (jsdom)
npm run serve      # local server at http://localhost:8321
npm test           # 8 suites, drives the real DOM headlessly via jsdom
npm run deploy     # ship to production (Vercel)
```

`app_icon.jpg` is the icon source of truth; the PNG sizes were generated from it via `sips`. The splash lobster is Google's Noto emoji lobster (Apache 2.0), inlined as SVG.

## Test suites

| file | covers |
|---|---|
| `tests/uitest.mjs` | keypad entry, 21 gate, forced re-rolls on 4/12, undo, fire at 75+, 0-warning |
| `tests/histtest.mjs` | game archive, Previous Games modal, turn-by-turn logs, rematch prefill |
| `tests/endtest.mjs` | endgame: no-tie block, lead steal, leader-sits-out countdown |
| `tests/endtest5.mjs` | the canonical 5-player endgame walkthrough, move for move |
| `tests/seriestest.mjs` | splash, branding, multi-game series ledger + minimal-payment settle |
| `tests/synctest.mjs` | crew sync: outbox queueing, upload, shared history merge |
| `tests/watchtest.mjs` | live watch mode: broadcast state, watcher rendering, endgame dismount |
| `tests/nomath.mjs` | No Math Mode: setup toggle, two-face picker, doubles lock, lobster paths |
| `tests/crimsontest.mjs` | Crimson path/kit detection, elephant copy, lobster `/` unchanged |

## License

MIT — see [LICENSE](LICENSE).
