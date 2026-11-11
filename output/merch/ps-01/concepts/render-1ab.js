// PS[01] Seed Mode, round 3: two versions of the chosen concept.
//   1A "Graphic": the real logo as the fire over a SHIFT pixel night city.
//   1B "Sashiko": the real logo sewn onto an asanoha (hemp leaf) stitched moon.
// Both: black tee, eyes-only front with printed black pupils, black seed PRINTED (not knocked out).
//   node render-1ab.js        both
//   node render-1ab.js 1B     one
const R = require('./render.js');
const { chromium, P, CM, DPI_SCALE, CREAM, GOLD, mascot, rectsSVG, tee, shade, OUT } = R;
const fs = require('fs');

const ONLY = process.argv[2];
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Kodchasan:wght@700&family=Space+Mono:wght@700&family=Tiny5&display=swap" rel="stylesheet">`;
const c = v => +(v * CM).toFixed(2);                  // cm -> css px
const TEE = '#161616';

// ---------- logo placement (cm) ----------
const LOGO_W = 22, VB = [40, 5, 925, 950];
const S = LOGO_W / VB[2];                             // cm per logo unit
const LOGO_H = LOGO_W * VB[3] / VB[2];
const DISC_R = 453 * S;
const logo = (id, x, y, opts = {}) => `<g transform="translate(${c(x)} ${c(y)})">${mascot({ w: c(LOGO_W), id, vb: VB, ...opts })}</g>`;
const eyes = id => mascot({ w: c(16), id, only: 'eyes', vb: [248, 396, 452, 286] });   // white eyes + brows, black pupils printed

const text = (x, y, str, { size, fill = CREAM, anchor = 'start', font = 'Tiny5', weight = 400, fit, ls = 0 }) =>
  `<text x="${c(x)}" y="${c(y)}" ${fit ? `class="fit" data-w="${c(fit)}"` : ''} text-anchor="${anchor}" font-family="${font}" font-weight="${weight}" font-size="${c(size)}" letter-spacing="${c(ls)}" fill="${fill}">${str}</text>`;
const wordmark = (cx, baseline, w) => text(cx, baseline, 'PassionSeed', { size: 3, font: 'Kodchasan', weight: 700, anchor: 'middle', fit: w, ls: -0.03 });
const stitchLines = (list, color, t = 0.12) => `<g transform="scale(${CM})" fill="none" stroke="${color}" stroke-width="${t}" stroke-linecap="round">${
  list.map(([x1, y1, x2, y2]) => `<line x1="${x1.toFixed(3)}" y1="${y1.toFixed(3)}" x2="${x2.toFixed(3)}" y2="${y2.toFixed(3)}"/>`).join('')}</g>`;
const art = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${c(w)}" height="${c(h)}" viewBox="0 0 ${c(w)} ${c(h)}" style="display:block;overflow:visible">${body}</svg>`;

// ================= 1A: pixel night city =================
const A = { W: 24, H: 33.5, cell: 0.4, cols: 60, base: 63, water: 6, lx: 1, ly: 0 };
// [first column, width, wanted height] in 4 mm pixels; heights are clamped so nothing touches the logo.
A.near = [[0, 4, 21], [4, 4, 14], [8, 4, 17], [12, 5, 9], [17, 3, 11], [20, 6, 6], [26, 4, 4], [30, 5, 6], [35, 4, 3], [39, 5, 7], [44, 3, 10], [47, 4, 8], [51, 4, 16], [55, 5, 19]];
A.far = [[2, 4, 26], [15, 4, 12], [42, 4, 12], [49, 4, 22], [53, 4, 24]];
A.stars = [[3, 4, '+'], [8, 1, '.'], [1, 11, '.'], [6, 8, '.']];
A.pal = { F: '#3d1433', N: '#64204f', W: '#3d1433', L: GOLD, S: CREAM };

async function buildCity(page) {
  return page.evaluate(({ P, A, S, VB }) => {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.lineJoin = 'round';
    const sil = [P.clip, P.flame, ...P.tongues].map(d => new Path2D(d));
    const hit = (X, Y, gap) => {
      const u = VB[0] + (X - A.lx) / S, v = VB[1] + (Y - A.ly) / S;
      ctx.lineWidth = 2 * gap / S;
      return sil.some(p => ctx.isPointInPath(p, u, v) || ctx.isPointInStroke(p, u, v));
    };
    const clear = (col, row) => [[0, 0], [1, 0], [0, 1], [1, 1], [.5, .5]].every(([a, b]) => !hit((col + a) * A.cell, (row + b) * A.cell, 0.42));
    let seed = 20261110; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const g = Array.from({ length: A.base + A.water }, () => Array(A.cols).fill('.'));
    const put = (list, ch, windows) => list.forEach(([x, w, want]) => {
      let h = 0;
      while (h < want && Array.from({ length: w }, (_, i) => clear(x + i, A.base - h - 1)).every(Boolean)) h++;
      for (let r = A.base - h; r < A.base; r++) for (let i = 0; i < w; i++) g[r][x + i] = ch;
      if (!windows || h < 4) return;
      for (let r = A.base - h + 1; r < A.base - 1; r += 2) for (let i = 1; i < w - 1; i += 2) g[r][x + i] = rnd() < 0.3 ? 'L' : 'W';
    });
    put(A.far, 'F', false); put(A.near, 'N', true);
    // roof furniture: an antenna and a water tank, like the SHIFT[1] skyline
    const top = col => g.findIndex(row => row[col] !== '.');
    const t0 = top(1); for (let k = 1; k <= 4; k++) g[t0 - k][1] = 'N'; g[t0 - 3][0] = 'N'; g[t0 - 3][2] = 'N';
    const t1 = top(57); g[t1 - 1][56] = 'N'; g[t1 - 1][58] = 'N'; for (const cc of [56, 57, 58]) { g[t1 - 2][cc] = 'N'; g[t1 - 3][cc] = 'N'; }
    for (const [x, y, kind] of A.stars) {
      g[y][x] = 'S';
      if (kind === '+') { g[y - 1][x] = g[y + 1][x] = g[y][x - 1] = g[y][x + 1] = 'S'; }
    }
    // water: the skyline's reflection as broken dashes that thin out, lit windows echoed in gold
    const lit = col => { for (let r = A.base - 1; r >= 0; r--) if (g[r][col] === 'L') return true; return false; };
    [[1, 0.9, 7], [3, 0.6, 4], [5, 0.34, 3]].forEach(([dr, fill, maxLen]) => {
      const r = A.base + dr;
      for (let x = 0; x < A.cols;) {
        const len = 1 + Math.floor(rnd() * maxLen);
        if (rnd() < fill) for (let i = x; i < Math.min(A.cols, x + len); i++) g[r][i] = lit(i) && rnd() < 0.75 ? 'L' : (dr === 1 ? 'N' : 'F');
        x += len + (rnd() < fill ? 1 : 2);
      }
    });
    return g.map(r => r.join(''));
  }, { P, A, S, VB });
}
const backA = ctx => art(A.W, A.H, `
  ${rectsSVG(ctx.city, A.pal, c(A.cell))}
  ${logo('la', A.lx, A.ly)}
  ${wordmark(A.W / 2, 31.45, A.W)}
  ${text(0.05, 33.3, 'PS[01] SEED MODE', { size: 0.8, ls: 0.05 })}
  ${text(A.W - 0.05, 33.3, 'LIGHTS ON, STILL BUILDING', { size: 0.8, ls: 0.05, anchor: 'end', fill: GOLD })}`);

// ================= 1B: asanoha sashiko =================
// A stitched cloth panel (like a hanafukin sampler) with the logo sewn over it; only the fire escapes the border.
const B = { W: 24.6, a: 2.6, t: 0.12, lx: 1.3, ly: 0, x0: 0.3, x1: 24.3, y0: 6, y1: 28.4, inner: 0.55, gap: 0.5 };
B.disc = { x: B.lx + (500 - VB[0]) * S, y: B.ly + (500 - VB[1]) * S };
B.h = B.a * Math.sqrt(3) / 2;
B.anchor = { x: (B.x0 + B.x1) / 2 - 3 * B.h, y: 25.2 };   // the gold star: lower left, opposite the flame
B.H = B.y1 + 5.8;

/** Asanoha lattice segments around (cx, cy): triangular grid of side a (vertical edges) + centroid spokes. */
function asanoha(cx, cy, a, reach) {
  const h = a * Math.sqrt(3) / 2, segs = [], n = Math.ceil(reach / h) + 1;
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const x = cx + i * h, y = cy + j * a + (Math.abs(i) % 2) * a / 2;
    const v = [x, y], up = [x, y + a], r1 = [x + h, y + a / 2], r2 = [x + h, y - a / 2];
    segs.push([v, up, 'e'], [v, r1, 'e'], [v, r2, 'e']);
    const c1 = [x + 2 * h / 3, y], c2 = [x + h / 3, y + a / 2];
    segs.push([v, c1, 's'], [r1, c1, 's'], [r2, c1, 's'], [v, c2, 's'], [up, c2, 's'], [r1, c2, 's']);   // vertex first, centroid second
  }
  return segs;
}
/** Break a segment into hand-length running stitches. Vertices get a wide gap (12 lines meet there). */
function stitchSeg([p, q, kind], rnd, { len = 0.38, gap = 0.22, vGap = 0.45, cGap = 0.2 } = {}) {
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]), ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L;
  const g0 = vGap, g1 = kind === 'e' ? vGap : cGap, U = L - g0 - g1;
  const n = Math.max(1, Math.round((U + gap) / (len + gap))), sl = (U - (n - 1) * gap) / n, out = [];
  for (let k = 0; k < n; k++) {
    const j = (rnd() - 0.5) * 0.05, w = (rnd() - 0.5) * 0.03, tilt = (rnd() - 0.5) * 0.03;      // hand wobble
    const s0 = g0 + k * (sl + gap) + j + B.t / 2, s1 = g0 + k * (sl + gap) + sl + j - B.t / 2;
    out.push([p[0] + ux * s0 - uy * (w - tilt), p[1] + uy * s0 + ux * (w - tilt), p[0] + ux * s1 - uy * (w + tilt), p[1] + uy * s1 + ux * (w + tilt)]);
  }
  return out;
}
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/** Running stitches along a straight line, starting and ending on a stitch. */
function runLine(x1, y1, x2, y2, rnd, pitch = 0.64, len = 0.4) {
  const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  const n = Math.round((L + pitch - len) / pitch), p = (L - len) / (n - 1), out = [];
  for (let k = 0; k < n; k++) {
    const j = rnd ? (rnd() - 0.5) * 0.04 : 0, s0 = k * p + j + B.t / 2, s1 = k * p + len + j - B.t / 2;
    out.push([x1 + ux * s0, y1 + uy * s0, x1 + ux * s1, y1 + uy * s1]);
  }
  return out;
}
async function buildSashiko(page) {
  const rnd = mulberry(7), all = [];
  for (const seg of asanoha(B.anchor.x, B.anchor.y, B.a, 34)) {
    const star = seg.slice(0, 2).some(p => Math.hypot(p[0] - B.anchor.x, p[1] - B.anchor.y) < 0.01);
    for (const st of stitchSeg(seg, rnd)) all.push({ st, star });
  }
  const rect = (i) => [[B.x0 + i, B.y0 + i, B.x1 - i, B.y0 + i], [B.x1 - i, B.y0 + i, B.x1 - i, B.y1 - i], [B.x1 - i, B.y1 - i, B.x0 + i, B.y1 - i], [B.x0 + i, B.y1 - i, B.x0 + i, B.y0 + i]]
    .flatMap(l => runLine(...l, rnd));
  const border = [...rect(0), ...rect(B.inner)];
  return page.evaluate(({ P, B, S, VB, all, border }) => {
    const ctx = document.createElement('canvas').getContext('2d'); ctx.lineJoin = 'round';
    const sil = [P.clip, P.flame, ...P.tongues].map(d => new Path2D(d));
    const hit = (X, Y, gap) => { const u = VB[0] + (X - B.lx) / S, v = VB[1] + (Y - B.ly) / S; ctx.lineWidth = 2 * gap / S; return sil.some(p => ctx.isPointInPath(p, u, v) || ctx.isPointInStroke(p, u, v)); };
    const m = B.inner + 0.42;
    const inPanel = (X, Y) => X > B.x0 + m && X < B.x1 - m && Y > B.disc.y + 1.7 && Y < B.y1 - m;   // pattern starts where the corners open up
    const pts = ([x1, y1, x2, y2]) => [[x1, y1], [x2, y2], [(x1 + x2) / 2, (y1 + y2) / 2]];
    const field = all.filter(s => pts(s.st).every(([x, y]) => inPanel(x, y) && !hit(x, y, B.gap)));
    return { field: field.filter(s => !s.star).map(s => s.st), star: field.filter(s => s.star).map(s => s.st),
      border: border.filter(st => pts(st).every(([x, y]) => !hit(x, y, B.gap))) };
  }, { P, B, S, VB, all, border });
}
const backB = ctx => {
  const cx = B.W / 2, base = B.y1 + 3.95;
  return art(B.W, B.H, `
  ${stitchLines(ctx.sashiko.field, CREAM, B.t)}${stitchLines(ctx.sashiko.border, CREAM, B.t)}${stitchLines(ctx.sashiko.star, GOLD, B.t)}
  ${logo('lb', B.lx, B.ly)}
  ${wordmark(cx, base, B.x1 - B.x0)}
  ${text(B.x0, base + 1.55, 'PS[01] SEED MODE', { size: 0.62, font: "'Space Mono'", weight: 700, ls: 0.07 })}
  ${text(B.x1, base + 1.55, 'GROW FAST, GROW STRAIGHT', { size: 0.62, font: "'Space Mono'", weight: 700, ls: 0.07, anchor: 'end', fill: GOLD })}`);
};
/** One asanoha star for the front hem: the spot to over-stitch by hand later. */
function hemStar() {
  const a = 2.2, w = 2 * a + 0.5, rnd = mulberry(3), cx = w / 2, list = [];
  for (const seg of asanoha(cx, cx, a, a * 2)) {
    const dist = seg.slice(0, 2).map(p => Math.hypot(p[0] - cx, p[1] - cx));
    if (dist.some(v => v > a + 0.01) || dist.every(v => Math.abs(v - a) < 0.01)) continue;
    list.push(...stitchSeg(seg, rnd, { len: 0.36, gap: 0.2, vGap: 0.4, cGap: 0.18 }));
  }
  return art(w, w, stitchLines(list, CREAM, B.t));
}

// ================= versions =================
const NECK = 2.8, COLLAR = 9.8;
const versions = {
  '1A': {
    name: 'SEED MODE / A GRAPHIC',
    prints: { front: () => eyes('ea'), back: backA },
    place: { front: { cx: 0, top: COLLAR + 4 }, back: { cx: 0, top: NECK + 5.5 } },
    notes: { front: 'eyes 16 cm, white with printed black pupils', back: 'logo 22 cm over a pixel night city, 24 x 33.5 cm overall' },
  },
  '1B': {
    name: 'SEED MODE / B SASHIKO',
    prints: { front: () => eyes('eb'), hem: hemStar, back: backB },
    place: { front: { cx: 0, top: COLLAR + 4 }, hem: { cx: 18.5, top: 58.5, side: 'front' }, back: { cx: 0, top: NECK + 5.5 } },
    notes: { front: 'eyes 16 cm + one 5 cm stitched star at the hem', back: 'logo 22 cm rising out of a 24 x 22 cm asanoha stitched panel' },
  },
};

function mockupHTML(n, v, sizes) {
  const Wpx = 2760, Hpx = 1330, top = 150;
  const mk = (side, cx, seed) => tee({ id: side[0] + n, color: TEE, side, x: cx, y: top, seed,
    prints: Object.entries(sizes).filter(([k]) => (v.place[k].side || k) === side).map(([k, s]) =>
      ({ href: `file://${OUT}concept-${n}-${k}.png`, w: s.w, h: s.h, x: v.place[k].cx - s.w / 2, y: v.place[k].top })) });
  const cap = (x, t, sub) => `<text x="${x}" y="${Hpx - 92}" text-anchor="middle" font-family="'Space Mono',monospace" font-weight="700" font-size="21" letter-spacing="3" fill="rgba(20,20,20,0.72)">${t}</text>
    <text x="${x}" y="${Hpx - 60}" text-anchor="middle" font-family="'Space Mono',monospace" font-weight="700" font-size="16" letter-spacing="1" fill="rgba(20,20,20,0.45)">${sub}</text>`;
  const bg = '#dcd9d4';
  return `<html><head>${FONTS}<style>html,body{margin:0}</style></head><body>
  <svg id="art" xmlns="http://www.w3.org/2000/svg" width="${Wpx}" height="${Hpx}" viewBox="0 0 ${Wpx} ${Hpx}" style="display:block">
    <defs><radialGradient id="bg" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="${shade(bg, 0.22)}"/><stop offset="1" stop-color="${shade(bg, -0.1)}"/></radialGradient></defs>
    <rect width="${Wpx}" height="${Hpx}" fill="url(#bg)"/>
    <text x="70" y="78" font-family="'Space Mono',monospace" font-weight="700" font-size="22" letter-spacing="3" fill="rgba(20,20,20,0.72)">PS[01] / CONCEPT ${n[0]} / ${v.name}</text>
    ${mk('front', 715, 11)}${mk('back', 2045, 12)}
    ${cap(715, 'FRONT', v.notes.front)}${cap(2045, 'BACK', v.notes.back)}
  </svg></body></html>`;
}

const loadFonts = page => page.evaluate(async () => {
  await Promise.all([document.fonts.load('700 100px Kodchasan'), document.fonts.load("700 20px 'Space Mono'"), document.fonts.load('20px Tiny5')]);
  await document.fonts.ready;
  for (const el of document.querySelectorAll('text.fit')) {
    const fsz = parseFloat(el.getAttribute('font-size'));
    el.setAttribute('font-size', fsz * (+el.dataset.w) / el.getComputedTextLength());
  }
});

(async () => {
  const browser = await chromium.launch();
  const helper = await browser.newPage();
  const ctx = { city: await buildCity(helper), sashiko: await buildSashiko(helper) };
  for (const [n, v] of Object.entries(versions)) {
    if (ONLY && ONLY !== n) continue;
    const sizes = {};
    for (const [side, make] of Object.entries(v.prints)) {
      const page = await browser.newPage({ deviceScaleFactor: DPI_SCALE, viewport: { width: 1500, height: 2000 } });
      await page.setContent(`<html><head>${FONTS}<style>html,body{margin:0;background:transparent}</style></head><body><div id="art" style="display:inline-block">${make(ctx)}</div></body></html>`);
      await loadFonts(page);
      await page.waitForTimeout(250);
      const box = await page.locator('#art').boundingBox();
      await page.locator('#art').screenshot({ path: `${OUT}concept-${n}-${side}.png`, omitBackground: true });
      sizes[side] = { w: box.width / CM, h: box.height / CM };
      console.log(`concept-${n}-${side}.png`, sizes[side].w.toFixed(1) + ' x ' + sizes[side].h.toFixed(1) + ' cm');
      await page.close();
    }
    const html = OUT + `.mockup-${n}.html`;
    fs.writeFileSync(html, mockupHTML(n, v, sizes));
    const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 2760, height: 1330 } });
    await page.goto('file://' + html);
    await page.evaluate(async () => { await document.fonts.load("700 20px 'Space Mono'"); await document.fonts.ready; });
    await page.waitForTimeout(400);
    await page.locator('#art').screenshot({ path: `${OUT}concept-${n}-mockup.png` });
    await page.close();
    fs.unlinkSync(html);
    console.log(`concept-${n}-mockup.png`);
  }
  await browser.close();
})();
