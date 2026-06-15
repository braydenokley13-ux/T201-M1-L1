# Cap Crash — Bow Sports Capital (Track 201)

A standalone, classroom-ready **sports front-office operating simulation** for
**7th–8th graders (Track 201)**. Students play a General Manager who must rebuild
a pro basketball roster under a crashed salary cap, survive a trade-deadline
pressure moment, submit a strategy, and defend it in a boardroom memo.

> This is a single, self-contained simulation. There is no shared backend,
> portal, or database — everything runs in the browser with no build step.

## How to run it

It's plain HTML/CSS/JS. Just open `index.html` in any modern browser
(or serve the folder with any static server, e.g. `python3 -m http.server`).
No install, no accounts, no network required.

## The student flow

1. **Mission Briefing** (`index.html`) — the situation and the four things to watch.
2. **Role Setup** — enter a GM name and pick a front-office style.
3. **Front Office Dashboard** (`game.html`) — four live metrics + the roster.
4. **Interactive mechanic** — Sign / Cut / Trade players; use cap exceptions.
5. **Live metric feedback** — every move updates the metrics instantly.
6. **Pressure Moment** — a trade-deadline decision (win-now vs. stay-flexible).
7. **Submit Final Strategy** — locks in the plan.
8. **Performance Report** — a Front-Office grade, season result, and claim code.
9. **Boardroom Memo** — the student writes *why* their strategy works.
10. **Play Again** — full reset.

## The four metrics (no more than 4, each explained on screen)

| Metric | Meaning |
| --- | --- |
| 💰 **Cap Space** | Money left under the $120M cap. *Every dollar has a job.* |
| 🏆 **Projected Wins** | How strong the team projects to be (out of 82). |
| 🤝 **Chemistry** | How well the players fit together (0–100). |
| 🔥 **Clout** | How excited fans, media & sponsors are (0–100). |

**No roster can max all four** — that's the core Track 201 tension. Stacking stars
raises Wins and Clout but drains Cap Space and hurts Chemistry. A cheaper, balanced
team keeps flexibility and chemistry but wins less. There is no perfect answer.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Mission Briefing / landing page |
| `game.html` | The full phased simulation (dashboard + all overlays) |
| `sim-engine.js` | **Pure** simulation math (metrics, pressure, grading). Browser + Node. |
| `game.js` | UI, phase state machine, state persistence, all interactions |
| `players-data.js` | The roster + free-agent pool and cap constants |
| `style.css` | All styling |
| `tests/metrics.test.js` | Lightweight Node sanity tests for the engine |

## Tests

The simulation math lives in `sim-engine.js` as pure functions, so it can be
checked without a browser. There are two no-dependency Node test files:

```bash
node tests/metrics.test.js   # 45 checks — the pure engine math
node tests/dom-smoke.test.js #  8 checks — runs game.js init against a DOM shim
```

`metrics.test.js` verifies: empty/garbage rosters never crash, cap-exception
math, Bird Rights not counting against the cap, the star-stacking chemistry
tradeoff, that an over-cap roster is illegal, that pressure choices push metrics
the right way (and never mutate input), tier ordering, deterministic season
luck, and the portable result shape.

`dom-smoke.test.js` loads the real `game.js` against a tiny hand-rolled DOM shim
(no jsdom), fires `DOMContentLoaded`, builds a roster through the actual
`Sign/Cut/Trade` handlers, toggles cap exceptions, and confirms the dashboard
renders and persists without throwing. **All 53 checks currently pass.**

## Manual QA checklist

There is no browser automation in this repo, so UI behavior is verified by hand.
Open `index.html` and confirm:

- [ ] Briefing → "Enter the Front Office" loads the dashboard.
- [ ] Role setup: blank name defaults to "GM"; a style can be picked.
- [ ] Signing/cutting/trading updates all four metrics live.
- [ ] Cap exceptions (Bird 🦅 / MLE 💰 / Vet Min 📉) behave and respect limits.
- [ ] "Lock Roster" is blocked with a clear hint until the roster is legal
      (10–13 players, under cap, balanced lineup).
- [ ] The Trade Deadline pressure moment appears and applies its tradeoff.
- [ ] "Submit Final Strategy" → Performance Report always appears.
- [ ] "Replay Season" re-rolls the luck-based season result.
- [ ] Boardroom Memo requires a sentence, with tappable sentence-starters.
- [ ] Completion Summary shows; "Copy Summary" works; "Play Again" resets.
- [ ] Reload mid-build → "Continue My Build" restores the roster.
- [ ] Narrow / mobile widths remain usable; no dead ends.

## Future Highway World compatibility

The simulation is fully standalone, but on completion it builds a small,
local result object (`window.BSC_RESULT`, also saved to `localStorage`) shaped
so a future Highway World mission could read it directly:

```js
{
  simulationId: 'bsc-cap-crash-201',
  missionTitle, track: '201', gradeBand: '7-8',
  studentName, role, pressureChoice, strategyType,
  metrics: { capSpace, projectedWins, chemistry, clout },
  score, tier, grade, claimCode, memo, completedAt
}
```

Nothing here calls out to a shared platform — it's just a clean, portable shape.
