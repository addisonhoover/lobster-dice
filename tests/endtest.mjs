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

// 3 players
type('#players input[data-i="0"]', 'A'); type('#players input[data-i="1"]', 'B'); type('#players input[data-i="2"]', 'C');
click(q('#start'));

// A banks 105 -> becomes leader, endgame round 1, queue = B,C
for (let i = 0; i < 9; i++) chip(11); chip(6);   // 105
click(q('#bank'));
ok('endgame triggered, banner round 1', q('.banner').textContent.includes('Final round 1'));
ok('banner: beat 105', q('.banner').textContent.includes('beat 105'));
ok('banner: no-ties wording', q('.banner').textContent.includes('no ties'));
ok('2 turns left (B,C)', q('.banner').textContent.includes('2 turns'));

// B builds to exactly 105 -> bank BLOCKED (no ties), then +5 -> 110 allowed
for (let i = 0; i < 9; i++) chip(11); chip(6);   // 105
ok('tie bank blocked at 105', q('#bank').disabled === true);
ok('no-tie reason shown', q('.gate').textContent.includes('no ties'));
chip(5);                                          // 110
ok('bank allowed at 110', q('#bank').disabled === false);
click(q('#bank'));

// B stole the lead -> countdown resets IMMEDIATELY: queue = C,A (leader sits out)
ok('round 2 started on the steal', q('.banner').textContent.includes('Final round 2'));
ok('beat 110 now', q('.banner').textContent.includes('beat 110'));
ok('leader sits out: only 2 turns', q('.banner').textContent.includes('2 turns'));
ok('C is up first in round 2', q('.turnhead .who').textContent.includes('C'));

// C lobsters, A lobsters -> dice would return to B -> game over, B wins 110
click(q('#lob1'));
ok('A up last, 1 turn left', q('.turnhead .who').textContent.includes('A') && q('.banner').textContent.includes('1 turn'));
click(q('#lob1'));
ok('game over', q('.stand.win') !== null);
ok('B wins at 110', q('.stand.win').textContent.includes('B') && q('.stand.win').textContent.includes('110'));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
