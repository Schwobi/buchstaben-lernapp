// Bewertet, wie gut ein Kind einen Buchstaben nachgefahren hat.
//
// Jeder Buchstabe ist als Folge von Strichen mit Startpunkt und Richtung hinterlegt
// (siehe strokes.js). Die gemalten Striche des Kindes werden den Vorlage-Strichen
// zugeordnet und einzeln verglichen:
//  - Genauigkeit: mittlerer und größter Abstand zur Vorlage
//  - Form/Rundheit: zeigt die Linie überall in die gleiche Richtung wie die Vorlage (Kreis bleibt rund, Ecke bleibt Ecke)?
//  - Richtung: wurde am richtigen Punkt angesetzt und in die richtige Richtung gefahren?
//  - Vollständigkeit: fehlen Striche, gibt es überflüssige Kritzel?
// Alle Abstände sind in Buchstaben-Einheiten (Oberlinie bis Grundlinie = 100).

const N = 40; // Abtastpunkte pro Strich

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function pathLength(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i]);
  return l;
}

/** Punkte gleichmäßig entlang der Linie verteilen. */
export function resample(pts, n = N) {
  if (pts.length === 1) return Array.from({ length: n }, () => ({ ...pts[0] }));
  const total = pathLength(pts);
  if (total === 0) return Array.from({ length: n }, () => ({ ...pts[0] }));
  const step = total / (n - 1);
  const out = [{ ...pts[0] }];
  let acc = 0;
  let prev = pts[0];
  for (let i = 1; i < pts.length && out.length < n; i++) {
    let cur = pts[i];
    let d = dist(prev, cur);
    while (acc + d >= step && out.length < n) {
      const t = (step - acc) / d;
      const q = { x: prev.x + (cur.x - prev.x) * t, y: prev.y + (cur.y - prev.y) * t };
      out.push(q);
      prev = q;
      d = dist(prev, cur);
      acc = 0;
    }
    acc += d;
    prev = cur;
  }
  while (out.length < n) out.push({ ...pts[pts.length - 1] });
  return out;
}

/** Zittern glätten (gleitender Mittelwert), Endpunkte bleiben. */
function smooth(pts) {
  if (pts.length < 5) return pts;
  return pts.map((p, i) => {
    if (i === 0 || i === pts.length - 1) return p;
    const a = pts[Math.max(0, i - 2)], b = pts[i - 1], c = pts[i + 1], d = pts[Math.min(pts.length - 1, i + 2)];
    return { x: (a.x + b.x + 2 * p.x + c.x + d.x) / 6, y: (a.y + b.y + 2 * p.y + c.y + d.y) / 6 };
  });
}

/** Schreibrichtung an jeder Stelle der Linie (beschreibt die Form). */
function directions(pts) {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 1)];
    out.push(Math.atan2(b.y - a.y, b.x - a.x));
  }
  return out;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}

function minDistTo(p, pts) {
  let m = Infinity;
  for (const q of pts) m = Math.min(m, dist(p, q));
  return m;
}

/** Vergleicht einen gemalten Strich mit einem Vorlage-Strich. */
function compareStroke(child, ref) {
  if (ref.dot) {
    // Punkt: nur kurze Striche zählen, Abstand vom Mittelpunkt
    const len = pathLength(child.raw);
    if (len > 14) return null;
    const c = child.raw.reduce((a, p) => ({ x: a.x + p.x / child.raw.length, y: a.y + p.y / child.raw.length }), { x: 0, y: 0 });
    const d = dist(c, ref.points[0]);
    const q = clamp01(1 - (d - 4) / 14);
    return { q, accuracy: q, shape: 1, reversed: false };
  }
  if (child.length < 6) return null; // nur angetippt

  const r = ref.sampled;
  const fwd = child.sampled;
  const rev = [...fwd].reverse();
  const mean = (c) => c.reduce((s, p, i) => s + dist(p, r[i]), 0) / N;
  // Kandidaten: vorwärts, rückwärts und – bei geschlossenen Formen wie O –
  // an anderer Stelle angesetzt.
  const cands = [{ pts: fwd, reversed: false, shifted: false }, { pts: rev, reversed: true, shifted: false }];
  if (ref.closed) {
    for (const base of cands.slice()) {
      const ring = base.pts.slice(0, -1);
      for (let k = 1; k < 8; k++) {
        const off = Math.round((k * ring.length) / 8);
        const rot = [...ring.slice(off), ...ring.slice(0, off)];
        cands.push({ pts: resample([...rot, rot[0]], N), reversed: base.reversed, shifted: true });
      }
    }
  }
  for (const cd of cands) cd.d = mean(cd.pts);
  cands.sort((a, b) => a.d - b.d);
  // Kleine Unterschiede nicht als falsche Richtung werten
  let best = cands[0];
  const plain = cands.find((cd) => !cd.reversed && !cd.shifted);
  if (plain.d < best.d + 2) best = plain;
  const { reversed, shifted } = best;
  const c = best.pts;
  const dMean = best.d;

  // Größte Abweichung in beide Richtungen (verfehlte Teile / Ausreißer)
  let hd = 0;
  for (const p of r) hd = Math.max(hd, minDistTo(p, child.dense));
  for (const p of c) hd = Math.max(hd, minDistTo(p, ref.points));

  // Form: Krümmungsverlauf vergleichen (Rundheit, Ecken)
  const dc = directions(c), dr = ref.directions;
  let tErr = 0;
  for (let i = 0; i < dc.length; i++) tErr += angleDiff(dc[i], dr[i]);
  tErr /= dc.length;

  const accuracy = clamp01(1 - (dMean - 4) / 22) * Math.pow(clamp01(1 - (hd - 8) / 30), 0.7);
  const shape = clamp01(1 - (tErr - 0.1) / 0.75);
  let q = Math.pow(accuracy, 1.1) * Math.pow(shape, 1.3);
  if (reversed) q *= 0.6;
  else if (shifted) q *= 0.75;
  return { q, accuracy, shape, reversed: reversed || shifted };
}

function prepareChild(raw) {
  const s = smooth(raw);
  return {
    raw,
    length: pathLength(raw),
    sampled: resample(s, N),
    dense: resample(s, 80),
  };
}

function prepareRef(letter) {
  if (letter._prepared) return letter._prepared;
  const strokes = letter.strokes.map((s) => {
    if (s.dot) return { ...s };
    const sampled = resample(s.points, N);
    const closed = dist(s.points[0], s.points[s.points.length - 1]) < 3;
    return { ...s, sampled, closed, directions: directions(sampled) };
  });
  letter._prepared = strokes;
  return strokes;
}

function bestQ(child, refs) {
  let best = 0;
  for (const r of refs) {
    const res = compareStroke(child, r);
    if (res && res.q > best) best = res.q;
  }
  return best;
}

/**
 * @param {object} letter  Ergebnis von letterStrokes()
 * @param {Array<Array<{x,y}>>} drawn gemalte Striche in Buchstaben-Einheiten
 */
export function scoreTrace(letter, drawn) {
  const refs = prepareRef(letter);
  let childRaw = drawn.filter((s) => s.length > 0);
  const empty = { score: 0, points: 0, stars: 0, accuracy: 0, shape: 0, feedback: 'empty', strokes: [] };
  if (!childRaw.length) return empty;

  // Abgesetzte Teile eines Strichs zusammenfügen, wenn das besser zur Vorlage passt.
  let children = childRaw.map(prepareChild);
  for (let i = 0; i < children.length - 1; i++) {
    const a = children[i], b = children[i + 1];
    if (dist(a.raw[a.raw.length - 1], b.raw[0]) > 12) continue;
    const merged = prepareChild([...a.raw, ...b.raw]);
    if (bestQ(merged, refs) > Math.max(bestQ(a, refs), bestQ(b, refs)) + 0.05) {
      children.splice(i, 2, merged);
      i--;
    }
  }

  // Zuordnung: immer das am besten passende Paar zuerst.
  const pairs = [];
  refs.forEach((r, ri) => children.forEach((c, ci) => {
    const res = compareStroke(c, r);
    if (res && res.q > 0.05) pairs.push({ ri, ci, ...res });
  }));
  pairs.sort((a, b) => b.q - a.q);
  const refMatch = new Array(refs.length).fill(null);
  const usedChild = new Set();
  for (const p of pairs) {
    if (refMatch[p.ri] || usedChild.has(p.ci)) continue;
    refMatch[p.ri] = p;
    usedChild.add(p.ci);
  }

  // Gewichteter Mittelwert über alle Vorlage-Striche (fehlende zählen 0).
  let wSum = 0, qSum = 0, aSum = 0, sSum = 0;
  refs.forEach((r, i) => {
    const w = r.dot ? 12 : Math.max(20, r.length);
    const m = refMatch[i];
    wSum += w;
    if (m) { qSum += w * m.q; aSum += w * m.accuracy; sSum += w * m.shape; }
  });
  let score = qSum / wSum;

  // Überflüssige Striche (Kritzel) kosten Punkte.
  const extras = children.filter((c, i) => !usedChild.has(i) && c.length > 5).length;
  score *= Math.pow(0.85, extras);

  // Reihenfolge der Striche
  const order = refMatch.filter(Boolean).map((m) => m.ci);
  let inversions = 0;
  for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) if (order[i] > order[j]) inversions++;
  score *= Math.pow(0.95, inversions);

  score = clamp01(score);
  const points = Math.round(score * 100);
  const stars = points >= 85 ? 3 : points >= 65 ? 2 : points >= 40 ? 1 : 0;

  const missing = refMatch.filter((m) => !m).length;
  const reversed = refMatch.filter((m) => m && m.reversed).length;
  const accuracy = aSum / wSum, shape = sSum / wSum;
  let feedback = 'good';
  if (stars < 3) {
    if (missing) feedback = 'missing';
    else if (reversed) feedback = 'direction';
    else if (extras) feedback = 'extra';
    else if (shape < accuracy) feedback = 'shape';
    else feedback = 'accuracy';
  }

  return {
    score, points, stars, accuracy, shape, missing, reversed, extras, inversions, feedback,
    strokes: refMatch.map((m) => (m ? { q: m.q, reversed: m.reversed } : null)),
  };
}
