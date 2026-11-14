// Kleine Klänge mit der Web Audio API (keine Audiodateien nötig).
let ac = null;
function audio() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function tone(freq, start, dur, type = 'sine', vol = 0.2) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function pop() { tone(660, 0, 0.12, 'triangle', 0.15); }
export function boop() { tone(300, 0, 0.18, 'sine', 0.2); tone(220, 0.15, 0.25, 'sine', 0.2); }
export function win(stars) {
  const notes = [523, 659, 784, 1047].slice(0, stars + 1);
  notes.forEach((f, i) => tone(f, i * 0.15, 0.3, 'triangle', 0.18));
}
