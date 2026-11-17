// Vorlesen mit der Sprachausgabe des Geräts (Web Speech API, Deutsch).
//
// Ablauf beim Buchstaben: erst langsam und deutlich der Buchstabe allein,
// kurze Pause, dann "E wie Elefant".

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voice = null;

// Bekannte gute deutsche Stimmen bekommen Vorrang (natürlicher Klang).
const PREFERRED = [/natural/i, /neural/i, /premium/i, /enhanced/i, /google/i, /anna/i, /petra/i, /helena/i, /katja/i, /marlene/i, /vicki/i];

function rank(v) {
  let r = 0;
  PREFERRED.forEach((re, i) => { if (re.test(v.name)) r = Math.max(r, 100 - i); });
  if (/de-DE/i.test(v.lang)) r += 20;
  if (v.localService) r += 5; // funktioniert auch offline
  if (/compact|espeak/i.test(v.name)) r -= 50;
  return r;
}

function pickVoice() {
  if (!synth) return;
  const voices = synth.getVoices().filter((v) => v.lang && /^de/i.test(v.lang));
  voices.sort((a, b) => rank(b) - rank(a));
  voice = voices[0] || null;
}

if (synth) {
  pickVoice();
  synth.addEventListener?.('voiceschanged', pickVoice);
}

export const canSpeak = () => !!synth;

// So spricht man die Buchstaben aus (damit die Stimme nicht z. B. "a" als Wort liest).
const NAMES = {
  A: 'A', B: 'Be', C: 'Ze', D: 'De', E: 'E', F: 'Eff', G: 'Ge', H: 'Ha', I: 'I', J: 'Jott',
  K: 'Ka', L: 'Ell', M: 'Emm', N: 'Enn', O: 'O', P: 'Pe', Q: 'Ku', R: 'Err', S: 'Ess',
  T: 'Te', U: 'U', V: 'Fau', W: 'We', X: 'Ix', Y: 'Üpsilon', Z: 'Zett',
  'Ä': 'Ä', 'Ö': 'Ö', 'Ü': 'Ü', 'ß': 'Eszett',
};

export function letterName(letter) {
  return NAMES[letter.upper || letter.lower] || letter.lower;
}

let queueId = 0;

function utter(text, rate, pitch) {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    // Manche Browser melden das Ende nicht zuverlässig: Sicherheits-Timeout.
    const t = setTimeout(resolve, 600 + text.length * 160);
    u.onend = u.onerror = () => { clearTimeout(t); resolve(); };
    synth.speak(u);
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Spricht mehrere Teile nacheinander mit Pausen. Neuer Aufruf bricht den alten ab. */
export async function speakParts(parts) {
  if (!synth) return;
  const id = ++queueId;
  synth.cancel();
  for (const p of parts) {
    if (id !== queueId) return;
    if (p.pause) { await wait(p.pause); continue; }
    await utter(p.text, p.rate ?? 0.85, p.pitch ?? 1.1);
  }
}

export function speak(text, { rate = 0.9, pitch = 1.1 } = {}) {
  return speakParts([{ text, rate, pitch }]);
}

export function stopSpeaking() {
  queueId++;
  synth?.cancel();
}

/** "E" … "E wie Elefant" */
export function sayLetter(letter) {
  const name = letterName(letter);
  const example = letter.lower === 'ß' ? `${name}, wie in ${letter.word}` : `${name} wie ${letter.word}`;
  return speakParts([
    { text: `${name}!`, rate: 0.7, pitch: 1.15 },
    { pause: 450 },
    { text: example, rate: 0.8, pitch: 1.1 },
  ]);
}

const PRAISE = {
  3: ['Super!', 'Toll gemacht!', 'Wow, perfekt!', 'Klasse!'],
  2: ['Gut gemacht!', 'Prima!', 'Schön!'],
  1: ['Weiter so!', 'Gar nicht schlecht!'],
  0: ['Probier es nochmal!'],
};

const TIPS = {
  missing: 'Da fehlt noch ein Strich.',
  direction: 'Fang beim grünen Punkt an und folge den Pfeilen.',
  extra: 'Nicht kritzeln, nur auf der Linie fahren.',
  shape: 'Achte auf die Form. Runde Teile schön rund.',
  accuracy: 'Fahr genau auf der Linie.',
};

export function feedbackText(result) {
  const list = PRAISE[result.stars] || PRAISE[0];
  const p = list[Math.floor(Math.random() * list.length)];
  const tip = result.stars < 3 ? TIPS[result.feedback] : '';
  return tip ? `${p} ${tip}` : p;
}
