// Bewertet, wie gut ein Kind einen Buchstaben nachgefahren hat.
//
// Idee: Der Buchstabe wird als Maske gezeichnet. Dann messen wir zwei Dinge:
//  - Abdeckung: Wie viel vom Buchstaben wurde mit dem Stift "überfahren"?
//  - Genauigkeit: Wie viel der gemalten Linie liegt auf dem Buchstaben?
// Beides wird zu einer Punktzahl von 0 bis 100 verrechnet.

const SIZE = 160; // interne Auflösung der Bewertung (schnell genug für Tablets)

function makeCtx(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement('canvas'), { width: w, height: h });
  return c.getContext('2d', { willReadFrequently: true });
}

function alphaMask(ctx) {
  const { data } = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const m = new Uint8Array(data.length / 4);
  for (let i = 0; i < m.length; i++) m[i] = data[i * 4 + 3] > 100 ? 1 : 0;
  return m;
}

/** Ungefähre Strichbreite eines Buchstabens: 2 * Fläche / Umfang. */
function strokeWidth(mask, w, h) {
  let area = 0, edge = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      area++;
      if (!mask[i - 1] || !mask[i + 1] || !mask[i - w] || !mask[i + w]) edge++;
    }
  }
  return edge ? (2 * area) / edge : 1;
}

function drawStrokes(ctx, strokes, scale, lineWidth) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  for (const s of strokes) {
    if (!s.length) continue;
    if (s.length === 1) {
      ctx.beginPath();
      ctx.arc(s[0].x * scale, s[0].y * scale, lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(s[0].x * scale, s[0].y * scale);
    for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x * scale, s[i].y * scale);
    ctx.stroke();
  }
}

/**
 * @param {object} glyph  { char, font, x, y, width, height } in Canvas-Koordinaten
 * @param {Array<Array<{x,y}>>} strokes gemalte Linien in Canvas-Koordinaten
 * @returns {{coverage:number, precision:number, score:number, points:number, stars:number}}
 */
export function scoreTrace(glyph, strokes) {
  const empty = { coverage: 0, precision: 0, score: 0, points: 0, stars: 0 };
  if (!strokes.some((s) => s.length)) return empty;

  const scale = SIZE / Math.max(glyph.width, glyph.height);
  const w = Math.round(glyph.width * scale);
  const h = Math.round(glyph.height * scale);
  const fontPx = glyph.fontSize * scale;
  const font = glyph.font.replace(/[\d.]+px/, `${fontPx}px`);

  // 1. Buchstabenmaske
  const g = makeCtx(w, h);
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillText(glyph.char, glyph.x * scale, glyph.y * scale);
  const glyphMask = alphaMask(g);
  const sw = strokeWidth(glyphMask, w, h);

  // 2. Toleranzzone: Buchstabe plus ein Rand
  const t = makeCtx(w, h);
  t.font = font;
  t.textAlign = 'center';
  t.textBaseline = 'alphabetic';
  t.lineJoin = 'round';
  t.lineWidth = Math.max(3, sw * 0.7);
  t.fillText(glyph.char, glyph.x * scale, glyph.y * scale);
  t.strokeText(glyph.char, glyph.x * scale, glyph.y * scale);
  const tolMask = alphaMask(t);

  // 3. Breit gemalte Linie (für die Abdeckung)
  const thick = makeCtx(w, h);
  drawStrokes(thick, strokes, scale, sw * 1.6);
  const thickMask = alphaMask(thick);

  // 4. Dünn gemalte Linie (für die Genauigkeit)
  const thin = makeCtx(w, h);
  drawStrokes(thin, strokes, scale, Math.max(2, sw * 0.35));
  const thinMask = alphaMask(thin);

  let glyphPx = 0, covered = 0, ink = 0, inkInside = 0;
  for (let i = 0; i < glyphMask.length; i++) {
    if (glyphMask[i]) {
      glyphPx++;
      if (thickMask[i]) covered++;
    }
    if (thinMask[i]) {
      ink++;
      if (tolMask[i]) inkInside++;
    }
  }
  if (!glyphPx || !ink) return empty;

  const coverage = covered / glyphPx;
  const precision = inkInside / ink;

  // Gegen wildes Kritzeln: gemalte Linie viel länger als der Buchstabe?
  let inkLen = 0;
  for (const s of strokes) {
    for (let i = 1; i < s.length; i++) inkLen += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
  }
  const letterLen = glyphPx / sw; // ungefähre Länge des Buchstabens
  const lengthRatio = (inkLen * scale) / letterLen;
  const lengthFactor = lengthRatio > 1.5 ? Math.pow(1.5 / lengthRatio, 1.2) : 1;
  // Kinder sollen nicht zu streng bewertet werden: leichte Kurve nach oben.
  const c = Math.min(1, coverage / 0.92);
  const p = Math.min(1, precision / 0.9);
  const score = Math.pow(c, 2) * Math.pow(p, 1.5) * lengthFactor;
  const points = Math.round(score * 100);
  const stars = score >= 0.8 ? 3 : score >= 0.55 ? 2 : score >= 0.25 ? 1 : 0;
  return { coverage, precision, lengthRatio, score, points, stars };
}
