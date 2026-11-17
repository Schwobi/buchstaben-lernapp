// Schreibbewegungen für jeden Buchstaben (Druckschrift, angelehnt an die Grundschrift).
//
// Koordinaten: Oberlinie y=0, Mittellinie y=50, Grundlinie y=100, Unterlinie y=150.
// Großbuchstaben reichen von 0 bis 100, Kleinbuchstaben meist von 50 bis 100.
// Jeder Eintrag ist ein Strich in der richtigen Reihenfolge und Richtung
// (SVG-Pfad, Startpunkt = erster Punkt). Punkte (i, j, Umlaute) sind { dot: [x, y] }.
//
// SVG-Bögen: "A rx,ry 0 großerBogen richtung x,y" – richtung 0 = gegen den Uhrzeigersinn,
// 1 = im Uhrzeigersinn (auf dem Bildschirm).

// Bauch für a, d, g, q (gegen den Uhrzeigersinn, Mittelpunkt 25/75, Radius 25)
const BOWL_LEFT = 'M46.7,62.5 A25,25 0 1 0 46.7,87.5';
// Bauch für b, p (im Uhrzeigersinn)
const BOWL_RIGHT = 'M3.3,62.5 A25,25 0 1 1 3.3,87.5';
const O_UPPER = 'M45,0 A45,50 0 0 0 45,100 A45,50 0 0 0 45,0';
const O_LOWER = 'M25,50 A25,25 0 0 0 25,100 A25,25 0 0 0 25,50';
const U_UPPER = 'M0,0 L0,62 A32.5,38 0 0 0 65,62 L65,0';
const U_LOWER = ['M0,50 L0,75 A25,25 0 0 0 50,75 L50,50', 'M50,50 L50,100'];
const A_UPPER = ['M35,0 L0,100', 'M35,0 L70,100', 'M14,62 L56,62'];
const A_LOWER = [BOWL_LEFT, 'M50,50 L50,100'];

export const STROKES = {
  // ---------- Großbuchstaben ----------
  A: A_UPPER,
  B: ['M0,0 L0,100', 'M0,0 L28,0 A24,25 0 0 1 28,50 L0,50', 'M0,50 L32,50 A25,25 0 0 1 32,100 L0,100'],
  C: ['M79,15 A45,50 0 1 0 79,85'],
  D: ['M0,0 L0,100', 'M0,0 L18,0 C82,0 82,100 18,100 L0,100'],
  E: ['M0,0 L0,100', 'M0,0 L52,0', 'M0,50 L44,50', 'M0,100 L52,100'],
  F: ['M0,0 L0,100', 'M0,0 L52,0', 'M0,50 L44,50'],
  G: ['M79,15 A45,50 0 1 0 89.8,55', 'M55,55 L89.8,55'],
  H: ['M0,0 L0,100', 'M65,0 L65,100', 'M0,50 L65,50'],
  I: ['M0,0 L0,100'],
  J: ['M45,0 L45,75 A22.5,25 0 0 1 0,75'],
  K: ['M0,0 L0,100', 'M58,0 L3,52 L62,100'],
  L: ['M0,0 L0,100 L50,100'],
  M: ['M0,0 L0,100', 'M0,0 L40,65 L80,0 L80,100'],
  N: ['M0,0 L0,100', 'M0,0 L65,100 L65,0'],
  O: [O_UPPER],
  P: ['M0,0 L0,100', 'M0,0 L30,0 A25,25 0 0 1 30,50 L0,50'],
  Q: [O_UPPER, 'M55,72 L95,108'],
  R: ['M0,0 L0,100', 'M0,0 L30,0 A25,25 0 0 1 30,50 L0,50', 'M26,50 L60,100'],
  S: ['M68,14 C58,-2 6,-4 6,24 C6,50 70,44 70,74 C70,106 10,106 0,85'],
  T: ['M35,0 L35,100', 'M0,0 L70,0'],
  U: [U_UPPER],
  V: ['M0,0 L35,100 L70,0'],
  W: ['M0,0 L22,100 L45,10 L68,100 L90,0'],
  X: ['M0,0 L65,100', 'M65,0 L0,100'],
  Y: ['M0,0 L35,50', 'M70,0 L35,50 L35,100'],
  Z: ['M0,0 L65,0 L0,100 L65,100'],
  'Ä': [...A_UPPER, { dot: [20, -20] }, { dot: [50, -20] }],
  'Ö': [O_UPPER, { dot: [28, -20] }, { dot: [62, -20] }],
  'Ü': [U_UPPER, { dot: [16, -20] }, { dot: [49, -20] }],

  // ---------- Kleinbuchstaben ----------
  a: A_LOWER,
  b: ['M0,0 L0,100', BOWL_RIGHT],
  c: ['M42.7,57.3 A25,25 0 1 0 42.7,92.7'],
  d: [BOWL_LEFT, 'M50,0 L50,100'],
  e: ['M0,75 L50,75 A25,25 0 1 0 42.7,92.7'],
  f: ['M44,8 C36,-2 14,-2 14,22 L14,100', 'M0,50 L36,50'],
  g: [BOWL_LEFT, 'M50,50 L50,125 A24,25 0 0 1 2,125'],
  h: ['M0,0 L0,100', 'M0,74 C2,44 50,42 50,72 L50,100'],
  i: ['M0,50 L0,100', { dot: [0, 28] }],
  j: ['M25,50 L25,128 C25,152 4,153 0,140', { dot: [25, 28] }],
  k: ['M0,0 L0,100', 'M44,50 L3,78 L48,100'],
  l: ['M0,0 L0,100'],
  m: ['M0,50 L0,100', 'M0,74 C2,46 38,44 38,70 L38,100', 'M38,74 C40,46 76,44 76,70 L76,100'],
  n: ['M0,50 L0,100', 'M0,74 C2,44 50,42 50,72 L50,100'],
  o: [O_LOWER],
  p: ['M0,50 L0,150', BOWL_RIGHT],
  q: [BOWL_LEFT, 'M50,50 L50,150'],
  r: ['M0,50 L0,100', 'M0,76 C3,54 22,48 40,55'],
  s: ['M40,57 C32,47 4,48 4,62 C4,77 42,72 42,88 C42,105 8,104 0,93'],
  t: ['M15,18 L15,88 C15,102 30,103 38,96', 'M0,50 L36,50'],
  u: U_LOWER,
  v: ['M0,50 L25,100 L50,50'],
  w: ['M0,50 L17,100 L35,56 L53,100 L70,50'],
  x: ['M0,50 L45,100', 'M45,50 L0,100'],
  y: ['M0,50 L30,100', 'M52,50 L12,150'],
  z: ['M0,50 L45,50 L0,100 L45,100'],
  'ä': [...A_LOWER, { dot: [12, 32] }, { dot: [40, 32] }],
  'ö': [O_LOWER, { dot: [12, 32] }, { dot: [38, 32] }],
  'ü': [...U_LOWER, { dot: [10, 32] }, { dot: [40, 32] }],
  'ß': ['M0,100 L0,26 C0,-2 46,-2 46,22 C46,40 26,44 22,48 C58,50 58,104 14,98'],
};

// ---------- Abtasten der Pfade ----------
// Wir nutzen den Browser (SVGPathElement), um Pfade gleichmäßig abzutasten.
let svgPath = null;
function pathEl() {
  if (!svgPath) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.style.visibility = 'hidden';
    svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.appendChild(svgPath);
    document.body.appendChild(svg);
  }
  return svgPath;
}

const cache = new Map();

/**
 * Liefert die Striche eines Buchstabens als Punktlisten (in Buchstaben-Einheiten)
 * plus Begrenzungsrahmen. Ergebnis wird zwischengespeichert.
 */
export function letterStrokes(ch) {
  if (cache.has(ch)) return cache.get(ch);
  const defs = STROKES[ch];
  if (!defs) return null;
  const strokes = defs.map((d) => {
    if (typeof d === 'object') return { dot: true, points: [{ x: d.dot[0], y: d.dot[1] }], length: 0 };
    const p = pathEl();
    p.setAttribute('d', d);
    const len = p.getTotalLength();
    const n = Math.max(8, Math.ceil(len / 2));
    const points = [];
    for (let i = 0; i <= n; i++) {
      const pt = p.getPointAtLength((len * i) / n);
      points.push({ x: pt.x, y: pt.y });
    }
    return { dot: false, points, length: len, d };
  });
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const s of strokes) {
    for (const pt of s.points) {
      minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x);
      minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y);
    }
  }
  const res = { char: ch, strokes, box: { minX, maxX, minY, maxY } };
  cache.set(ch, res);
  return res;
}
