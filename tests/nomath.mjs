import { JSDOM } from 'jsdom';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost:8321/' });
const { window } = dom, { document } = window;
window.confirm = () => true;

let pass = 0, fail = 0;
const ok = (n, c) => { (c ? pass++ : fail++); console.log((c ? '✓' : '✗ FAIL') + ' ' + n); };
const q = s => document.querySelector(s);
const type = (sel, val) => { const el = q(sel); el.value = val; el.dispatchEvent(new window.Event('input', { bubbles: true })); };
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const face = (col, f) => click(q(`[data-nm-col="${col}"][data-nm-face="${f}"]`));

ok('setup shows No Math Mode toggle', !!q('#noMathTog') && q('#noMathTog').textContent.includes('No Math Mode'));
ok('No Math Mode default off', !q('#noMathTog .sw.on'));

type('#players input[data-i="0"]', 'Addison');
type('#players input[data-i="1"]', 'Kelsey');
click(q('#start'));
ok('off: still the adder keypad', !!q('.rollchips') && !q('.nmwrap'));
ok('off: 6 does not lock (adder cannot see 3+3)', (() => {
  click(q('[data-add="6"]'));
  const locked = q('#bank').disabled === true && q('.msg').textContent.includes('double');
  click(q('#undo'));
  return !locked && q('.accrual .big').textContent.startsWith('0');
})());

click(q('#menu'));
click(q('#m_new'));
ok('back at setup after scrap', !!q('#start') && !!q('#noMathTog'));
ok('rematch remembered off', !q('#noMathTog .sw.on'));

click(q('#noMathTog'));
ok('toggle turns on', !!q('#noMathTog .sw.on'));
click(q('#start'));
ok('on: two-column face picker', !!q('.nmwrap') && !q('.rollchips'));
ok('each column has lobster + 2–6', document.querySelectorAll('[data-nm-col="0"]').length === 6 && document.querySelectorAll('[data-nm-col="1"]').length === 6);
ok('lobster buttons still there', !!q('#lob1') && !!q('#lob2'));

face(0, 4);
ok('one face selected, nothing scored yet', q('.accrual .big').textContent.startsWith('0') && q('[data-nm-col="0"][data-nm-face="4"]').classList.contains('on'));
face(1, 5);
ok('4+5 feeds adder as 9', q('.accrual .big').textContent.startsWith('9') && q('.msg').textContent.includes('turn total 9'));
ok('mixed numbers do not lock', !q('.gate') && q('#bank').disabled === true); // gate, not double
ok('faces reset after both entered', !q('.nmwrap .rc.on'));

face(0, 3); face(1, 3);
ok('3+3 scores 6', q('.accrual .big').textContent.startsWith('15'));
ok('3+3 locks bank via mustRoll', q('#bank').disabled === true && q('.gate').textContent.includes('double 3s'));
ok('3+3 warning uses existing double copy', q('.msg').textContent.includes('double 3s'));

face(0, 2); face(1, 5);
ok('follow-up 2+5 clears the lock', q('.accrual .big').textContent.startsWith('22') && q('#bank').disabled === false);

face(0, 5); face(1, 5);
ok('5+5 locks as double 5s', q('#bank').disabled === true && q('.msg').textContent.includes('double 5s'));
face(0, 4); face(1, 4);
ok('4+4 locks as double 4s', q('.msg').textContent.includes('double 4s'));
face(0, 2); face(1, 2);
ok('2+2 locks as double 2s (same as adder 4)', q('.msg').textContent.includes('double 2s'));
face(0, 6); face(1, 6);
ok('6+6 locks as double 6s (same as adder 12)', q('.msg').textContent.includes('double 6s'));
face(0, 3); face(1, 4);
ok('follow-up 3+4 unlocks', q('#bank').disabled === false);
click(q('#bank'));
ok('banked through existing path', q('.msg').textContent.includes('Addison banked'));

face(0, 1); face(1, 4);
ok('lobster + N uses single-lobster path', q('.msg').textContent.includes('Lobster') && q('.msg').textContent.includes('Kelsey'));
ok('single lobster does not wipe the bank', !q('.msg').textContent.includes('wiped'));

face(0, 1); face(1, 1);
ok('lobster + lobster uses double-lobster path', q('.msg').textContent.includes('Double lobster') && q('.msg').textContent.includes('wiped to 0'));

click(q('#menu'));
click(q('#m_finish'));
click(q('#again'));
ok('rematch keeps No Math Mode on', !!q('#noMathTog .sw.on'));
const last = JSON.parse(window.localStorage.getItem('lobsterDice.lastSetup') || '{}');
ok('setup persist includes noMath', last.noMath === true);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
