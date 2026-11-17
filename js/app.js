import { LETTERS } from './letters.js';
import { letterStrokes } from './strokes.js';
import { scoreTrace } from './scoring.js';
import { sayLetter as speakLetter, speak, feedbackText, stopSpeaking } from './speech.js';
import * as sfx from './sfx.js';

const STORE_KEY = 'buchstaben-v1';
const INK_COLORS = ['#ff5a7a', '#21a8f0', '#2fbf71', '#ff9f1c', '#e14eca'];
const ROAD = 17; // Breite der Spur in Buchstaben-Einheiten
const DEMO_SPEED = 130; // Einheiten pro Sekunde beim Vormachen

// Sichtbarer Bereich je Schreibweise (in Buchstaben-Einheiten)
const VIEW = {
  upper: { top: -32, bottom: 114, maxW: 100, lines: [0, 50, 100] },
  lower: { top: -4, bottom: 156, maxW: 82, lines: [0, 50, 100, 150] },
};

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
  strokes: [], // gemalte Striche in Buchstaben-Einheiten
  current: null,
  activePointer: null,
  penSeen: false,
  letter: null, // Vorlage (letterStrokes)
  view: null, // { k, ox, oy, w, h }
  inkColor: INK_COLORS[0],
  scored: false,
  demo: null, // laufende Vormach-Animation
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
  state.letter = letterStrokes(charOf(letter));
  $('#hint-emoji').textContent = letter.emoji;
  showScreen('trace');
  resizeCanvas();
  sayLetter();
  setTimeout(() => { if (!state.strokes.length) startDemo(); }, 500);
}

function sayLetter() {
  const hint = $('#btn-speak');
  hint.classList.add('talking');
  clearTimeout(sayLetter.t);
  sayLetter.t = setTimeout(() => hint.classList.remove('talking'), 3200);
  speakLetter(currentLetter());
}

/** Maßstab und Lage so wählen, dass der Buchstabe groß auf die Schreiblinien passt. */
function layout(w, h) {
  const v = VIEW[state.letterCase];
  const box = state.letter.box;
  const k = Math.min((h * 0.92) / (v.bottom - v.top), (w * 0.84) / v.maxW);
  const ox = w / 2 - ((box.minX + box.maxX) / 2) * k;
  const oy = (h - (v.bottom - v.top) * k) / 2 - v.top * k;
  return { k, ox, oy, w, h };
}

const toPx = (p) => ({ x: state.view.ox + p.x * state.view.k, y: state.view.oy + p.y * state.view.k });
const toUnits = (x, y) => ({ x: (x - state.view.ox) / state.view.k, y: (y - state.view.oy) / state.view.k });

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height || !state.letter) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.view = layout(rect.width, rect.height);
  draw();
}

function drawGuides() {
  const { w, k, oy } = state.view;
  const v = VIEW[state.letterCase];
  const pad = 12;
  ctx.save();
  for (const u of v.lines) {
    const y = oy + u * k;
    ctx.setLineDash(u === 50 ? [10, 10] : []);
    ctx.lineWidth = u === 100 ? 4 : 2;
    ctx.strokeStyle = u === 100 ? '#b9aee6' : '#ddd6f3';
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }
  ctx.restore();
}

function tracePath(points) {
  ctx.beginPath();
  const p0 = toPx(points[0]);
  ctx.moveTo(p0.x, p0.y);
  for (let i = 1; i < points.length; i++) {
    const p = toPx(points[i]);
    ctx.lineTo(p.x, p.y);
  }
}

/** Die Spur, auf der das Kind fahren soll. */
function drawRoad() {
  const { k } = state.view;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ece7ff';
  ctx.fillStyle = '#ece7ff';
  ctx.lineWidth = ROAD * k;
  for (const s of state.letter.strokes) {
    if (s.dot) {
      const p = toPx(s.points[0]);
      ctx.beginPath(); ctx.arc(p.x, p.y, (ROAD / 2) * k * 1.1, 0, Math.PI * 2); ctx.fill();
    } else {
      tracePath(s.points);
      ctx.stroke();
    }
  }
  // Mittellinie gepunktet
  ctx.strokeStyle = '#b3a5ef';
  ctx.lineWidth = Math.max(2, 1.4 * k);
  ctx.setLineDash([2.5 * k, 3.5 * k]);
  for (const s of state.letter.strokes) {
    if (s.dot) continue;
    tracePath(s.points);
    ctx.stroke();
  }
  ctx.restore();
}

function pointAt(points, frac) {
  const i = Math.min(points.length - 2, Math.max(0, Math.floor(frac * (points.length - 1))));
  return { p: points[i], q: points[i + 1] };
}

/** Pfeile für die Schreibrichtung und Startpunkte mit Nummer. */
function drawDirections() {
  const { k } = state.view;
  const strokes = state.letter.strokes;
  ctx.save();
  // Pfeile
  ctx.fillStyle = '#7c5cff';
  for (const s of strokes) {
    if (s.dot) continue;
    const n = Math.max(1, Math.round(s.length / 55));
    for (let j = 1; j <= n; j++) {
      const frac = (j - 0.35) / n;
      const { p, q } = pointAt(s.points, Math.min(0.92, Math.max(0.25, frac)));
      const a = toPx(p), b = toPx(q);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const size = 6.5 * k;
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(size * 0.9, 0);
      ctx.lineTo(-size * 0.6, -size * 0.75);
      ctx.lineTo(-size * 0.25, 0);
      ctx.lineTo(-size * 0.6, size * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  // Startpunkte (grün) mit Reihenfolge
  const many = strokes.length > 1;
  startMarkers().forEach((m, i) => {
    const s = strokes[i];
    const p = toPx(m);
    const r = (s.dot ? 6 : 7.5) * k;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#2fbf71';
    ctx.fill();
    ctx.lineWidth = Math.max(2, 1.2 * k);
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    if (many) {
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${r * 1.35}px 'Andika', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), p.x, p.y + r * 0.08);
    }
  });
  ctx.restore();
}

/** Startpunkte; liegen zwei aufeinander, wird der spätere etwas verschoben. */
function startMarkers() {
  const MIN = 15;
  const out = [];
  for (const s of state.letter.strokes) {
    let m = { ...s.points[0] };
    for (const prev of out) {
      const d = Math.hypot(m.x - prev.x, m.y - prev.y);
      if (d >= MIN) continue;
      if (d > 1) {
        m = { x: prev.x + ((m.x - prev.x) / d) * MIN, y: prev.y + ((m.y - prev.y) / d) * MIN };
      } else if (!s.dot) {
        // Gleicher Startpunkt: ein Stück entlang des eigenen Strichs
        const idx = Math.min(s.points.length - 1, Math.round((MIN / s.length) * (s.points.length - 1)));
        m = { ...s.points[idx] };
      }
    }
    out.push(m);
  }
  return out;
}

function inkWidth() {
  return Math.max(6, ROAD * 0.55 * state.view.k);
}

function drawInkStroke(s) {
  if (!s.length) return;
  ctx.lineWidth = inkWidth();
  const pts = s.map(toPx);
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, inkWidth() / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

/** Vormach-Animation: zeigt, wo man ansetzt und wie man fährt. */
function drawDemo(progressUnits) {
  const { k } = state.view;
  let left = progressUnits;
  let pen = null;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255, 159, 28, 0.85)';
  ctx.fillStyle = 'rgba(255, 159, 28, 0.85)';
  ctx.lineWidth = ROAD * 0.5 * k;
  for (const s of state.letter.strokes) {
    const len = s.dot ? 8 : s.length;
    if (left <= 0) break;
    const frac = Math.min(1, left / len);
    if (s.dot) {
      const p = toPx(s.points[0]);
      ctx.beginPath(); ctx.arc(p.x, p.y, ROAD * 0.3 * k, 0, Math.PI * 2); ctx.fill();
      pen = p;
    } else {
      const n = Math.max(1, Math.round(frac * (s.points.length - 1)));
      tracePath(s.points.slice(0, n + 1));
      ctx.stroke();
      pen = toPx(s.points[n]);
    }
    left -= len + 30; // kurze Pause zwischen Strichen
  }
  if (pen) {
    ctx.font = `${ROAD * 1.6 * k}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('✏️', pen.x - ROAD * 0.3 * k, pen.y + ROAD * 0.5 * k);
  }
  ctx.restore();
}

function demoTotal() {
  return state.letter.strokes.reduce((s, st) => s + (st.dot ? 8 : st.length) + 30, 0);
}

function startDemo() {
  stopDemo();
  if (state.scored || !$('#trace').classList.contains('active')) return;
  const total = demoTotal();
  const t0 = performance.now();
  const demo = { units: 0, raf: 0 };
  state.demo = demo;
  const tick = (t) => {
    if (state.demo !== demo) return;
    demo.units = ((t - t0) / 1000) * DEMO_SPEED;
    draw();
    if (demo.units < total + 40) demo.raf = requestAnimationFrame(tick);
    else { state.demo = null; draw(); }
  };
  demo.raf = requestAnimationFrame(tick);
}

function stopDemo() {
  if (state.demo) cancelAnimationFrame(state.demo.raf);
  state.demo = null;
}

function draw() {
  if (!state.view) return;
  const { w, h } = state.view;
  ctx.clearRect(0, 0, w, h);
  drawGuides();
  drawRoad();
  if (state.demo) drawDemo(state.demo.units);
  drawDirections();
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = state.inkColor;
  ctx.fillStyle = state.inkColor;
  state.strokes.forEach(drawInkStroke);
  ctx.restore();
}

function pointFrom(e) {
  const r = canvas.getBoundingClientRect();
  return toUnits(e.clientX - r.left, e.clientY - r.top);
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'pen') state.penSeen = true;
  // Handballen ignorieren, sobald ein Stift benutzt wurde
  if (state.penSeen && e.pointerType === 'touch') return;
  if (state.activePointer !== null || state.scored) return;
  e.preventDefault();
  stopDemo();
  state.activePointer = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  state.current = [pointFrom(e)];
  state.strokes.push(state.current);
  draw();
});

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== state.activePointer) return;
  e.preventDefault();
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  for (const ev of (events.length ? events : [e])) {
    const p = pointFrom(ev);
    const last = state.current[state.current.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) >= 0.6) state.current.push(p);
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
    speak('Fang beim grünen Punkt an und fahr den Pfeilen nach.');
    startDemo();
    return;
  }
  stopDemo();
  const res = scoreTrace(state.letter, state.strokes);
  state.scored = true;
  const ch = state.letter.char;
  const prevBest = progress.best[ch] || 0;
  progress.best[ch] = Math.max(prevBest, res.stars);
  progress.total += res.points;
  saveProgress();
  showResult(res);
}

const TIP_ICONS = { missing: '✏️ Strich fehlt', direction: '🟢➜ Richtung', extra: '🚫 Kritzeln', shape: '⭕ Form', accuracy: '🎯 Genauer' };

function showResult(res) {
  $('#result-stars').innerHTML = starsHtml(res.stars);
  $('#result-points').textContent = `+${res.points}`;
  $('#result-tip').textContent = res.stars < 3 ? (TIP_ICONS[res.feedback] || '') : '';
  $('#result').hidden = false;
  renderTotal(true);
  if (res.stars >= 1) sfx.win(res.stars); else sfx.boop();
  if (res.stars === 3) startConfetti();
  setTimeout(() => speak(feedbackText(res), { rate: 0.9, pitch: 1.15 }), 350);
}

function nextLetter() {
  stopConfetti();
  const n = visibleLetters().length;
  openLetter((state.index + 1) % n);
}

$('#btn-home').addEventListener('click', () => {
  stopConfetti();
  stopDemo();
  stopSpeaking();
  renderGrid();
  showScreen('home');
});
$('#btn-speak').addEventListener('click', sayLetter);
$('#btn-demo').addEventListener('click', () => { clearDrawing(); startDemo(); });
$('#btn-clear').addEventListener('click', () => { sfx.pop(); clearDrawing(); });
$('#btn-done').addEventListener('click', finish);
$('#btn-next').addEventListener('click', nextLetter);
$('#btn-again').addEventListener('click', () => { sfx.pop(); clearDrawing(); startDemo(); });
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
  const colors = [...INK_COLORS, '#ffc531', '#7c5cff'];
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
  try { await document.fonts.load("700 40px 'Andika'", 'Aa'); } catch { /* Ersatzschrift */ }
  renderGrid();
  renderTotal();
}
init();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Für Tests
window.__app = { state, progress, scoreTrace, letterStrokes, openLetter, finish, toPx };
