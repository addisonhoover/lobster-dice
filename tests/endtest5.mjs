import { JSDOM } from 'jsdom';
import fs from 'node:fs';

// Addison's canonical 5-player endgame walkthrough (the "private jet" scenario).
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost:8321/' });
const { window } = dom, { document } = window;

let pass = 0, fail = 0;
const ok = (n, c) => { (c ? pass++ : fail++); console.log((c ? '✓' : '✗ FAIL') + ' ' + n); };
const q = s => document.querySelector(s);
const type = (sel, val) => { const el = q(sel); el.value = val; el.dispatchEvent(new window.Event('input', { bubbles: true })); };
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const chip = v => click(q(`[data-add="${v}"]`));
const chips = (...vs) => vs.forEach(chip);
const bank = () => click(q('#bank'));
const lob = () => click(q('#lob1'));
const who = () => q('.turnhead .who').textContent;
const banner = () => q('.banner') ? q('.banner').textContent : '';

// 5 players around the circle
['A', 'B', 'C', 'D', 'E'].forEach((n, i) => { if (i > 3) click(q('#add')); type(`#players input[data-i="${i}"]`, n); });
click(q('#start'));

// everyone banks 75 on their first turn (11x6+9)
for (let i = 0; i < 5; i++) { chips(11, 11, 11, 11, 11, 11, 9); bank(); }
ok('all five at 75', [...document.querySelectorAll('.score')].every(s => s.textContent.includes('75')));

// A: +26 -> 101, banks -> endgame. Queue: B,C,D,E
ok('A is up', who().includes('A'));
chips(11, 10, 5); bank();
ok('endgame: round 1, beat 101', banner().includes('Final round 1') && banner().includes('beat 101'));
ok('4 turns left (B,C,D,E)', banner().includes('4 turns'));

// B lobsters (stuck at 75)
ok('B up', who().includes('B')); lob();
// C banks 8 -> 83
ok('C up', who().includes('C')); chip(8); bank();
// D: +34 -> 109, banks -> STEAL. Countdown resets NOW: queue = E,A,B,C
ok('D up', who().includes('D')); chips(11, 11, 7, 5); bank();
ok('D took the lead: beat 109', banner().includes('beat 109') && banner().includes('round 2'));
ok('countdown reset: 4 turns left (E,A,B,C)', banner().includes('4 turns'));
ok('E up next — exactly once, no double turn', who().includes('E'));

// E: +20 -> 95, banks (below leader, allowed)
chips(11, 9); bank();
ok('after E: A up (B,C queued behind, not before)', who().includes('A'));
ok('3 turns left', banner().includes('3 turns'));

// A: +22 -> 123, banks -> STEAL again. Queue resets: B,C,D,E
chips(11, 11); bank();
ok('A retook the lead: beat 123', banner().includes('beat 123') && banner().includes('round 3'));
ok('4 turns left (B,C,D,E)', banner().includes('4 turns'));

// B, C, D, E all fail -> dice would return to A -> game over
ok('B up', who().includes('B')); lob();
ok('C up', who().includes('C')); lob();
ok('D up', who().includes('D')); lob();
ok('E up', who().includes('E')); lob();
ok('game over', q('.stand.win') !== null);
ok('A wins at 123', q('.stand.win').textContent.includes('A') && q('.stand.win').textContent.includes('123'));
const ranks = [...document.querySelectorAll('.stand')].map(s => s.textContent);
ok('D second at 109', ranks[1].includes('D') && ranks[1].includes('109'));
ok('E third at 95', ranks[2].includes('E') && ranks[2].includes('95'));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
