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
const sleep = ms => new Promise(r => setTimeout(r, ms));

// splash + branding
ok('splash overlay present on load', !!q('#splash') && q('.sp-title').textContent.includes('Lobster'));
ok('splash: lobster art + lobster-face die', !!q('.sp-lob') && !!q('#lobArt') && !!q('.sp-d2 use'));
ok('new tagline', q('.top .sub').textContent === 'scorepad + stakes tracker');
ok('footer credit v4.1', document.getElementById('foot').textContent.includes('v4.1') && document.getElementById('foot').textContent.includes('addison hoover'));
await sleep(2700);
ok('splash auto-dismisses ~2s', !q('#splash'));

// GAME 1: Addison 25, Kelsey busts on 0 -> zero-doubler $50
type('#players input[data-i="0"]', 'Addison'); type('#players input[data-i="1"]', 'Kelsey');
click(q('#start'));
chip(7); chip(9); chip(9); click(q('#bank'));
click(q('#lob1'));
click(q('#menu')); click(q('#m_finish'));
ok('series card appears (game 1)', [...document.querySelectorAll('.label')].some(l => l.textContent.includes('Series — game 1')));
ok('Addison +$50 (zero doubler)', [...document.querySelectorAll('.liab')].some(l => l.textContent.includes('Addison') && l.textContent.includes('+$50')));
ok('no transfer list on game 1', ![...document.querySelectorAll('.label')].some(l => l.textContent.includes('One payment')));

// GAME 2: rematch. Kelsey wins 30-25 -> nets: Addison +45, Kelsey -45
click(q('#again'));
click(q('#start'));                                   // prefilled crew
chip(7); chip(9); chip(9); click(q('#bank'));         // Addison 25
chip(11); chip(11); chip(8); click(q('#bank'));       // Kelsey 30
click(q('#menu')); click(q('#m_finish'));
ok('series game 2', [...document.querySelectorAll('.label')].some(l => l.textContent.includes('Series — game 2')));
ok('Addison +$45 running', [...document.querySelectorAll('.liab')].some(l => l.textContent.includes('Addison') && l.textContent.includes('+$45')));
ok('Kelsey −$45 running', [...document.querySelectorAll('.liab')].some(l => l.textContent.includes('Kelsey') && l.textContent.includes('−$45')));
ok('minimal settle shown', [...document.querySelectorAll('.label')].some(l => l.textContent.includes('One payment')));
ok('Kelsey → Addison $45', [...document.querySelectorAll('.logline')].some(l => l.textContent.includes('Kelsey → Addison') && l.textContent.includes('$45')));

// GAME 3: different crew -> series auto-resets
click(q('#again'));
type('#players input[data-i="0"]', 'Dave'); type('#players input[data-i="1"]', 'Ben');
click(q('#start'));
chip(11); chip(11); click(q('#bank'));
click(q('#menu')); click(q('#m_finish'));
ok('new crew starts fresh series (game 1)', [...document.querySelectorAll('.label')].some(l => l.textContent.includes('Series — game 1')));
ok('old crew balances gone', ![...document.querySelectorAll('.liab')].some(l => l.textContent.includes('Addison')));

// reset button clears the tab
window.confirm = () => true;
click(q('#resetSeries'));
ok('reset removes series card', ![...document.querySelectorAll('.label')].some(l => l.textContent.includes('Series —')));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
