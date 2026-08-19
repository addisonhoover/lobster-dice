import { JSDOM } from 'jsdom';
import fs from 'node:fs';

// Crew sync: join/create codes, outbox upload, cloud-merged history, all-time ledger.
// The network is mocked — this verifies the app's side of the contract.
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

// ---- mock the network ----
const calls = [];
const cloudGame = {
  id: 'cccccccc-0000-4000-8000-000000000001',
  played_at: new Date().toISOString(),
  stake: 1,
  players: [
    { name: 'Remote', banked: 101, busts: 0, dubs: 0, biggest: 50, log: [] },
    { name: 'Pal', banked: 50, busts: 1, dubs: 0, biggest: 30, log: [] }
  ]
};
window.fetch = async (url, opts = {}) => {
  const u = String(url); calls.push({ u, method: opts.method || 'GET' });
  const res = (status, body) => ({ ok: status < 300, status, json: async () => body });
  if (u.includes('/rest/v1/tables') && opts.method === 'POST') return res(201, []);
  if (u.includes('/rest/v1/tables')) return res(200, [{ code: 'CLAW' }]);
  if (u.includes('/rest/v1/games') && opts.method === 'POST') return res(201, []);
  if (u.includes('/rest/v1/games')) return res(200, [cloudGame]);
  return res(404, {});
};
window.confirm = () => true;
window.alert = () => {};

// ---- join a crew from the history modal ----
click(q('#histBtn'));
ok('history modal offers crew UI (create + join form)', !!q('#m_crewnew') && !!q('#crewcode') && !!q('#m_crewjoin'));
q('#crewcode').value='claw';
click(q('#m_crewjoin'));
await sleep(50);
const crewStored = JSON.parse(window.localStorage.getItem('lobsterDice.crew') || 'null');
ok('joined crew CLAW (code uppercased)', crewStored && crewStored.code === 'CLAW');
ok('crew code shown big with leave option', !!q('.crewcode-big') && q('.crewcode-big').textContent==='CLAW' && !!q('#m_crewleave'));
click(q('#m_close'));

// ---- play a game; it should upload automatically ----
type('#players input[data-i="0"]', 'Addison'); type('#players input[data-i="1"]', 'Kelsey');
click(q('#start'));
chip(11); chip(11); click(q('#bank'));
click(q('#lob1'));
click(q('#menu')); click(q('#m_finish'));
await sleep(80);
const hist = JSON.parse(window.localStorage.getItem('lobsterDice.history') || '[]');
ok('archived game has a sync id', hist.length === 1 && typeof hist[0].id === 'string' && hist[0].id.length > 10);
ok('outbox drained after upload', JSON.parse(window.localStorage.getItem('lobsterDice.outbox') || '[]').length === 0);
ok('game POSTed to Supabase', calls.some(c => c.u.includes('/rest/v1/games') && c.method === 'POST'));

// ---- history now merges cloud games from other phones ----
click(q('#histBtn'));
await sleep(60);
const t = document.body.textContent;
ok('cloud game appears in merged history', t.includes('Remote'));
ok('all-time crew ledger shown', t.includes('All-time crew ledger'));
ok('ledger nets include remote players', t.includes('Pal'));
ok('local + cloud = 2 games listed', document.querySelectorAll('.histrow').length === 2);

// ---- cloud game detail opens ----
click(document.querySelectorAll('.histrow')[0]);
ok('detail modal renders for merged game', document.body.textContent.includes('Turn-by-turn') || document.body.textContent.includes('Standings'));
click(q('#m_back'));

// ---- leave crew ----
click(q('#m_crewleave'));
ok('left crew', window.localStorage.getItem('lobsterDice.crew') === null);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
