# Lobster Dice — Scorepad App Spec

Project brief for a Claude Code project. Goal: a simple digital scorepad that replaces pen, paper, and mental math for the dice game "Lobster Dice." Players enter names, log each turn's result, and the app enforces all rules, tracks scores, and produces an end-of-game summary including what's owed.

---

## 1. The Game

### Equipment
- Two standard six-sided dice, except the **1-face on each die is replaced with a lobster symbol**.
- Each die therefore shows: 🦞, 2, 3, 4, 5, 6.

### Basic Turn Flow
1. On your turn, you roll both dice. You may keep rolling as long as you survive, accumulating points within the turn ("turn accrual").
2. When you choose to stop, your turn accrual is **banked** (added to your permanent score) and the dice pass to the next player.

### Lobster Rules (bust conditions)
- **One lobster** (either die): turn ends immediately. You lose all points accrued **this turn**. Your banked score is untouched.
- **Two lobsters** (both dice): turn ends immediately AND your **entire banked score resets to zero**.

### Doubles Rule
- Rolling doubles of any number (2-2 through 6-6) scores the pips normally, **but forces you to roll again** — you may not bank on a double, even if you want to.

### The 21 Gate ("getting on the board")
- A player **cannot bank any points until they clear 21 or more in a single turn**.
- Until a player has banked for the first time, every turn is all-or-nothing: keep rolling until turn accrual ≥ 21 (then they may stop and bank) or bust.
- Once a player has banked once, normal banking rules apply for the rest of the game (any positive accrual can be banked).
- Clarify in implementation: after a double-lobster reset to zero, the player **must re-clear the 21 gate** to bank again. (This is the assumed rule — flag as confirmable.)

### The 69 Rule (house rule)
- **No one may ever bank/stop while their total would be exactly 69.**
- If stopping would leave a player at 69, they are forced to roll again until stopping would leave them on any number other than 69.
- Note: this applies to the banked total the player would end the turn with. (Minimum next roll is 4, so one forced roll always moves them off 69 or busts them.)

### Endgame: Playing to 101
- First player to bank a total of **101 or more** may end the game — or may keep rolling to extend their margin before banking (at normal risk).
- Once the leader ends above 101, **every other player gets exactly one final turn** ("last licks") to close the gap or surpass the leader's total and steal the win.
- Highest final total wins.

---

## 2. Key Probabilities (for in-app hints / stats)

- Bust chance per roll (any lobster): **11/36 ≈ 30.6%**
- Exactly one lobster: 10/36 ≈ 27.8%
- Double lobster: **1/36 ≈ 2.8%**
- Safe roll: 25/36 ≈ 69.4%
- Doubles (non-lobster): 5/36 ≈ 13.9%
- Expected pips on a safe roll: 8 (each die uniform 2–6, mean 4)
- Survival over n rolls: (25/36)^n → 1: 69.4%, 2: 48.2%, 3: 33.5%, 4: 23.3%
- Solo-optimal stop threshold: roll while turn accrual < ~16–17, then bank (position-adjusted in real play)

---

## 3. App Requirements

### Setup
- Enter 2–8+ player names (typical game: 4–8).
- Set turn order (drag to reorder or randomize).
- Optional: set stakes for the payout calculation (see §4).

### Turn Logging (core loop)
The app should make logging a turn dead simple. Two viable input models — pick one or support both:

**Model A — roll-by-roll:** log each roll's two dice values (or tap "lobster" / "double lobster"). App computes accrual, enforces forced rolls (doubles, 69 rule, 21 gate), and offers a Bank button only when banking is legal.

**Model B — turn summary:** log the turn outcome in one entry: "banked N points," "lobstered (lost turn)," or "double lobstered (reset to zero)." Faster, less enforcement.

Recommended: Model A, because rule enforcement is the whole value ("it does the rest").

### Rule Enforcement the App Must Handle
- Block banking until the 21 gate is cleared (per player, and re-blocked after a double-lobster reset if that interpretation is confirmed).
- Block banking on a doubles roll (force "roll again" state).
- Block banking when the resulting total would be exactly 69.
- Apply single-lobster (wipe turn accrual) and double-lobster (wipe banked score) automatically.
- Detect when a player crosses 101 and offer: "End game" or "Keep rolling."
- When the game is ended above 101, automatically cycle exactly one last turn per remaining player, then finalize.

### Live Display
- All players' banked scores, always visible (the game is played with full information).
- Current player highlighted, current turn accrual shown live.
- Gap-to-leader for each player.
- Whose turn is next.

### Nice-to-Have (v2)
- Risk hints: bust odds, "you need X in ~Y turns" chase math, position-adjusted stop suggestion.
- Turn history / undo (essential for mis-taps, arguably v1).
- Stats across games: biggest turn, double-lobster count, longest safe streak.

### End-of-Game Summary
- Final standings with totals.
- Margin of victory and each player's gap.
- Payouts owed (see §4).
- Fun stats for the table: busts, double lobsters, biggest banked turn.

---

## 4. Payouts

**Structure: per-point stakes, winner collects from every opponent.**

- At setup, the group selects a **stake value per point**. Standard options: $0.25, $0.50, $1, $2, $5, $10, $100, $1,000 per point (support custom values too).
- At game end, **each opponent pays the winner: stake × (winner's total − that opponent's total)**. Every loser pays on their own gap.
- **Zero doubler:** if an opponent finishes the game **stuck on 0** (never banked, or reset by double lobsters and never recovered), the stake value **doubles for that opponent's payout**. Implementation assumption: the doubling applies per-opponent (only the player(s) on 0 pay double), not to the whole table — confirm with the circle.
  - Note the brutal math: at $1/point, a player stuck on 0 against a winner at 108 owes 108 × $2 = **$216**.

### App behavior
- Stake selector at game setup (preset chips + custom input).
- End-of-game ledger computed automatically: "Alice owes Dave $34. Ben owes Dave $216 (ZERO DOUBLER)."
- Show the zero-doubler flag prominently on the ledger — it's the dramatic moment of the settle-up.
- Nice-to-have: running "current liability" display during the game (what each player would owe if it ended right now) — adds stakes-awareness to banking decisions, but make it toggleable since some tables may find it stressful.

---

## 5. Suggested Tech Shape

- Single-page web app (React or plain HTML/JS), mobile-first — this lives on a phone at the table.
- No backend needed for v1; persist in-progress game to localStorage so an accidental refresh doesn't kill the game.
- One shared device passed around or held by a scorekeeper (matches how the paper scorepad worked).

---

## 6. Edge Cases to Decide During Build

1. Double lobster before ever clearing the 21 gate — no effect beyond losing the turn (score already 0)? Assumed yes.
2. After a double-lobster reset, does the 21 gate re-apply? Assumed yes; confirm with the table.
3. 69 rule vs. the 21 gate: a first-time banker cannot stop on a turn total that lands them at exactly 69 (e.g., accrual of exactly 69). Forced to roll.
4. 69 rule in the endgame/last licks: still applies. A chaser cannot finish on 69.
5. Leader keeps rolling past 101 and single-lobsters: they keep their banked total (still ≥101 if already banked, or they fall back to their pre-turn bank if the 101 was only accrual — clarify whether "reaching 101" means banked or live accrual). Assumed: 101 must be **banked** to end the game.
6. Tie at game end: shared win, or sudden-death turn? House call.
