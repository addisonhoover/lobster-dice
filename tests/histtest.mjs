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

// --- setup & start a 2p game ---
type('#players input[data-i="0"]', 'Addison');
type('#players input[data-i="1"]', 'Kelsey');
click(q('#start'));
ok('game started', !!q('.rollchips'));

// --- Addison: 7+9+9 = 25, bank ---
click(q('[data-add="7"]'));
click(q('[data-add="9"]')); click(q('[data-add="9"]'));
ok('accrual 25 shown', q('.accrual .big').textContent.startsWith('25'));
click(q('#bank'));
ok('Addison banked 25', document.body.textContent.includes('Addison banked 25'));

// --- Kelsey: lobster ---
click(q('#lob1'));

// --- end early via menu -> archives the game ---
click(q('#menu'));
click(q('#m_finish'));
ok('end screen', document.body.textContent.includes('wins!'));
const hist = JSON.parse(window.localStorage.getItem('lobsterDice.history') || '[]');
ok('game archived to history', hist.length === 1 && hist[0].players[0].banked === 25);
ok('archive keeps turn log', hist[0].players[0].log[0].t === 'bank' && hist[0].players[0].log[0].adds.join('+') === '7+9+9');

// --- open Previous Games from the END screen ---
click(q('#histBtn'));
ok('history modal opens', document.body.textContent.includes('Previous games'));
ok('history row shows winner', !!q('.histrow') && q('.histrow').textContent.includes('Addison') && q('.histrow').textContent.includes('25'));

// --- drill into the game record ---
click(q('.histrow'));
const t = document.body.textContent;
ok('detail: standings', t.includes('Standings') && t.includes('Kelsey'));
ok('detail: settle-up (zero doubler $50)', t.includes('Settle-up') && t.includes('$50'));
ok('detail: turn-by-turn breakdown', t.includes('banked 25 (7+9+9)'));
click(q('#m_back'));
ok('back to list works', document.body.textContent.includes('Previous games'));
click(q('#m_close'));

// --- new game; history survives; rematch prefill ---
click(q('#again'));
ok('back at setup', !!q('#start'));
ok('rematch: names prefilled', q('#players input[data-i="0"]').value === 'Addison' && q('#players input[data-i="1"]').value === 'Kelsey');
ok('rematch hint shown', document.querySelector('.hint').textContent.includes('Same crew'));
type('#players input[data-i="0"]', 'Dave');
type('#players input[data-i="1"]', 'Ben');
click(q('#start'));
click(q('[data-add="11"]')); click(q('[data-add="11"]')); // 22, bankable
click(q('#bank'));
click(q('#menu')); click(q('#m_finish'));
const hist2 = JSON.parse(window.localStorage.getItem('lobsterDice.history') || '[]');
ok('second game appended (history=2)', hist2.length === 2 && hist2[1].players[0].name === 'Dave');

// --- rules modal opens from setup screen too (router fix) ---
click(q('#again'));
click(q('#rulesBtn'));
ok('rules modal opens on setup screen', document.body.textContent.includes('The 21 gate'));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
