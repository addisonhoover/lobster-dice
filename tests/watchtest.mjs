import { JSDOM } from 'jsdom';
import fs from 'node:fs';

// Live scoreboard: the scorekeeper's phone broadcasts, watchers at ?watch=CODE
// see a read-only leaderboard. Network mocked on both sides.
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (n, c) => { (c ? pass++ : fail++); console.log((c ? '✓' : '✗ FAIL') + ' ' + n); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- side 1: the scorekeeper broadcasts ----------
{
  const calls = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'http://localhost:8321/',
    beforeParse(window) {
      window.localStorage.setItem('lobsterDice.crew', JSON.stringify({ code: 'CLAW' }));
      window.fetch = async (url, opts = {}) => {
        calls.push({ u: String(url), method: opts.method || 'GET', body: opts.body });
        return { ok: true, status: 200, json: async () => [] };
      };
    }
  });
  const { window } = dom, { document } = window;
  const q = s => document.querySelector(s);
  const type = (sel, val) => { const el = q(sel); el.value = val; el.dispatchEvent(new window.Event('input', { bubbles: true })); };
  const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  type('#players input[data-i="0"]', 'Addison'); type('#players input[data-i="1"]', 'Kelsey');
  click(q('#start'));
  click(q('[data-add="11"]')); click(q('[data-add="11"]'));
  click(q('#bank'));
  await sleep(1400);   // pushLive debounce is 1s
  const livePosts = calls.filter(c => c.u.includes('/rest/v1/live') && c.method === 'POST');
  ok('scorekeeper broadcasts live state', livePosts.length >= 1);
  const last = JSON.parse(livePosts[livePosts.length - 1].body);
  ok('broadcast carries code + players + phase', last.code === 'CLAW' && last.state.phase === 'playing' && last.state.players.length === 2);
  ok('broadcast has banked totals', last.state.players[0].banked === 22);
  ok('share modal: Claw Watch share + watch field', (click(q('#shareBtn')), !!q('#m_sharecode') && !!q('#crewcode') && q('#crewcode').value==='CLAW'));
}

// ---------- side 2: a watcher mid-game ----------
{
  const liveRow = {
    updated_at: new Date().toISOString(),
    state: {
      phase: 'playing', stake: 1, cur: 1, accrual: 18, endgame: null,
      players: [
        { name: 'Addison', banked: 82, busts: 0, dubs: 0 },
        { name: 'Kelsey', banked: 40, busts: 1, dubs: 0 },
        { name: 'Dave', banked: 0, busts: 2, dubs: 1 }
      ]
    }
  };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'http://localhost:8321/?watch=CLAW',
    beforeParse(window) {
      Object.defineProperty(window.navigator, 'wakeLock', { value: { request: async () => { window.__wl = (window.__wl || 0) + 1; return { release() {}, addEventListener() {} }; } } });
      window.fetch = async (url) => {
        const u = String(url);
        if (u.includes('/rest/v1/live')) return { ok: true, status: 200, json: async () => [liveRow] };
        return { ok: true, status: 200, json: async () => [] };
      };
    }
  });
  const { document } = dom.window;
  await sleep(120);
  const t = document.body.textContent;
  ok('watcher sees the live leaderboard', t.includes('Claw Watch CLAW') && t.includes('Addison') && t.includes('82'));
  ok('watcher sees who is rolling + turn total', t.includes('Kelsey is rolling') && t.includes('+18'));
  ok('projection: would-be total shown', t.includes('58'));
  ok('projection: gap context shown', t.includes('24 behind Addison'));
  ok('fire + zero-warning visible to watchers', !!document.querySelector('.score.fire') && !!document.querySelector('.warn0'));
  ok('no input controls for watchers', !document.querySelector('#bank') && !document.querySelector('.rc'));
  ok('live view has a way home', !!document.querySelector('#watchback'));
  ok('watcher screen kept awake during live game', (dom.window.__wl || 0) >= 1);
}

// ---------- side 3: a watcher after the game ends ----------
{
  const endedRow = {
    updated_at: new Date().toISOString(),
    state: {
      phase: 'ended', stake: 1, cur: 0, accrual: 0, endgame: null,
      players: [
        { name: 'Addison', banked: 112, busts: 0, dubs: 0 },
        { name: 'Kelsey', banked: 83, busts: 1, dubs: 0 },
        { name: 'Dave', banked: 0, busts: 2, dubs: 1 }
      ]
    }
  };
  const oldGame = { stake: 1, played_at: new Date().toISOString(), players: endedRow.state.players };
  const staleGame = { stake: 1, played_at: new Date(Date.now() - 3 * 86400e3).toISOString(),
    players: [{ name: 'MarchGuy', banked: 101 }, { name: 'Forgotten', banked: 20 }] };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'http://localhost:8321/?watch=CLAW',
    beforeParse(window) {
      window.fetch = async (url) => {
        const u = String(url);
        if (u.includes('/rest/v1/live')) return { ok: true, status: 200, json: async () => [endedRow] };
        if (u.includes('/rest/v1/games')) return { ok: true, status: 200, json: async () => [oldGame, staleGame] };
        return { ok: true, status: 200, json: async () => [] };
      };
    }
  });
  const { document } = dom.window;
  await sleep(150);
  const t = document.body.textContent;
  ok('watcher sees the winner', t.includes('Addison wins!'));
  ok('dismount: ranked final standings shown', !!document.querySelector('.stand.win') && t.includes('Final standings') && t.includes('#2'));
  ok('dismount: live board gone', !document.querySelector('.sb') && !document.querySelector('#app').textContent.includes('is rolling'));
  ok('watcher sees payouts incl. zero doubler', t.includes('Settle up') && t.includes('ZERO DOUBLER') && t.includes('$224'));
  ok('watcher sees tonight ledger', t.includes('Tonight') && t.includes('1 game'));
  ok('stale games excluded from tonight ledger', !t.includes('MarchGuy'));
}

// ---------- dense board for big tables ----------
{
  const bigRow = {
    updated_at: new Date().toISOString(),
    state: { phase:'playing', stake:1, cur:0, accrual:5, endgame:null,
      players: Array.from({length:8},(_,i)=>({name:'P'+(i+1), banked:i*10, busts:0, dubs:0})) }
  };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'http://localhost:8321/?watch=CLAW',
    beforeParse(window) {
      window.fetch = async (url) => String(url).includes('/rest/v1/live')
        ? { ok:true, status:200, json: async () => [bigRow] }
        : { ok:true, status:200, json: async () => [] };
    }
  });
  await sleep(120);
  const d = dom.window.document;
  ok('8 players get the dense two-column board', !!d.querySelector('.sb.sb-dense') && d.querySelectorAll('.sb-dense .p').length === 8);
}

// ---------- stale "live" data is not presented as live ----------
{
  const staleRow = {
    updated_at: new Date(Date.now() - 7 * 86400e3).toISOString(),
    state: { phase:'playing', stake:1, cur:0, accrual:29, endgame:null,
      players: [{name:'Addison',banked:82},{name:'Kelsey',banked:40}] }
  };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'http://localhost:8321/?watch=CLAW',
    beforeParse(window) {
      window.fetch = async (url) => String(url).includes('/rest/v1/live')
        ? { ok:true, status:200, json: async () => [staleRow] }
        : { ok:true, status:200, json: async () => [] };
    }
  });
  await sleep(120);
  const t2 = dom.window.document.querySelector('#app').textContent;
  ok('stale board says idle, not LIVE', t2.includes('idle') && !t2.includes('LIVE'));
  ok('timestamp humanized (7d ago, not raw seconds)', t2.includes('7d ago') && !t2.includes('604800'));
  ok('no phantom "is rolling" on stale data', !t2.includes('is rolling') && t2.includes('isn’t broadcasting'));
}

// ---------- waiting state ----------
{
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'http://localhost:8321/?watch=ZZZZ',
    beforeParse(window) { window.fetch = async () => ({ ok: true, status: 200, json: async () => [] }); }
  });
  await sleep(100);
  ok('empty crew shows waiting screen', dom.window.document.body.textContent.includes('Waiting for the table'));
  ok('waiting screen has a way home', !!dom.window.document.querySelector('#watchback'));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
