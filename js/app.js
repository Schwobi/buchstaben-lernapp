import { LETTERS } from './letters.js';
import { scoreTrace } from './scoring.js';
import { speak, letterText, praise } from './speech.js';
import * as sfx from './sfx.js';

const FONT_FAMILY = "'Andika', 'Comic Sans MS', sans-serif";
const STORE_KEY = 'buchstaben-v1';
const INK_COLORS = ['#ff5a7a', '#7c5cff', '#21a8f0', '#2fbf71', '#ff9f1c'];

const $ = (sel) => document.querySelector(sel);

// ---------- Fortschritt speichern ----------
function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(STORE_KEY));
    if (p && typeof p.total === 'number' && p.best) return p;
  } catch { /* ignorieren */ }
  return { total: 0, best: {} };
}
function saveProgress() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch { /* ignorieren */ }
}

const progress = loadProgress();
const state = {
  letterCase: 'upper',
  index: 0,
  strokes: [],
  current: null,
  activePointer: null,
  penSeen: false,
  glyph: null,
  inkColor: INK_COLORS[0],
  scored: false,
};

const charOf = (letter, c = state.letterCase) => (c === 'upper' ? letter.upper : letter.lower);
const visibleLetters = () => LETTERS.filter((l) => charOf(l));

// ---------- Startseite ----------
function starsHtml(n) {
  return [1, 2, 3].map((i) => `<span class="${i <= n ? '' : 'off'}">⭐</span>`).join('');
}

function renderGrid() {
  const grid = $('#grid');
  grid.innerHTML = '';
  visibleLetters().forEach((letter, i) => {
    const ch = charOf(letter);
    const best = progress.best[ch] || 0;
    const btn = document.createElement('button');
    btn.className = `tile${best === 3 ? ' done-3' : ''}`;
    btn.setAttribute('aria-label', ch);
    btn.innerHTML = `<span>${ch}</span><span class="tile-stars">${starsHtml(best)}</span>`;
    btn.addEventListener('click', () => openLetter(i));
    grid.appendChild(btn);
  });
}

function renderTotal(bump = false) {
  document.querySelectorAll('.score').forEach((el) => {
    el.querySelector('.total').textContent = progress.total;
    if (bump) {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  });
}

document.querySelectorAll('.case-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.letterCase = btn.dataset.case;
    document.querySelectorAll('.case-btn').forEach((b) => b.classList.toggle('active', b === btn));
    sfx.pop();
    renderGrid();
  });
});

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}

// ---------- Nachfahren ----------
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');

function currentLetter() {
  return visibleLetters()[state.index];
}

function openLetter(i) {
  state.index = i;
  state.strokes = [];
  state.scored = false;
  state.inkColor = INK_COLORS[i % INK_COLORS.length];
  $('#result').hidden = true;
  const letter = currentLetter();
  $('#hint-emoji').textContent = letter.emoji;
  showScreen('trace');
  resizeCanvas();
  sayLetter();
}

function sayLetter() {
  const letter = currentLetter();
  const hint = $('#btn-speak');
  hint.classList.add('talking');
  clearTimeout(sayLetter.t);
  sayLetter.t = setTimeout(() => hint.classList.remove('talking'), 2200);
  speak(letterText(letter));
}

/** Schriftgröße und Lage so wählen, dass jeder Buchstabe auf die Schreiblinien passt. */
function layoutGlyph(w, h, ch) {
  const ref = 100;
  ctx.font = `700 ${ref}px ${FONT_FAMILY}`;
  const m = (t) => ctx.measureText(t);
  const top = Math.max(m('ÄÖÜbdfhklt').actualBoundingBoxAscent, m('H').actualBoundingBoxAscent);
  const cap = m('H').actualBoundingBoxAscent;
  const xh = m('x').actualBoundingBoxAscent;
  const desc = m('gjpqy').actualBoundingBoxDescent;
  const widest = Math.max(m('W').width, m('M').width, m('m').width, m('w').width);

  const fontSize = Math.min((h * 0.84) / ((top + desc) / ref), (w * 0.86) / (widest / ref));
  const k = fontSize / ref;
  const total = (top + desc) * k;
  const baseline = (h - total) / 2 + top * k;
  return {
    char: ch,
    font: `700 ${fontSize}px ${FONT_FAMILY}`,
    fontSize,
    x: w / 2,
    y: baseline,
    width: w,
    height: h,
    lines: {
      cap: baseline - cap * k,
      x: baseline - xh * k,
      base: baseline,
      desc: baseline + desc * k,
    },
  };
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const oldGlyph = state.glyph;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.glyph = layoutGlyph(rect.width, rect.height, charOf(currentLetter()));
  // Bereits gemalte Linien bei Größenänderung mitskalieren.
  if (oldGlyph && oldGlyph.char === state.glyph.char && state.strokes.length) {
    const s = state.glyph.fontSize / oldGlyph.fontSize;
    const dx = state.glyph.x - oldGlyph.x * s;
    const dy = state.glyph.y - oldGlyph.y * s;
    state.strokes = state.strokes.map((st) => st.map((p) => ({ x: p.x * s + dx, y: p.y * s + dy })));
  }
  draw();
}

function drawGuides(g) {
  const { width: w, lines } = g;
  const pad = 12;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#d9d2f2';
  for (const y of [lines.cap, lines.desc]) {
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }
  ctx.setLineDash([10, 10]);
  ctx.beginPath(); ctx.moveTo(pad, lines.x); ctx.lineTo(w - pad, lines.x); ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#b9aee6';
  ctx.beginPath(); ctx.moveTo(pad, lines.base); ctx.lineTo(w - pad, lines.base); ctx.stroke();
  ctx.restore();
}

function drawGlyph(g) {
  ctx.save();
  ctx.font = g.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ece7ff';
  ctx.fillText(g.char, g.x, g.y);
  ctx.lineWidth = Math.max(2, g.fontSize * 0.008);
  ctx.setLineDash([g.fontSize * 0.02, g.fontSize * 0.02]);
  ctx.strokeStyle = '#a796ee';
  ctx.strokeText(g.char, g.x, g.y);
  ctx.restore();
}

function inkWidth() {
  return Math.max(8, state.glyph.fontSize * 0.075);
}

function drawStroke(s) {
  if (!s.length) return;
  ctx.lineWidth = inkWidth();
  if (s.length === 1) {
    ctx.beginPath();
    ctx.arc(s[0].x, s[0].y, inkWidth() / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(s[0].x, s[0].y);
  for (let i = 1; i < s.length - 1; i++) {
    // Glatte Linie durch Mittelpunkte
    const mx = (s[i].x + s[i + 1].x) / 2;
    const my = (s[i].y + s[i + 1].y) / 2;
    ctx.quadraticCurveTo(s[i].x, s[i].y, mx, my);
  }
  const last = s[s.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

function draw() {
  const g = state.glyph;
  if (!g) return;
  ctx.clearRect(0, 0, g.width, g.height);
  drawGuides(g);
  drawGlyph(g);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = state.inkColor;
  ctx.fillStyle = state.inkColor;
  state.strokes.forEach(drawStroke);
  ctx.restore();
}

function pointFrom(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'pen') state.penSeen = true;
  // Handballen ignorieren, sobald ein Stift benutzt wurde
  if (state.penSeen && e.pointerType === 'touch') return;
  if (state.activePointer !== null || state.scored) return;
  e.preventDefault();
  state.activePointer = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  state.current = [pointFrom(e)];
  state.strokes.push(state.current);
  draw();
});

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== state.activePointer) return;
  e.preventDefault();
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of (events.length ? events : [e])) {
    const p = pointFrom(ev);
    const last = state.current[state.current.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) >= 1.5) state.current.push(p);
  }
  draw();
});

function endStroke(e) {
  if (e.pointerId !== state.activePointer) return;
  state.activePointer = null;
  state.current = null;
}
canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);

function clearDrawing() {
  state.strokes = [];
  state.scored = false;
  $('#result').hidden = true;
  stopConfetti();
  draw();
}

function finish() {
  if (state.scored) return;
  if (!state.strokes.some((s) => s.length > 2)) {
    sfx.boop();
    speak('Fahr den Buchstaben mit dem Finger oder Stift nach.');
    return;
  }
  const res = scoreTrace(state.glyph, state.strokes);
  state.scored = true;
  const ch = state.glyph.char;
  const prevBest = progress.best[ch] || 0;
  progress.best[ch] = Math.max(prevBest, res.stars);
  progress.total += res.points;
  saveProgress();
  showResult(res);
}

function showResult(res) {
  $('#result-stars').innerHTML = starsHtml(res.stars);
  $('#result-points').textContent = `+${res.points}`;
  $('#result').hidden = false;
  renderTotal(true);
  if (res.stars >= 1) sfx.win(res.stars); else sfx.boop();
  if (res.stars === 3) startConfetti();
  setTimeout(() => speak(praise(res.stars), { rate: 0.95, pitch: 1.2 }), 300);
}

function nextLetter() {
  stopConfetti();
  const n = visibleLetters().length;
  openLetter((state.index + 1) % n);
}

$('#btn-home').addEventListener('click', () => {
  stopConfetti();
  window.speechSynthesis?.cancel();
  renderGrid();
  showScreen('home');
});
$('#btn-speak').addEventListener('click', sayLetter);
$('#btn-clear').addEventListener('click', () => { sfx.pop(); clearDrawing(); });
$('#btn-done').addEventListener('click', finish);
$('#btn-next').addEventListener('click', nextLetter);
$('#btn-again').addEventListener('click', () => { sfx.pop(); clearDrawing(); });
$('#btn-result-next').addEventListener('click', nextLetter);

window.addEventListener('resize', () => {
  if ($('#trace').classList.contains('active')) resizeCanvas();
});

// ---------- Konfetti ----------
let confettiRaf = 0;
function startConfetti() {
  const c = $('#confetti');
  const r = c.getBoundingClientRect();
  c.width = r.width;
  c.height = r.height;
  const cx = c.getContext('2d');
  const colors = [...INK_COLORS, '#ffc531'];
  const parts = Array.from({ length: 120 }, () => ({
    x: r.width / 2,
    y: r.height / 2,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 16 - 4,
    s: 6 + Math.random() * 8,
    rot: Math.random() * 6,
    vr: (Math.random() - 0.5) * 0.4,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  let frames = 0;
  const tick = () => {
    cx.clearRect(0, 0, r.width, r.height);
    for (const p of parts) {
      p.vy += 0.45;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      cx.save();
      cx.translate(p.x, p.y);
      cx.rotate(p.rot);
      cx.fillStyle = p.color;
      cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      cx.restore();
    }
    if (++frames < 180) confettiRaf = requestAnimationFrame(tick);
    else cx.clearRect(0, 0, r.width, r.height);
  };
  cancelAnimationFrame(confettiRaf);
  tick();
}
function stopConfetti() {
  cancelAnimationFrame(confettiRaf);
  const c = $('#confetti');
  c.getContext('2d').clearRect(0, 0, c.width, c.height);
}

// ---------- Start ----------
async function init() {
  try { await document.fonts.load(`700 100px ${FONT_FAMILY}`, 'Aa'); } catch { /* Ersatzschrift */ }
  renderGrid();
  renderTotal();
}
init();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Für Tests
window.__app = { state, progress, scoreTrace, openLetter, finish };
