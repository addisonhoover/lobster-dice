import { JSDOM } from 'jsdom';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost:8321/' });
const { window } = dom, { document } = window;

let pass = 0, fail = 0;
const ok = (n, c) => { (c ? pass++ : fail++); console.log((c ? '✓' : '✗ FAIL') + ' ' + n); };
const q = s => document.querySelector(s);
const type = (sel, val) => { const el = q(sel); el.value = val; el.dispatchEvent(new window.Event('input', { bubbles: true })); };
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const chip = v => click(q(`[data-add="${v}"]`));

// setup — Randomize gone, Other# gone after start
ok('randomize button removed', !q('#rand'));
type('#players input[data-i="0"]', 'Addison');
type('#players input[data-i="1"]', 'Kelsey');
click(q('#start'));
ok('game started', !!q('.rollchips'));
ok('Other# input removed', !q('#pts') && !q('#addbtn'));
ok('keypad is 3-col grid (9 chips)', document.querySelectorAll('.rc').length === 9);

// green + cue
ok('no green + at accrual 0', !q('.plus'));
chip(7);
ok('green + cue shown mid-roll', !!q('.plus') && q('.plus').textContent === '+');
ok('accrual 7', q('.accrual .big').textContent.startsWith('7'));

// 4 forces re-roll (only ever 2+2)
chip(4);
ok('accrual 11 after +4', q('.accrual .big').textContent.startsWith('11'));
ok('4 forces re-roll: bank disabled', q('#bank').disabled === true);
ok('4 warning shown', q('.msg').textContent.includes('double 2s') && q('.gate').textContent.includes('double 2s'));
ok('lobster still enabled during forced roll', q('#lob1').disabled !== true);

// undo the 4
click(q('#undo'));
ok('undo removes the 4', q('.accrual .big').textContent.startsWith('7'));

// 12 forces re-roll too (only ever 6+6)
chip(12);
ok('12 blocks bank', q('#bank').disabled === true);
ok('12 warning says double 6s', q('.msg').textContent.includes('double 6s'));
chip(5);
ok('roll after 12 clears block', q('.gate') === null || !q('.gate').textContent.includes('double'));
click(q('#undo')); click(q('#undo'));
ok('undos back to 7', q('.accrual .big').textContent.startsWith('7'));

// 21 gate then bank
chip(8); chip(9);
ok('accrual 24', q('.accrual .big').textContent.startsWith('24'));
ok('bank enabled at 24 (gate cleared, no mustRoll)', q('#bank').disabled === false);
chip(4);
ok('bank blocked again after 4', q('#bank').disabled === true);
chip(6);
ok('bank re-enabled after follow-up roll', q('#bank').disabled === false);
click(q('#bank'));
ok('banked 34', q('.msg').textContent.includes('Addison banked 34'));

// Kelsey: 4 as last roll, then lobster (forced roll came up lobster) — legal
chip(4);
click(q('#lob1'));
ok('lobster allowed on forced roll; Kelsey turn ended', q('.msg').textContent.includes('Kelsey loses 4'));
ok('mustRoll cleared for next player', q('#bank').disabled === true /* 0 accrual */ && !q('.gate'));

// drive Addison to 75+ -> fire effect (34 banked + 41 = 75)
chip(12); chip(12); chip(12); chip(5);
click(q('#bank'));
ok('Addison banked to 75', q('.msg').textContent.includes('75'));
ok('fire class on 75+ score', !!q('.score.fire'));
ok('flame emoji shown', q('.score.fire').textContent.includes('🔥'));
ok('sub-75 player not on fire', document.querySelectorAll('.score.fire').length === 1);
ok('warning shown for player on 0 while someone burns', !!q('.warn0'));

ok('reorder button present', q('#editOrder') && q('#editOrder').textContent.includes('Reorder'));

click(q('#rulesBtn'));
ok('rules mention auto-forced 4 and 12', q('.modal .rul').textContent.includes('always double 2s') && q('.modal .rul').textContent.includes('double 6s'));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
