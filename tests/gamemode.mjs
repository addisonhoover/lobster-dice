import { JSDOM } from 'jsdom';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const eleSvg = fs.readFileSync(new URL('../crimson/elephant-white.svg', import.meta.url), 'utf8');
const pipSvg = fs.readFileSync(new URL('../renegade/pip.svg', import.meta.url), 'utf8');
const markSvg = fs.readFileSync(new URL('../renegade/header-mark.svg', import.meta.url), 'utf8');

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

ok('elephant SVG is a white-fill vector', eleSvg.includes('fill="#ffffff"') && eleSvg.includes('<path') && !eleSvg.includes('elephant-white.png'));
ok('app chrome points at the SVG not the PNG', html.includes('crimson/elephant-white.svg') && (html.match(/elephant-white\.png/g)||[]).length===0);
ok('renegade pip SVG is a garnet spearhead', pipSvg.includes('fill="#782F40"') && pipSvg.includes('<path') && !pipSvg.toLowerCase().includes('seminole'));
ok('renegade header mark SVG is gold', markSvg.includes('fill="#CEB888"') && markSvg.includes('<path'));
ok('app has renegade splash + icons', html.includes('renegade/splash-head.png') && html.includes('renegade/header-mark.svg') && html.includes('renegade/pip.svg'));
ok('copy never uses school trademarks', !html.toLowerCase().includes('seminole') && !html.toLowerCase().includes('florida state'));

// --- setup shows Jackson Mode + Game Mode, default Lobster ---
{
  const { window } = load('http://localhost:8321/');
  const { document } = window;
  ok('setup shows Jackson Mode', !!q(document, '#noMathTog') && q(document, '#noMathTog').textContent.includes('Jackson Mode'));
  ok('setup shows Game Mode under Jackson', (() => {
    const cards = [...document.querySelectorAll('.card')];
    const j = cards.findIndex(c => c.querySelector('#noMathTog'));
    const g = cards.findIndex(c => c.querySelector('#gameModeTog'));
    return j >= 0 && g === j + 1;
  })());
  ok('default skin is lobster', window.SKIN && window.SKIN.id === 'lobster');
  ok('default title is Lobster Dice', document.title.includes('Lobster Dice') && !document.title.includes('Crimson'));
  ok('html is not crimson or renegade', !document.documentElement.classList.contains('skin-crimson') &&
    !document.documentElement.classList.contains('skin-renegade'));
  ok('header is lobster', q(document, '.top h1').textContent === 'Lobster Dice' && q(document, '.top .logo').textContent.includes('🦞'));
  ok('footer notes Game Mode v4.11', document.getElementById('foot').textContent.includes('v4.11') && document.getElementById('foot').textContent.includes('Game Mode'));
  ok('lobster splash still present', !!q(document, '#splash') && !!q(document, '.sp-title-lob') && q(document, '.sp-title-lob').textContent.includes('Lobster'));
  ok('setup has no Watch code card', !q(document, '#watchCard'));
  ok('Start game sits above the options', (() => {
    const start = q(document, '#start');
    const liab = q(document, '#liabTog');
    const stakes = q(document, '#stakes');
    return start && liab && stakes &&
      !!(stakes.compareDocumentPosition(start) & window.Node.DOCUMENT_POSITION_FOLLOWING) &&
      !!(start.compareDocumentPosition(liab) & window.Node.DOCUMENT_POSITION_FOLLOWING);
  })());
}

// --- picker lists both skins; same skin just closes ---
{
  const { window } = load('http://localhost:8321/');
  const { document } = window;
  click(window, q(document, '#gameModeTog'));
  ok('picker opens', !!q(document, '#m_gok') && document.body.textContent.includes('Pick the table'));
  const rows = [...document.querySelectorAll('[data-skin]')];
  ok('picker lists Lobster + Crimson + Renegade', rows.length === 3 &&
    rows[0].dataset.skin === 'lobster' && rows[0].textContent.includes('Lobster Dice') && rows[0].textContent.includes('🦞') &&
    rows[1].dataset.skin === 'crimson' && rows[1].textContent.includes('Crimson Dice') && !!rows[1].querySelector('img.ele-pip') &&
    rows[2].dataset.skin === 'renegade' && rows[2].textContent.includes('Renegade Dice') && !!rows[2].querySelector('img.ren-pip'));
  click(window, q(document, '#m_gok'));
  ok('same skin just closes', !q(document, '#m_gok') && !!q(document, '#start') && window.SKIN.id === 'lobster');
}

// --- switch to Crimson replays splash, keeps names / history / watch code ---
{
  const { window } = load('http://localhost:8321/', w => {
    w.localStorage.setItem('lobsterDice.crew', JSON.stringify({ code: 'CLAW' }));
    w.localStorage.setItem('lobsterDice.history', JSON.stringify([{
      id: 'hist-keep', ts: Date.now(), stake: 1,
      players: [{ name: 'Addison', banked: 101, busts: 0, dubs: 0, biggest: 101, log: [] },
                { name: 'Kelsey', banked: 40, busts: 1, dubs: 0, biggest: 40, log: [] }]
    }]));
  });
  const { document } = window;
  type(window, '#players input[data-i="0"]', 'Addison');
  type(window, '#players input[data-i="1"]', 'Kelsey');
  ok('setup has no Watch code card before switch', !q(document, '#watchCard'));
  click(window, q(document, '#shareBtn'));
  ok('share menu still shows Claw Watch + code', q(document, '.crewcode-big').textContent === 'CLAW' &&
    document.body.textContent.includes('Claw Watch'));
  click(window, q(document, '#m_close'));
  const crewBefore = window.localStorage.getItem('lobsterDice.crew');
  const histBefore = window.localStorage.getItem('lobsterDice.history');
  const storeBefore = window.localStorage.getItem('lobsterDice.v2');

  click(window, q(document, '#gameModeTog'));
  click(window, q(document, '[data-skin="crimson"]'));
  click(window, q(document, '#m_gok'));

  ok('switched to crimson', window.SKIN.id === 'crimson');
  ok('crimson class + title', document.documentElement.classList.contains('skin-crimson') && document.title.includes('Crimson Dice'));
  ok('header is Crimson with white elephant', q(document, '.top h1').textContent === 'Crimson Dice' &&
    (q(document, '.top .logo img') || {}).getAttribute?.('src')?.includes('elephant-white.svg'));
  ok('remembered Game Mode', window.localStorage.getItem('lobsterDice.gameMode') === 'crimson');
  ok('splash replayed for crimson', !!q(document, '#splash') && !!q(document, '#eleArt') &&
    (q(document, '#eleArt').getAttribute('src') || '').includes('elephant-white.svg') &&
    !(q(document, '#eleArt').getAttribute('src') || '').includes('.png') &&
    q(document, '.sp-title-ele').textContent.includes('Crimson'));
  ok('still on setup after switch', !!q(document, '#start') && !!q(document, '#gameModeTog'));
  ok('player names persisted', q(document, '#players input[data-i="0"]').value === 'Addison' &&
    q(document, '#players input[data-i="1"]').value === 'Kelsey');
  ok('history persisted', window.localStorage.getItem('lobsterDice.history') === histBefore);
  ok('watch crew persisted', window.localStorage.getItem('lobsterDice.crew') === crewBefore &&
    JSON.parse(crewBefore).code === 'CLAW');
  ok('did not write a live game', window.localStorage.getItem('lobsterDice.v2') === storeBefore);
  ok('setup still has no Watch code card after switch', !q(document, '#watchCard'));

  click(window, q(document, '#histBtn'));
  ok('trophy still lists the kept game', document.body.textContent.includes('Addison') && document.body.textContent.includes('🏆'));
  click(window, q(document, '#m_close'));
  click(window, q(document, '#shareBtn'));
  ok('same Claw/Crimson Watch code', q(document, '.crewcode-big').textContent === 'CLAW' &&
    document.body.textContent.includes('Crimson Watch'));
  click(window, q(document, '#m_close'));

  click(window, q(document, '#gameModeTog'));
  click(window, q(document, '[data-skin="lobster"]'));
  click(window, q(document, '#m_gok'));
  ok('switch back to lobster', window.SKIN.id === 'lobster' && !document.documentElement.classList.contains('skin-crimson'));
  ok('lobster splash replayed', !!q(document, '#splash') && q(document, '.sp-title-lob').textContent.includes('Lobster'));
  ok('names still there after switch back', q(document, '#players input[data-i="0"]').value === 'Addison' &&
    q(document, '#players input[data-i="1"]').value === 'Kelsey');
}

// --- Game Mode hidden once a game is running ---
{
  const { window } = load('http://localhost:8321/');
  const { document } = window;
  type(window, '#players input[data-i="0"]', 'Addison');
  type(window, '#players input[data-i="1"]', 'Kelsey');
  click(window, q(document, '#start'));
  ok('game started hides Game Mode', !!q(document, '.rollchips') && !q(document, '#gameModeTog'));
}

// --- scrapconfirm is in-app (no window.confirm); trophy history stays ---
{
  const { window } = load('http://localhost:8321/', w => {
    w.localStorage.setItem('lobsterDice.crew', JSON.stringify({ code: 'CLAW' }));
    w.localStorage.setItem('lobsterDice.history', JSON.stringify([{
      id: 'hist-scrap', ts: Date.now(), stake: 1,
      players: [{ name: 'Addison', banked: 101, busts: 0, dubs: 0, biggest: 101, log: [] },
                { name: 'Kelsey', banked: 40, busts: 1, dubs: 0, biggest: 40, log: [] }]
    }]));
  });
  const { document } = window;
  let confirmHits = 0;
  window.confirm = () => { confirmHits++; return true; };
  type(window, '#players input[data-i="0"]', 'Addison');
  type(window, '#players input[data-i="1"]', 'Kelsey');
  click(window, q(document, '#start'));
  click(window, q(document, '#menu'));
  click(window, q(document, '#m_new'));
  ok('Start a new game opens scrapconfirm', !!q(document, '#m_scrap') && document.body.textContent.includes('Start over'));
  ok('scrapconfirm has Cancel', !!q(document, '#m_close'));
  q(document, '.ov').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  ok('same-tap backdrop does not dismiss scrapconfirm', !!q(document, '#m_scrap'));
  click(window, q(document, '#m_close'));
  ok('Cancel leaves the live game', !!q(document, '.rollchips') && !q(document, '#start'));
  click(window, q(document, '#menu'));
  click(window, q(document, '#m_new'));
  click(window, q(document, '#m_scrap'));
  ok('scrap returns to setup', !!q(document, '#start') && !!q(document, '#gameModeTog') && !q(document, '#watchCard'));
  ok('scrap did not call window.confirm', confirmHits === 0);
  const hist = JSON.parse(window.localStorage.getItem('lobsterDice.history') || '[]');
  ok('trophy history survived scrap', hist.length === 1 && hist[0].id === 'hist-scrap');
}

// --- last Game Mode remembered on normal / open ---
{
  const { window } = load('http://localhost:8321/', w => {
    w.localStorage.setItem('lobsterDice.gameMode', 'crimson');
  });
  ok(' / with saved crimson opens crimson', window.SKIN.id === 'crimson' &&
    window.document.documentElement.classList.contains('skin-crimson'));
}

// --- QR / deep links are Lobster-first ---
{
  const { window } = load('http://localhost:8321/crimson/17', w => {
    w.localStorage.setItem('lobsterDice.gameMode', 'crimson');
  });
  ok(' /crimson/17 ignores path and stored skin', window.SKIN.id === 'lobster');
  ok(' /crimson/17 no crimson class', !window.document.documentElement.classList.contains('skin-crimson'));
  ok(' /crimson/17 title stays Lobster', window.document.title.includes('Lobster Dice'));
}
{
  const { window } = load('http://localhost:8321/?skin=crimson&kit=01', w => {
    w.localStorage.setItem('lobsterDice.gameMode', 'crimson');
  });
  ok(' ?skin=crimson ignored', window.SKIN.id === 'lobster');
}
{
  const { window } = load('http://localhost:8321/crimson');
  ok(' /crimson without kit is lobster', window.SKIN.id === 'lobster' &&
    window.document.querySelector('.top h1').textContent === 'Lobster Dice');
}

// --- Watch QR is lobster first, then mirrors host skin ---
{
  const { window } = load('http://localhost:8321/?watch=CLAW', w => {
    w.localStorage.setItem('lobsterDice.gameMode', 'crimson');
    w.fetch = async () => ({ ok: true, status: 200, json: async () => [] });
  });
  ok('watch QR opens lobster first', window.SKIN.id === 'lobster' &&
    !window.document.documentElement.classList.contains('skin-crimson'));
}
{
  const liveRow = {
    updated_at: new Date().toISOString(),
    state: {
      phase: 'playing', stake: 1, cur: 0, accrual: 8, endgame: null, skin: 'crimson',
      players: [
        { name: 'Addison', banked: 22, busts: 0, dubs: 0 },
        { name: 'Kelsey', banked: 0, busts: 0, dubs: 0 }
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
  ok('watcher mirrors host crimson skin', window.SKIN.id === 'crimson' &&
    window.document.documentElement.classList.contains('skin-crimson'));
  ok('watcher label is Crimson Watch', window.document.body.textContent.includes('Crimson Watch') &&
    window.document.body.textContent.includes('CLAW'));
}
{
  const calls = [];
  const { window } = load('http://localhost:8321/', w => {
    w.localStorage.setItem('lobsterDice.crew', JSON.stringify({ code: 'CLAW' }));
    w.localStorage.setItem('lobsterDice.gameMode', 'crimson');
    w.fetch = async (url, opts = {}) => {
      calls.push({ u: String(url), method: opts.method || 'GET', body: opts.body });
      return { ok: true, status: 200, json: async () => [] };
    };
  });
  const { document } = window;
  type(window, '#players input[data-i="0"]', 'Addison');
  type(window, '#players input[data-i="1"]', 'Kelsey');
  click(window, q(document, '#start'));
  await sleep(1400);
  const livePosts = calls.filter(c => c.u.includes('/rest/v1/live') && c.method === 'POST');
  const last = livePosts.length ? JSON.parse(livePosts[livePosts.length - 1].body) : {};
  ok('host broadcast includes skin', last.state && last.state.skin === 'crimson' && last.code === 'CLAW');
}

// --- Crimson copy + Jackson faces; scoring path unchanged ---
{
  const { window } = load('http://localhost:8321/', w => {
    w.localStorage.setItem('lobsterDice.gameMode', 'crimson');
  });
  const { document } = window;
  type(window, '#players input[data-i="0"]', 'Addison');
  type(window, '#players input[data-i="1"]', 'Kelsey');
  click(window, q(document, '#noMathTog'));
  click(window, q(document, '#start'));
  const face1 = q(document, '[data-nm-col="0"][data-nm-face="1"]');
  ok('crimson Jackson face 1 is elephant art', (() => {
    const img = face1 && face1.querySelector('img.ele-pip');
    return img && (img.getAttribute('src') || '').includes('elephant-white.svg') && !face1.textContent.includes('🦞');
  })());
  ok('crimson wipe says Elephant', q(document, '#lob1').textContent.includes('Elephant') && !q(document, '#lob1').textContent.includes('Lobster'));
  click(window, q(document, '[data-nm-col="0"][data-nm-face="1"]'));
  click(window, q(document, '[data-nm-col="1"][data-nm-face="4"]'));
  ok('crimson single wipe uses elephant copy', q(document, '.msg').textContent.includes('Elephant') && !q(document, '.msg').textContent.includes('Lobster'));
  ok('no Game Mode mid-game after crimson start', !q(document, '#gameModeTog'));
}

// --- switch to Renegade replays splash, keeps names / history / watch code ---
{
  const { window } = load('http://localhost:8321/', w => {
    w.localStorage.setItem('lobsterDice.crew', JSON.stringify({ code: 'CLAW' }));
    w.localStorage.setItem('lobsterDice.history', JSON.stringify([{
      id: 'hist-ren', ts: Date.now(), stake: 1,
      players: [{ name: 'Addison', banked: 101, busts: 0, dubs: 0, biggest: 101, log: [] },
                { name: 'Kelsey', banked: 40, busts: 1, dubs: 0, biggest: 40, log: [] }]
    }]));
  });
  const { document } = window;
  type(window, '#players input[data-i="0"]', 'Addison');
  type(window, '#players input[data-i="1"]', 'Kelsey');
  const crewBefore = window.localStorage.getItem('lobsterDice.crew');
  const histBefore = window.localStorage.getItem('lobsterDice.history');
  click(window, q(document, '#gameModeTog'));
  click(window, q(document, '[data-skin="renegade"]'));
  click(window, q(document, '#m_gok'));
  ok('switched to renegade', window.SKIN.id === 'renegade');
  ok('renegade class + title', document.documentElement.classList.contains('skin-renegade') &&
    !document.documentElement.classList.contains('skin-crimson') &&
    document.title.includes('Renegade Dice'));
  ok('header is Renegade with gold spear', q(document, '.top h1').textContent === 'Renegade Dice' &&
    (q(document, '.top .logo img') || {}).getAttribute?.('src')?.includes('header-mark.svg'));
  ok('remembered Renegade', window.localStorage.getItem('lobsterDice.gameMode') === 'renegade');
  ok('splash replayed for renegade', !!q(document, '#splash') && !!q(document, '#spearArt') &&
    (q(document, '#spearArt').getAttribute('src') || '').includes('renegade/splash-head.png') &&
    q(document, '.sp-title-ren').textContent.includes('Renegade'));
  ok('still on setup after renegade switch', !!q(document, '#start') && !!q(document, '#gameModeTog') && !q(document, '#watchCard'));
  ok('renegade kept names', q(document, '#players input[data-i="0"]').value === 'Addison' &&
    q(document, '#players input[data-i="1"]').value === 'Kelsey');
  ok('renegade kept history', window.localStorage.getItem('lobsterDice.history') === histBefore);
  ok('renegade kept watch crew', window.localStorage.getItem('lobsterDice.crew') === crewBefore);
  click(window, q(document, '#shareBtn'));
  ok('share label is Renegade Watch + same code', q(document, '.crewcode-big').textContent === 'CLAW' &&
    document.body.textContent.includes('Renegade Watch') && !document.body.textContent.includes('Seminole'));
  click(window, q(document, '#m_close'));
}

// --- last Renegade remembered; QR / deep links stay Lobster-first ---
{
  const { window } = load('http://localhost:8321/', w => {
    w.localStorage.setItem('lobsterDice.gameMode', 'renegade');
  });
  ok(' / with saved renegade opens renegade', window.SKIN.id === 'renegade' &&
    window.document.documentElement.classList.contains('skin-renegade'));
}
{
  const { window } = load('http://localhost:8321/renegade/17', w => {
    w.localStorage.setItem('lobsterDice.gameMode', 'renegade');
  });
  ok(' /renegade/17 ignores path and stored skin', window.SKIN.id === 'lobster');
  ok(' /renegade/17 no renegade class', !window.document.documentElement.classList.contains('skin-renegade'));
}
{
  const { window } = load('http://localhost:8321/?skin=renegade');
  ok(' ?skin=renegade ignored', window.SKIN.id === 'lobster');
}

// --- Watch mirrors host renegade; Jackson spear pip ---
{
  const liveRow = {
    updated_at: new Date().toISOString(),
    state: {
      phase: 'playing', stake: 1, cur: 0, accrual: 8, endgame: null, skin: 'renegade',
      players: [
        { name: 'Addison', banked: 22, busts: 0, dubs: 0 },
        { name: 'Kelsey', banked: 0, busts: 0, dubs: 0 }
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
  ok('watcher mirrors host renegade skin', window.SKIN.id === 'renegade' &&
    window.document.documentElement.classList.contains('skin-renegade'));
  ok('watcher label is Renegade Watch', window.document.body.textContent.includes('Renegade Watch') &&
    window.document.body.textContent.includes('CLAW'));
}
{
  const { window } = load('http://localhost:8321/', w => {
    w.localStorage.setItem('lobsterDice.gameMode', 'renegade');
  });
  const { document } = window;
  type(window, '#players input[data-i="0"]', 'Addison');
  type(window, '#players input[data-i="1"]', 'Kelsey');
  click(window, q(document, '#noMathTog'));
  click(window, q(document, '#start'));
  const face1 = q(document, '[data-nm-col="0"][data-nm-face="1"]');
  ok('renegade Jackson face 1 is spear pip', (() => {
    const img = face1 && face1.querySelector('img.ren-pip');
    return img && (img.getAttribute('src') || '').includes('renegade/pip.svg') && !face1.textContent.includes('🦞');
  })());
  ok('renegade wipe says Spear', q(document, '#lob1').textContent.includes('Spear') && !q(document, '#lob1').textContent.includes('Lobster'));
  click(window, q(document, '[data-nm-col="0"][data-nm-face="1"]'));
  click(window, q(document, '[data-nm-col="1"][data-nm-face="4"]'));
  ok('renegade single wipe uses spear copy', q(document, '.msg').textContent.includes('Spear') && !q(document, '.msg').textContent.includes('Lobster'));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
