import { JSDOM } from 'jsdom';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

let pass = 0, fail = 0;
const ok = (n, c) => { (c ? pass++ : fail++); console.log((c ? '✓' : '✗ FAIL') + ' ' + n); };

function load(url, before) {
  return new JSDOM(html, {
    runScripts: 'dangerously',
    url,
    beforeParse(window) { if (before) before(window); }
  });
}

function q(doc, s) { return doc.querySelector(s); }

// --- Lobster at / stays the default ---
{
  const { window } = load('http://localhost:8321/');
  const { document } = window;
  ok(' / is lobster skin', window.SKIN && window.SKIN.id === 'lobster');
  ok(' / no kit', window.SKIN.kit === null);
  ok(' / title is Lobster Dice', document.title.includes('Lobster Dice') && !document.title.includes('Crimson'));
  ok(' / splash says Lobster', q(document, '.sp-title').textContent.includes('Lobster'));
  ok(' / lobster art still in splash', !!q(document, '#lobArt') && !!q(document, '.sp-lob'));
  ok(' / header logo is lobster', q(document, '.top .logo').textContent.includes('🦞'));
  ok(' / header name is Lobster Dice', q(document, '.top h1').textContent === 'Lobster Dice');
  ok(' / navy theme-color', q(document, 'meta[name="theme-color"]').getAttribute('content') === '#0b1f3a');
  ok(' / lobster manifest', (q(document, 'link[rel="manifest"]').getAttribute('href') || '').includes('crimson') === false);
  ok(' / html is not crimson class', !document.documentElement.classList.contains('skin-crimson'));
  ok(' / footer v4.10', document.getElementById('foot').textContent.includes('v4.10') && document.getElementById('foot').textContent.includes('addison hoover'));
  ok(' / no pouch card', !document.getElementById('foot').textContent.includes('pouch'));
}

// --- Path /crimson/17 ---
{
  const { window } = load('http://localhost:8321/crimson/17');
  const { document } = window;
  ok(' /crimson/17 is crimson', window.SKIN && window.SKIN.id === 'crimson');
  ok(' /crimson/17 kit 17', window.SKIN.kit === '17');
  ok(' /crimson/17 title is Crimson Dice', document.title.includes('Crimson Dice'));
  ok(' /crimson/17 splash says Crimson', q(document, '.sp-title').textContent.includes('Crimson') && !q(document, '.sp-title').textContent.includes('Lobster'));
  ok(' /crimson/17 elephant art present', (() => {
    const el = q(document, '#eleArt');
    return el && el.tagName === 'IMG' && el.classList.contains('sp-ele') && (el.getAttribute('src') || '').includes('elephant-flat.png');
  })());
  ok(' /crimson/17 splash die uses flat elephant', (() => {
    const img = q(document, '.sp-d2-ele image');
    return img && (img.getAttribute('href') || '').includes('elephant-flat.png');
  })());
  ok(' /crimson/17 header elephant', (() => {
    const img = q(document, '.top .logo img');
    const logo = q(document, '.top .logo');
    return img && (img.getAttribute('src') || '').includes('elephant-white.png') && !logo.textContent.includes('🐘') && !logo.textContent.includes('🦞');
  })());
  ok(' /crimson/17 header name', q(document, '.top h1').textContent === 'Crimson Dice');
  ok(' /crimson/17 crimson theme-color', q(document, 'meta[name="theme-color"]').getAttribute('content') === '#9E1B32');
  ok(' /crimson/17 crimson manifest', q(document, 'link[rel="manifest"]').getAttribute('href').includes('crimson/manifest'));
  ok(' /crimson/17 html class', document.documentElement.classList.contains('skin-crimson'));
  ok(' /crimson/17 pouch in footer', document.getElementById('foot').textContent.includes('pouch 17'));
  ok(' /crimson/17 persisted session', (() => {
    const raw = window.sessionStorage.getItem('crimsonDice.session') || window.localStorage.getItem('crimsonDice.session');
    const s = raw ? JSON.parse(raw) : null;
    return s && s.id === 'crimson' && s.kit === '17';
  })());
  ok(' /crimson/17 optional identity card', !!q(document, '#idcard') && q(document, '#idskip'));
  ok(' /crimson/17 start still enabled path (not a wall)', !!q(document, '#start'));
}

// --- /crimson with no kit ---
{
  const { window } = load('http://localhost:8321/crimson');
  ok(' /crimson skin without kit', window.SKIN.id === 'crimson' && window.SKIN.kit === null);
  ok(' /crimson still named Crimson Dice', window.document.querySelector('.top h1').textContent === 'Crimson Dice');
}

// --- query string for older links ---
{
  const { window } = load('http://localhost:8321/?skin=crimson&kit=01');
  ok(' ?skin=crimson&kit=01', window.SKIN.id === 'crimson' && window.SKIN.kit === '01');
  ok(' query kit pads', window.parseKit('1') === '01' && window.parseKit('25') === '25' && window.parseKit('0') === null && window.parseKit('26') === null);
}

// --- persistence: non-home path without /crimson falls back to stored skin ---
{
  const { window } = load('http://localhost:8321/in-app', w => {
    const v = JSON.stringify({ id: 'crimson', kit: '09' });
    w.sessionStorage.setItem('crimsonDice.session', v);
    w.localStorage.setItem('crimsonDice.session', v);
  });
  ok(' stored skin survives in-app path', window.SKIN.id === 'crimson' && window.SKIN.kit === '09');
}

// --- opening / ignores stored crimson ---
{
  const { window } = load('http://localhost:8321/', w => {
    const v = JSON.stringify({ id: 'crimson', kit: '04' });
    w.sessionStorage.setItem('crimsonDice.session', v);
    w.localStorage.setItem('crimsonDice.session', v);
  });
  ok(' / ignores stored crimson', window.SKIN.id === 'lobster' && window.SKIN.kit === null);
  ok(' / still lobster title after stored crimson', window.document.title.includes('Lobster Dice'));
}

// --- elephant copy in Jackson Mode; lobster / untouched ---
{
  const { window } = load('http://localhost:8321/crimson/03');
  const { document } = window;
  const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const type = (sel, val) => { const el = q(document, sel); el.value = val; el.dispatchEvent(new window.Event('input', { bubbles: true })); };
  type('#players input[data-i="0"]', 'Addison');
  type('#players input[data-i="1"]', 'Kelsey');
  click(q(document, '#noMathTog'));
  click(q(document, '#start'));
  ok(' crimson Jackson columns exist', document.querySelectorAll('[data-nm-col="0"]').length === 6);
  const face1 = q(document, '[data-nm-col="0"][data-nm-face="1"]');
  ok(' crimson face 1 is elephant not lobster', (() => {
    const img = face1 && face1.querySelector('img.ele-pip');
    return img && (img.getAttribute('src') || '').includes('elephant-white.png') && !face1.textContent.includes('🦞') && !face1.textContent.includes('🐘');
  })());
  ok(' crimson wipe button says Elephant', (() => {
    const btn = q(document, '#lob1');
    const img = btn && btn.querySelector('img.ele-pip');
    return btn && btn.textContent.includes('Elephant') && !btn.textContent.includes('Lobster') && img && (img.getAttribute('src') || '').includes('elephant-white.png') && !btn.textContent.includes('🐘');
  })());
  click(q(document, '[data-nm-col="0"][data-nm-face="1"]'));
  click(q(document, '[data-nm-col="1"][data-nm-face="4"]'));
  ok(' crimson single wipe says elephant', document.querySelector('.msg').textContent.includes('Elephant') && !document.querySelector('.msg').textContent.includes('Lobster'));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
