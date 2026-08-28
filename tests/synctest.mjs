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
const ancientGame = {
  id: 'aaaaaaaa-0000-4000-8000-00000000000a',
  played_at: new Date(Date.now() - 3 * 86400e3).toISOString(),
  stake: 1,
  players: [{ name: 'MarchGuy', banked: 101, busts: 0, dubs: 0, biggest: 50, log: [] },
            { name: 'Forgotten', banked: 20, busts: 0, dubs: 0, biggest: 20, log: [] }]
};
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
  if (u.includes('/rest/v1/games')) return res(200, [cloudGame, ancientGame]);
  return res(404, {});
};
window.confirm = () => true;
window.alert = () => {};

// ---- the always-on code + the ✈️ SHARE modal ----
// (boot's provisioning attempt ran before the mock network existed — the share
// modal's retry path provisions on open, which is the same self-healing users get)
click(q('#shareBtn'));
await sleep(120);
const autoCrew = JSON.parse(window.localStorage.getItem('lobsterDice.crew') || 'null');
ok('code auto-provisioned (no create step)', autoCrew && /^[A-Z0-9]{4}$/.test(autoCrew.code));
ok('share modal: app-share on top, code box, watch field — no create/leave/share-code buttons',
  !!q('#m_shareapp') && !!q('#m_codebox') && !!q('#m_crewjoin') && !q('#m_crewnew') && !q('#m_crewleave') && !q('#m_sharecode'));
ok('app-share sits above the code box', q('.modal').innerHTML.indexOf('m_shareapp') < q('.modal').innerHTML.indexOf('m_codebox'));
ok('code shown big', q('.crewcode-big').textContent === autoCrew.code);
ok('watch field starts empty with dash placeholder', q('#crewcode').value === '' && q('#crewcode').placeholder === '- - - -');
ok('modal has an X close button', !!q('.mx'));
let shared=null;
window.navigator.share = async (d) => { shared = d; };
click(q('#m_shareapp'));
await sleep(20);
ok('share sheet gets the app link', shared && shared.url === 'http://localhost:8321/' && shared.text.includes('Home Screen'));
shared=null;
click(q('#m_codebox'));
await sleep(20);
ok('tapping the code box shares code + watch link', shared && shared.text.includes(autoCrew.code) && shared.url.includes('watch='+autoCrew.code));
q('#crewcode').value='claw';
click(q('#m_crewjoin'));   // "Watch" — validates then navigates; never hijacks your own code
await sleep(60);
const crewAfter = JSON.parse(window.localStorage.getItem('lobsterDice.crew') || 'null');
ok('watching another code does not replace your own', crewAfter && crewAfter.code === autoCrew.code);
click(q('.mx'));
ok('X closes the modal', !q('.modal'));

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
ok('tonight ledger shown', t.includes('Tonight'));
ok('ledger nets include tonight remote players', t.includes('Pal'));
ok('ancient game excluded from tonight ledger but kept in history', !t.split('Tonight')[1].split('game')[0].includes('MarchGuy') && t.includes('MarchGuy'));
ok('local + cloud = 3 games listed', document.querySelectorAll('.histrow').length === 3);

// ---- cloud game detail opens ----
click(document.querySelectorAll('.histrow')[0]);
ok('detail modal renders for merged game', document.body.textContent.includes('Turn-by-turn') || document.body.textContent.includes('Standings'));
click(q('#m_back'));

// ---- the code is permanent: still there after everything ----
const finalCrew = JSON.parse(window.localStorage.getItem('lobsterDice.crew') || 'null');
ok('always-on code survives the session', finalCrew && finalCrew.code === autoCrew.code);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
