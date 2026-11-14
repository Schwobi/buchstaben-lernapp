// Vorlesen mit der Sprachausgabe des Geräts (Web Speech API, Deutsch).

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voice = null;

function pickVoice() {
  if (!synth) return;
  const voices = synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('de'));
  // Lokale Stimmen bevorzugen, damit es auch offline klappt.
  voice = voices.find((v) => v.localService && /de-DE/i.test(v.lang))
    || voices.find((v) => /de-DE/i.test(v.lang))
    || voices[0]
    || null;
}

if (synth) {
  pickVoice();
  synth.addEventListener?.('voiceschanged', pickVoice);
}

export const canSpeak = () => !!synth;

export function speak(text, { rate = 0.85, pitch = 1.1 } = {}) {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  if (voice) u.voice = voice;
  u.rate = rate;
  u.pitch = pitch;
  synth.speak(u);
}

/** "A wie Affe" – bei Kleinbuchstaben gleiches Beispielwort. */
export function letterText(letter) {
  if (letter.say) return letter.say;
  return `${letter.upper}. ${letter.upper} wie ${letter.word}.`;
}

const PRAISE = {
  3: ['Super!', 'Toll gemacht!', 'Wow, perfekt!', 'Klasse!'],
  2: ['Gut gemacht!', 'Prima!', 'Schön!'],
  1: ['Weiter so!', 'Gar nicht schlecht!'],
  0: ['Probier es nochmal!', 'Fahr genau auf dem Buchstaben!'],
};

export function praise(stars) {
  const list = PRAISE[stars] || PRAISE[0];
  return list[Math.floor(Math.random() * list.length)];
}
