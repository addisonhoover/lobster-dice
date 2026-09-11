import { JSDOM } from 'jsdom';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const ok = (n, c) => { (c ? pass++ : fail++); console.log((c ? '✓' : '✗ FAIL') + ' ' + n); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function load(url, before) {
  return new JSDOM(html, {
    runScripts: 'dangerously',
    url,
    beforeParse(window) { if (before) before(window); }
  });
}
const q = (doc, s) => doc.querySelector(s);
const click = (window, el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const type = (window, sel, val) => {
  const el = window.document.querySelector(sel);
  el.value = val;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
};
const chip = (window, v) => click(window, q(window.document, `[data-add="${v}"]`));
const face = (window, col, f) => click(window, q(window.document, `[data-nm-col="${col}"][data-nm-face="${f}"]`));

function startTwo(window, { mulligans = false, noMath = false } = {}) {
  const { document } = window;
  type(window, '#players input[data-i="0"]', 'Addison');
  type(window, '#players input[data-i="1"]', 'Kelsey');
  if (mulligans) click(window, q(document, '#mulliganTog'));
  if (noMath) click(window, q(document, '#noMathTog'));
  click(window, q(document, '#start'));
}

// --- setup toggle: default off, hidden in play, persists ---
{
  const { window } = load('http://localhost:8321/');
  const { document } = window;
  ok('setup shows Mulligans toggle', !!q(document, '#mulliganTog') && q(document, '#mulliganTog').textContent.includes('Mulligans'));
  ok('Mulligans default off', !q(document, '#mulliganTog .sw.on'));
  startTwo(window);
  ok('off: no USE MULLIGAN button', !q(document, '#mulligan'));
  ok('off: undo still present', !!q(document, '#undo'));
  click(window, q(document, '#menu'));
  click(window, q(document, '#m_new'));
  click(window, q(document, '#m_scrap'));
  ok('rematch remembered off', !q(document, '#mulliganTog .sw.on'));
}

{
  const { window } = load('http://localhost:8321/');
  const { document } = window;
  type(window, '#players input[data-i="0"]', 'Addison');
  type(window, '#players input[data-i="1"]', 'Kelsey');
  click(window, q(document, '#mulliganTog'));
  ok('toggle turns on', !!q(document, '#mulliganTog .sw.on'));
  click(window, q(document, '#start'));
  const last = JSON.parse(window.localStorage.getItem('lobsterDice.lastSetup') || '{}');
  ok('setup persist includes mulligans on', last.mulligans === true);
  ok('on: USE MULLIGAN sits under lobster buttons, before undo', (() => {
    const mull = q(document, '#mulligan');
    const undo = q(document, '#undo');
    const lob = q(document, '#lob1');
    return mull && undo && lob &&
      mull.textContent.includes('USE MULLIGAN') &&
      !!(lob.compareDocumentPosition(mull) & window.Node.DOCUMENT_POSITION_FOLLOWING) &&
      !!(mull.compareDocumentPosition(undo) & window.Node.DOCUMENT_POSITION_FOLLOWING);
  })());
  ok('on: grayed before any roll (matches undo-empty)', q(document, '#mulligan').disabled === true && q(document, '#undo').disabled === true);
}

// --- one use per player: clears last roll, then stays gray ---
{
  const { window } = load('http://localhost:8321/');
  const { document } = window;
  startTwo(window, { mulligans: true });
  chip(window, 8);
  ok('after a roll, accrual 8', q(document, '.accrual .big').textContent.startsWith('8'));
  ok('mulligan enabled after a roll', q(document, '#mulligan').disabled === false);
  ok('undo also enabled after a roll', q(document, '#undo').disabled === false);
  click(window, q(document, '#mulligan'));
  ok('mulligan clears the last roll', q(document, '.accrual .big').textContent.startsWith('0'));
  ok('flash says mulligan used', q(document, '.msg').textContent.includes('used their mulligan'));
  ok('gray after use', q(document, '#mulligan').disabled === true);
  chip(window, 7);
  ok('new roll does not revive the button', q(document, '.accrual .big').textContent.startsWith('7') && q(document, '#mulligan').disabled === true);
  const saved = JSON.parse(window.localStorage.getItem('lobsterDice.v2') || '{}');
  ok('spent flag persisted with live game', saved.mulligans === true && saved.players[0].mulliganUsed === true && saved.players[1].mulliganUsed === false);
}

// --- Undo last does not spend the mulligan ---
{
  const { window } = load('http://localhost:8321/');
  const { document } = window;
  startTwo(window, { mulligans: true });
  chip(window, 9);
  click(window, q(document, '#undo'));
  ok('undo clears a roll without spending mulligan', q(document, '.accrual .big').textContent.startsWith('0') && q(document, '#mulligan').disabled === true);
  chip(window, 6);
  ok('mulligan still available after undo', q(document, '#mulligan').disabled === false);
  click(window, q(document, '#mulligan'));
  ok('mulligan then spends the one do-over', q(document, '#mulligan').disabled === true && q(document, '.accrual .big').textContent.startsWith('0'));
}

// --- only the current player; the other still has theirs ---
{
  const { window } = load('http://localhost:8321/');
  const { document } = window;
  startTwo(window, { mulligans: true });
  chip(window, 11); chip(window, 11);
  click(window, q(document, '#mulligan'));
  ok('Addison spent after two-roll undo-last-roll', q(document, '.accrual .big').textContent.startsWith('11') && q(document, '#mulligan').disabled === true);
  chip(window, 11);
  click(window, q(document, '#bank'));
  ok('Kelsey is up with a fresh mulligan', q(document, '.who') && q(document, '.who').textContent.includes('Kelsey'));
  ok('Kelsey button hidden-disabled until she rolls', q(document, '#mulligan') && q(document, '#mulligan').disabled === true);
  chip(window, 5);
  ok('Kelsey can still use her one mulligan', q(document, '#mulligan').disabled === false);
  click(window, q(document, '#mulligan'));
  ok('Kelsey use clears her 5 and grays her button', q(document, '.accrual .big').textContent.startsWith('0') && q(document, '#mulligan').disabled === true);
}

// --- Jackson Mode: same one-use, still hidden when off ---
{
  const { window } = load('http://localhost:8321/');
  const { document } = window;
  startTwo(window, { noMath: true });
  ok('Jackson + mulligans off: no button', !q(document, '#mulligan') && !!q(document, '.nmwrap'));
}

{
  const { window } = load('http://localhost:8321/');
  const { document } = window;
  startTwo(window, { mulligans: true, noMath: true });
  ok('Jackson + mulligans on: button present, gray', !!q(document, '#mulligan') && q(document, '#mulligan').disabled === true && !!q(document, '.nmwrap'));
  face(window, 0, 4); face(window, 1, 5);
  ok('Jackson 4+5 scores 9', q(document, '.accrual .big').textContent.startsWith('9'));
  ok('Jackson mulligan enabled after the pair', q(document, '#mulligan').disabled === false);
  click(window, q(document, '#mulligan'));
  ok('Jackson mulligan clears the pair', q(document, '.accrual .big').textContent.startsWith('0') && q(document, '#mulligan').disabled === true);
}

// --- rematch keeps the toggle ---
{
  const { window } = load('http://localhost:8321/');
  const { document } = window;
  startTwo(window, { mulligans: true });
  click(window, q(document, '#menu'));
  click(window, q(document, '#m_finish'));
  click(window, q(document, '#again'));
  ok('rematch keeps Mulligans on', !!q(document, '#mulliganTog .sw.on'));
}

// --- Watch broadcast includes remaining mulligans ---
{
  const calls = [];
  const { window } = load('http://localhost:8321/', w => {
    w.localStorage.setItem('lobsterDice.crew', JSON.stringify({ code: 'CLAW' }));
    w.fetch = async (url, opts = {}) => {
      calls.push({ u: String(url), method: opts.method || 'GET', body: opts.body });
      return { ok: true, status: 200, json: async () => [] };
    };
  });
  const { document } = window;
  startTwo(window, { mulligans: true });
  chip(window, 8);
  click(window, q(document, '#mulligan'));
  await sleep(1400);
  const livePosts = calls.filter(c => c.u.includes('/rest/v1/live') && c.method === 'POST');
  ok('host broadcasts after mulligan', livePosts.length >= 1);
  const last = JSON.parse(livePosts[livePosts.length - 1].body);
  ok('broadcast says mulligans are on', last.state.mulligans === true);
  ok('Addison no longer has a mulligan', last.state.players[0].mulligan === false);
  ok('Kelsey still has hers', last.state.players[1].mulligan === true);
}

{
  const liveRow = {
    updated_at: new Date().toISOString(),
    state: {
      phase: 'playing', stake: 1, cur: 0, accrual: 8, endgame: null, mulligans: true,
      players: [
        { name: 'Addison', banked: 0, busts: 0, dubs: 0, mulligan: false },
        { name: 'Kelsey', banked: 0, busts: 0, dubs: 0, mulligan: true }
      ]
    }
  };
  const { window } = load('http://localhost:8321/?watch=CLAW', w => {
    w.fetch = async (url) => {
      const u = String(url);
      if (u.includes('/rest/v1/live')) return { ok: true, status: 200, json: async () => [liveRow] };
      return { ok: true, status: 200, json: async () => [] };
    };
  });
  await sleep(120);
  ok('watcher sees spent mulligan', window.document.body.textContent.includes('mulligan used'));
  ok('watcher has no USE MULLIGAN control', !q(window.document, '#mulligan'));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
