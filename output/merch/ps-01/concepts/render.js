// PS[01] concept round 2: three bold directions. Renders print files (transparent, 300 dpi,
// real size) and product mockups (front + back).
//   node render.js            all concepts
//   node render.js 2          one concept
const PLAYWRIGHT = process.env.PLAYWRIGHT_PATH ||
  '/private/tmp/claude-501/-Users-bunyasit-dev-passionseed-web/00f6de66-cbf2-41cb-a7f2-4b744572efd9/scratchpad/print/node_modules/playwright';
const { chromium } = require(PLAYWRIGHT);
const fs = require('fs');
const path = require('path');

const OUT = __dirname + '/';
const ONLY = process.argv[2];
const CM = 96 / 2.54, DPI_SCALE = 300 / 96;
const CREAM = '#f8f5ec', INK = '#172836', GOLD = '#ffc33e', EMBER = '#ef7926';
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Kodchasan:wght@700&family=Space+Mono:wght@700&display=swap" rel="stylesheet">`;

// ---------- the real logo, as vectors ----------
const SVG = fs.readFileSync(path.join(__dirname, '../../../../public/passionseed-logo.svg'), 'utf8');
const ds = [...SVG.matchAll(/<path(?: class="[^"]+")? d="([^"]+)"\/>/g)].map(m => m[1]);
const P = {
  clip: ds[0], flame: ds[1], seed: ds[2], eyes: [ds[3], ds[4]], brows: [ds[5], ds[6]],
  pupils: [ds[7], ds[8]], tongues: ds.slice(9, 13),
};
const DISC = SVG.match(/xlink:href="(data:image\/png;base64,[^"]+)"/)[1];
if (ds.length !== 13) throw new Error('logo svg changed: expected 13 paths, got ' + ds.length);

// Tongue colours are the logo's hard-light blend, resolved to solid inks.
const T_OUT = '#ff9127', T_FLAME = '#ffe31e', T_SEED = '#ff8700';

/** The logo at any size. knockSeed/knockPupils leave the garment showing (black tee). */
function mascot({ w, id, disc = true, knockSeed = false, knockPupils = false, keyline = 0, keyColor = CREAM,
  vb = [40, 15, 925, 945], only }) {
  const [x, y, vw, vh] = vb, h = w * vh / vw;
  const big = `x="-200" y="-200" width="1400" height="1400"`;
  const eyes = `<g ${knockPupils ? `mask="url(#${id}mp)"` : ''}>${P.eyes.concat(P.brows).map(d => `<path d="${d}" fill="#fff"/>`).join('')}</g>
    ${knockPupils ? '' : P.pupils.map(d => `<path d="${d}" fill="#000"/>`).join('')}`;
  const defs = `<defs>
    <clipPath id="${id}cd"><path d="${P.clip}"/></clipPath>
    <clipPath id="${id}cf"><path d="${P.flame}"/></clipPath>
    <clipPath id="${id}cs"><path d="${P.seed}"/></clipPath>
    <mask id="${id}ms" maskUnits="userSpaceOnUse" ${big}><rect ${big} fill="#fff"/><path d="${P.seed}" fill="#000"/></mask>
    <mask id="${id}mp" maskUnits="userSpaceOnUse" ${big}><rect ${big} fill="#fff"/>${P.pupils.map(d => `<path d="${d}" fill="#000"/>`).join('')}</mask>
  </defs>`;
  const open = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${x} ${y} ${vw} ${vh}" style="display:block;overflow:visible">`;
  if (only === 'eyes') return `${open}${defs}${eyes}</svg>`;
  const k = keyline ? [P.clip, P.flame, ...P.tongues].map(d =>
    `<path d="${d}" fill="${keyColor}" stroke="${keyColor}" stroke-width="${keyline * 2}" stroke-linejoin="round"/>`).join('') : '';
  return `${open}${defs}${k}
    <g ${knockSeed ? `mask="url(#${id}ms)"` : ''}>
      ${disc ? `<g clip-path="url(#${id}cd)"><image width="1890" height="1880" transform="translate(46.54 48.84) scale(.48)" xlink:href="${DISC}"/></g>` : ''}
      <path d="${P.flame}" fill="${GOLD}"/>
    </g>
    ${knockSeed ? '' : `<path d="${P.seed}" fill="#000"/>`}
    ${eyes}
    ${P.tongues.map(d => `<path d="${d}" fill="${T_OUT}"/><path d="${d}" fill="${T_FLAME}" clip-path="url(#${id}cf)"/><path d="${d}" fill="${T_SEED}" clip-path="url(#${id}cs)"/>`).join('')}
  </svg>`;
}
const wordmark = (wCm, color) =>
  `<span class="fit" data-w="${wCm * CM}" style="display:inline-block;font:700 100px/0.9 Kodchasan,sans-serif;letter-spacing:-0.01em;color:${color};white-space:nowrap">PassionSeed</span>`;
const mono = (pt, color, text) =>
  `<div style="font:700 ${pt * 96 / 72}px/1 'Space Mono',monospace;letter-spacing:0.06em;color:${color};white-space:nowrap">${text}</div>`;

// ---------- pixel helpers ----------
function rectsSVG(rows, palette, cell) {
  let s = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const ch = row[x]; let n = 1;
      while (x + n < row.length && row[x + n] === ch) n++;
      if (palette[ch]) s += `<rect x="${x * cell}" y="${y * cell}" width="${n * cell + 0.03}" height="${cell + 0.03}" fill="${palette[ch]}"/>`;
      x += n;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${rows[0].length * cell}" height="${rows.length * cell}" shape-rendering="crispEdges" style="display:block">${s}</svg>`;
}

// Chunky 4 x 6 numerals in the SHIFT[n] bracket lockup (same proportions as the poster title).
const DIGITS = {
  0: ['.XX.', 'X..X', 'X..X', 'X..X', 'X..X', '.XX.'],
  1: ['..X.', '.XX.', '..X.', '..X.', '..X.', '.XXX'],
  2: ['.XX.', 'X..X', '...X', '..X.', '.X..', 'XXXX'],
  3: ['XXX.', '...X', '.XX.', '...X', '...X', 'XXX.'],
  4: ['X..X', 'X..X', 'X..X', 'XXXX', '...X', '...X'],
  5: ['XXXX', 'X...', 'XXX.', '...X', '...X', 'XXX.'],
  6: ['.XX.', 'X...', 'XXX.', 'X..X', 'X..X', '.XX.'],
  7: ['XXXX', '...X', '..X.', '..X.', '.X..', '.X..'],
  8: ['.XX.', 'X..X', '.XX.', 'X..X', 'X..X', '.XX.'],
  9: ['.XX.', 'X..X', 'X..X', '.XXX', '...X', '.XX.'],
};
const NUM_W = 15;
function bracketNumber(num) {                       // 15 x 6 cells: [ d d ]
  const [a, b] = String(num).padStart(2, '0');
  return DIGITS[0].map((_, y) => {
    const edge = y === 0 || y === 5;
    return (edge ? 'BB' : 'B.') + '.' + DIGITS[a][y] + '.' + DIGITS[b][y] + '.' + (edge ? 'BB' : '.B');
  });
}

// ---------- concept definitions ----------
const NUM = 7;
const C2_CELL = 0.7;                                  // cm per pixel: chunky enough to read as pixel art across a room
const concepts = {
  1: {
    name: 'SEED MODE', tee: '#161616', bg: '#dcd9d4',
    prints: {
      front: () => mascot({ w: 16 * CM, id: 'a', only: 'eyes', knockPupils: true, vb: [248, 396, 452, 286] }),
      back: () => `<div style="display:flex;flex-direction:column;align-items:center;gap:${1.5 * CM}px">
        ${mascot({ w: 30 * CM, id: 'b', knockSeed: true, knockPupils: true })}${wordmark(30, CREAM)}</div>`,
    },
    place: { front: { cx: 0, top: 9.8 + 4 }, back: { cx: 0, top: 2.8 + 5.5 } },
    notes: { front: 'eyes only, white, 16 cm', back: 'logo 30 cm + wordmark 30 cm' },
  },
  2: {
    name: 'COMET', tee: '#ebe4d2', bg: '#c4c0ba',
    prints: {
      front: () => mascot({ w: 8 * CM, id: 'c' }),
      back: (ctx) => `<div style="position:relative;width:${ctx.comet[0].length * C2_CELL * CM}px;height:${ctx.comet.length * C2_CELL * CM}px">
        ${rectsSVG(ctx.comet, { M: '#941a55', O: EMBER, T: '#ff9127', Y: GOLD, B: '#ffe31e', K: '#111111', W: '#ffffff' }, C2_CELL * CM)}
        <div style="position:absolute;left:0;top:${0.6 * CM}px;display:flex;flex-direction:column;align-items:flex-start;gap:${0.5 * CM}px">
          <span class="fit" data-w="${14 * CM}" style="display:inline-block;font:700 100px/1.25 Kodchasan,sans-serif;color:${INK};white-space:nowrap">ไฟติดแล้ว</span>
          ${wordmark(14, INK)}</div></div>`,
    },
    place: { front: { cx: 10, top: 9.8 + 6.5 }, back: { cx: 0, top: 2.8 + 4.5 } },
    notes: { front: 'logo 8 cm, left chest', back: 'pixel comet, 7 mm pixels' },
  },
  3: {
    name: 'ROSTER', tee: '#6b1a30', bg: '#dcd9d4',
    prints: {
      front: () => `<div style="display:flex;align-items:center;gap:${10.5 * CM}px">
        ${rectsSVG(bracketNumber(NUM), { B: CREAM, X: GOLD }, 7.5 / NUM_W * CM)}
        <div style="padding:${0.4 * CM}px">${mascot({ w: 8.5 * CM, id: 'd', keyline: 22 })}</div></div>`,
      back: () => `<div style="display:flex;flex-direction:column;align-items:center">
        ${wordmark(22, CREAM)}<div style="height:${2.4 * CM}px"></div>
        ${rectsSVG(bracketNumber(NUM), { B: CREAM, X: GOLD }, 34 / NUM_W * CM)}
        <div style="height:${1.5 * CM}px"></div>
        ${mono(27, CREAM, `PS[01] FIRST RUN &nbsp;/&nbsp; BUILDER ${String(NUM).padStart(2, '0')} OF 10`)}</div>`,
    },
    place: { front: { cx: 0.45, top: 9.8 + 6 }, back: { cx: 0, top: 2.8 + 5.5 } },
    notes: { front: 'crest 8.5 cm + number 7.5 cm', back: 'number 34 x 13.6 cm, unique per shirt' },
  },
};

// ---------- the pixel comet: the logo's own flame, stretched into a tail ----------
async function buildComet(page) {
  return page.evaluate(({ P, COLS, ROWS }) => {
    const ctx = document.createElement('canvas').getContext('2d');
    const p2 = d => new Path2D(d);
    const flame = p2(P.flame), seed = p2(P.seed), eyes = P.eyes.map(p2), brows = P.brows.map(p2),
      pupils = P.pupils.map(p2), tongues = P.tongues.map(p2);
    const hit = (p, x, y) => ctx.isPointInPath(p, x, y);
    const any = (ps, x, y) => ps.some(p => hit(p, x, y));
    const Q = 26;                                   // logo units per cell
    const C = { x: 500, y: 590 }, CI = 20.5, CJ = 88.5;
    const A = { x: 0.5087, y: -0.8609 }, N = { x: 0.8609, y: 0.5087 };
    const U0 = 215, UEND = 1500, BEND = -1.25e-4;
    const LAYERS = { Y: { s: 1, k: 1.55, tp: 0.15 }, O: { s: 1.13, k: 1.75, tp: 0.3 }, M: { s: 1.27, k: 1.88, tp: 0.45 } };
    function src(X, Y, L) {                         // inverse warp: output point -> logo point
      let u = (X - C.x) * A.x + (Y - C.y) * A.y, v = (X - C.x) * N.x + (Y - C.y) * N.y;
      const over = Math.max(0, u - U0 * L.s);
      v -= BEND * over * over;
      const t = Math.min(1, over / (UEND - U0));
      u /= L.s; v /= L.s;
      if (u > U0) u = U0 + (u - U0) / L.k;
      v /= (1 - L.tp * t);
      return [C.x + u * A.x + v * N.x, C.y + u * A.y + v * N.y];
    }
    function sample(X, Y) {
      if (any(eyes, X, Y)) return 'W';
      if (hit(seed, X, Y)) return any(tongues, X, Y) ? 'T' : 'K';
      const y = src(X, Y, LAYERS.Y);
      if (hit(flame, y[0], y[1])) return any(tongues, y[0], y[1]) ? 'B' : 'Y';
      if (any(tongues, y[0], y[1])) return 'T';
      const o = src(X, Y, LAYERS.O);
      if (hit(flame, o[0], o[1])) return 'O';
      const m = src(X, Y, LAYERS.M);
      if (hit(flame, m[0], m[1])) return 'M';
      return '.';
    }
    const rows = [];
    const OFF = [1 / 6, 3 / 6, 5 / 6];
    for (let j = 0; j < ROWS; j++) {
      let row = '';
      for (let i = 0; i < COLS; i++) {
        const count = {}; let brow = 0;
        for (const oy of OFF) for (const ox of OFF) {
          const X = C.x + (i + ox - CI) * Q, Y = C.y + (j + oy - CJ) * Q;
          const c = sample(X, Y); count[c] = (count[c] || 0) + 1;
          if (any(brows, X, Y)) brow++;
        }
        let best = '.', n = 0;
        for (const [c, v] of Object.entries(count)) if (v > n) { best = c; n = v; }
        if ((count.K || 0) >= 4 && best === 'W') best = 'W';
        if (brow >= 2) best = 'W';
        row += best;
      }
      rows.push(row);
    }
    // pupils are stamped as clean 2 x 2 blocks so the googly eyes survive the grid
    const grid = rows.map(r => [...r]);
    for (const [px, py] of [[366, 570], [648, 605]]) {
      const i = Math.floor(CI + (px - C.x) / Q - 0.5), j = Math.floor(CJ + (py - C.y) / Q - 0.5);
      for (const dj of [0, 1]) for (const di of [0, 1]) grid[j + dj][i + di] = 'K';
    }
    rows.splice(0, rows.length, ...grid.map(r => r.join('')));
    // trim to content
    const used = rows.map(r => /[^.]/.test(r));
    const j0 = used.indexOf(true), j1 = used.lastIndexOf(true);
    let i0 = COLS, i1 = 0;
    rows.forEach(r => { const a = r.search(/[^.]/); if (a >= 0) { i0 = Math.min(i0, a); i1 = Math.max(i1, r.length - 1 - [...r].reverse().join('').search(/[^.]/)); } });
    const out = rows.slice(j0, j1 + 1).map(r => r.slice(i0, i1 + 1));
    const single = r => r.replace(/\./g, '').length === 1;       // shorten a one-pixel-wide tip to two pixels
    while (out.length > 3 && single(out[0]) && single(out[1]) && single(out[2])) out.shift();
    return out;
  }, { P, COLS: 70, ROWS: 104 });
}

// ---------- garment mockup ----------
const PPC = 13;                                       // mockup px per cm
const SIL = `M -10,0.3 L -8,-0.6 C -5,1.3 5,1.3 8,-0.6 L 10,0.3 C 15,1.2 20,2.5 25,4 C 31,6.2 37.5,11 42.5,17.5
  L 36.6,33.8 C 33.2,30.8 30,28.2 27,25.8 C 26.6,40 26.8,57 27.2,71 C 14,72 -14,72 -27.2,71
  C -26.8,57 -26.6,40 -27,25.8 C -30,28.2 -33.2,30.8 -36.6,33.8 L -42.5,17.5 C -37.5,11 -31,6.2 -25,4
  C -20,2.5 -15,1.2 -10,0.3 Z`;
const lum = hex => { const n = parseInt(hex.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
const shade = (hex, t) => {                           // t<0 darker, t>0 lighter
  const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255];
  return '#' + ch.map(c => Math.round(t < 0 ? c * (1 + t) : c + (255 - c) * t).toString(16).padStart(2, '0')).join('');
};
function tee({ id, color, side, prints, x, y, seed }) {
  const dark = lum(color) < 0.25;
  const T = `translate(${x} ${y}) scale(${PPC})`;
  const W = 96 * PPC, H = 80 * PPC, bx = x - 48 * PPC, by = y - 4 * PPC;
  const seam = 'rgba(0,0,0,0.38)', stitch = dark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.22)';
  const front = side === 'front';
  const collar = front ? `
      <path d="M -8,-0.6 C -5,1.3 5,1.3 8,-0.6 C 7.6,4.6 4.2,7.4 0,7.4 C -4.2,7.4 -7.6,4.6 -8,-0.6 Z" fill="${shade(color, -0.45)}"/>
      <path d="M -8,-0.6 C -5,1.3 5,1.3 8,-0.6 L 7.8,1.5 C 5,3.5 -5,3.5 -7.8,1.5 Z" fill="${shade(color, -0.22)}"/>
      <path d="M -7.9,0.45 C -5,2.4 5,2.4 7.9,0.45" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="2" stroke-dasharray="0.1 0.2"/>
      <rect x="-1.7" y="3.7" width="3.4" height="1.9" rx="0.1" fill="${CREAM}" opacity="0.92"/>
      <rect x="-1.1" y="4.25" width="2.2" height="0.28" fill="${INK}" opacity="0.8"/><rect x="-0.5" y="4.85" width="1" height="0.22" fill="${INK}" opacity="0.6"/>
      <path d="M -10,0.3 L -8,-0.6 C -7.6,4.6 -4.2,7.4 0,7.4 C 4.2,7.4 7.6,4.6 8,-0.6 L 10,0.3 C 9.6,6.6 5.4,9.8 0,9.8 C -5.4,9.8 -9.6,6.6 -10,0.3 Z" fill="${shade(color, dark ? 0.05 : -0.035)}"/>
      <path d="M -9,-0.15 C -8.6,5.6 -4.8,8.6 0,8.6 C 4.8,8.6 8.6,5.6 9,-0.15" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="2.3" stroke-dasharray="0.1 0.2"/>
      <path d="M -8,-0.6 C -7.6,4.6 -4.2,7.4 0,7.4 C 4.2,7.4 7.6,4.6 8,-0.6" fill="none" stroke="rgba(0,0,0,0.45)" stroke-width="0.14"/>
      <path d="M -10,0.3 C -9.6,6.6 -5.4,9.8 0,9.8 C 5.4,9.8 9.6,6.6 10,0.3" fill="none" stroke="${seam}" stroke-width="0.12"/>
      <path d="M -10.4,0.5 C -10,6.9 -5.6,10.2 0,10.2 C 5.6,10.2 10,6.9 10.4,0.5" fill="none" stroke="${stitch}" stroke-width="0.08" stroke-dasharray="0.3 0.18"/>`
    : `
      <path d="M -10,0.3 L -8,-0.6 C -5,1.3 5,1.3 8,-0.6 L 10,0.3 C 6,3.75 -6,3.75 -10,0.3 Z" fill="${shade(color, dark ? 0.05 : -0.035)}"/>
      <path d="M -9,-0.15 C -5.5,2.5 5.5,2.5 9,-0.15" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="2.1" stroke-dasharray="0.1 0.2"/>
      <path d="M -10,0.3 C -6,3.75 6,3.75 10,0.3" fill="none" stroke="${seam}" stroke-width="0.12"/>
      <path d="M -10.5,0.55 C -6.2,4.2 6.2,4.2 10.5,0.55" fill="none" stroke="${stitch}" stroke-width="0.08" stroke-dasharray="0.3 0.18"/>
      <path d="M -10,0.3 C -15,1.2 -21,2.6 -26.5,4.2 M 10,0.3 C 15,1.2 21,2.6 26.5,4.2" fill="none" stroke="rgba(0,0,0,0.0)" stroke-width="0.1"/>`;
  const sleeve = s => `
      <path d="M ${25 * s},4 C ${31 * s},6.2 ${37.5 * s},11 ${42.5 * s},17.5 L ${36.6 * s},33.8 C ${33.2 * s},30.8 ${30 * s},28.2 ${27 * s},25.8 C ${23.8 * s},20 ${23.2 * s},11.5 ${25 * s},4 Z" fill="url(#${id}sl${s > 0 ? 'r' : 'l'})"/>
      <path d="M ${25 * s},4 C ${23.2 * s},11.5 ${23.8 * s},20 ${27 * s},25.8" fill="none" stroke="${seam}" stroke-width="0.13"/>
      <path d="M ${25.4 * s},4.4 C ${23.6 * s},11.5 ${24.2 * s},20 ${27.4 * s},25.6" fill="none" stroke="${stitch}" stroke-width="0.07" stroke-dasharray="0.3 0.18"/>
      <path d="M ${41 * s},16.2 L ${35.1 * s},32.5 M ${40.6 * s},15.9 L ${34.7 * s},32.2" fill="none" stroke="${stitch}" stroke-width="0.08" stroke-dasharray="0.3 0.18"/>`;
  const folds = [                                      // hand-placed drag lines, [d, width, dark?]
    ['M 26.5,26.5 C 21,29.5 16.5,35 14.5,43', 2.2, 1], ['M -26.5,26.5 C -22,30.5 -18.5,36 -17.5,44', 2.2, 1],
    ['M 25.5,28 C 20.5,32.5 18.5,40 19,49', 1.5, 0], ['M -25.5,28.5 C -21.5,33 -20.5,40 -21.5,48', 1.5, 0],
    ['M 26,7 C 29.5,11.5 32.5,15.5 37.5,19.5', 1.8, 1], ['M -26,7 C -29.5,11.5 -33,15.5 -37.5,20', 1.8, 1],
    ['M -23,59 C -14,62 -6,61 3,65', 2.4, 1], ['M 21,56 C 14,60 9,62 6,68', 2, 0],
  ].map(([d, w, dk]) => `<path d="${d}" fill="none" stroke="${dk ? '#000' : '#fff'}" stroke-opacity="${dk ? (dark ? 0.42 : 0.085) : (dark ? 0.05 : 0.3)}" stroke-width="${w}" stroke-linecap="round" filter="url(#${id}blur)"/>`).join('');
  return `
  <defs>
    <clipPath id="${id}clip"><path d="${SIL}" transform="${T}"/></clipPath>
    <filter id="${id}blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.3"/></filter>
    <filter id="${id}sh" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.5"/></filter>
    <filter id="${id}sh2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.35"/></filter>
    <linearGradient id="${id}slr" x1="24.5" y1="15" x2="39" y2="26" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000" stop-opacity="${dark ? 0.45 : 0.12}"/><stop offset="0.45" stop-color="#000" stop-opacity="0"/></linearGradient>
    <linearGradient id="${id}sll" x1="-24.5" y1="15" x2="-39" y2="26" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000" stop-opacity="${dark ? 0.45 : 0.12}"/><stop offset="0.45" stop-color="#000" stop-opacity="0"/></linearGradient>
    <filter id="${id}lightH" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.0034" numOctaves="2" seed="${seed}" result="n"/>
      <feDiffuseLighting in="n" surfaceScale="${dark ? 15 : 12}" diffuseConstant="1" lighting-color="#fff" result="l"><feDistantLight azimuth="235" elevation="52"/></feDiffuseLighting>
      <feColorMatrix in="l" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${dark ? 2.4 : 2.2} 0 0 0 ${dark ? -1.86 : -1.74}"/>
    </filter>
    <filter id="${id}lightS" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.0034" numOctaves="2" seed="${seed}" result="n"/>
      <feDiffuseLighting in="n" surfaceScale="${dark ? 15 : 12}" diffuseConstant="1" lighting-color="#fff" result="l"><feDistantLight azimuth="235" elevation="52"/></feDiffuseLighting>
      <feColorMatrix in="l" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.6 0 0 0 2.02"/>
    </filter>
    <filter id="${id}tex" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9 0.75" numOctaves="2" seed="${seed + 7}"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0 0 0 -0.32"/>
    </filter>
    <linearGradient id="${id}key" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${dark ? 0.07 : 0.1}"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${dark ? 0.3 : 0.1}"/></linearGradient>
  </defs>
  <g transform="${T}">
    <path d="${SIL}" fill="#000" opacity="0.22" filter="url(#${id}sh)" transform="translate(0.9 1.6)"/>
    <path d="${SIL}" fill="#000" opacity="0.4" filter="url(#${id}sh2)" transform="translate(0.15 0.3)"/>
    <path d="${SIL}" fill="${color}"/>
    ${sleeve(1)}${sleeve(-1)}
    <path d="M -27.1,68.8 C -14,69.8 14,69.8 27.1,68.8 M -27.1,68.4 C -14,69.4 14,69.4 27.1,68.4" fill="none" stroke="${stitch}" stroke-width="0.08" stroke-dasharray="0.3 0.18"/>
    ${collar}
  </g>
  <g clip-path="url(#${id}clip)">
    <g transform="${T}">${prints.map(p => `<image href="${p.href}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" opacity="0.985"/>`).join('')}</g>
    <g transform="${T}">${folds}</g>
    <rect x="${bx}" y="${by}" width="${W}" height="${H}" filter="url(#${id}lightS)" opacity="${dark ? 0.6 : 0.2}"/>
    <rect x="${bx}" y="${by}" width="${W}" height="${H}" filter="url(#${id}lightH)" opacity="${dark ? 0.09 : 0.4}"/>
    <rect x="${bx}" y="${by}" width="${W}" height="${H}" fill="url(#${id}key)"/>
    <rect x="${bx}" y="${by}" width="${W}" height="${H}" filter="url(#${id}tex)" opacity="${dark ? 0.35 : 0.1}"/>
    <g transform="${T}"><path d="${SIL}" fill="none" stroke="#000" stroke-opacity="${dark ? 0.55 : 0.2}" stroke-width="2.6" filter="url(#${id}blur)"/>
      ${dark ? `<path d="${SIL}" fill="none" stroke="#fff" stroke-opacity="0.1" stroke-width="0.18"/>` : ''}</g>
  </g>`;
}

function mockupHTML(n, c, sizes) {
  const Wpx = 2760, Hpx = 1330, top = 150;
  const mk = (side, cx) => {
    const s = sizes[side]; if (!s) return tee({ id: side[0] + n, color: c.tee, side, prints: [], x: cx, y: top, seed: n * 10 + (side === 'front' ? 1 : 2) });
    const pl = c.place[side];
    return tee({ id: side[0] + n, color: c.tee, side, x: cx, y: top, seed: n * 10 + (side === 'front' ? 1 : 2),
      prints: [{ href: `file://${OUT}concept-${n}-${side}.png`, w: s.w, h: s.h, x: pl.cx - s.w / 2, y: pl.top }] });
  };
  const cap = (x, t, sub) => `<text x="${x}" y="${Hpx - 92}" text-anchor="middle" font-family="'Space Mono',monospace" font-weight="700" font-size="21" letter-spacing="3" fill="rgba(20,20,20,0.72)">${t}</text>
    <text x="${x}" y="${Hpx - 60}" text-anchor="middle" font-family="'Space Mono',monospace" font-weight="700" font-size="16" letter-spacing="1" fill="rgba(20,20,20,0.45)">${sub}</text>`;
  return `<html><head>${FONTS}<style>html,body{margin:0}</style></head><body>
  <svg id="art" xmlns="http://www.w3.org/2000/svg" width="${Wpx}" height="${Hpx}" viewBox="0 0 ${Wpx} ${Hpx}" style="display:block">
    <defs><radialGradient id="bg" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="${shade(c.bg, 0.22)}"/><stop offset="1" stop-color="${shade(c.bg, -0.1)}"/></radialGradient></defs>
    <rect width="${Wpx}" height="${Hpx}" fill="url(#bg)"/>
    <text x="70" y="78" font-family="'Space Mono',monospace" font-weight="700" font-size="22" letter-spacing="3" fill="rgba(20,20,20,0.72)">PS[01] / CONCEPT ${n} / ${c.name}</text>
    ${mk('front', 715)}${mk('back', 2045)}
    ${cap(715, 'FRONT', c.notes.front)}${cap(2045, 'BACK', c.notes.back)}
  </svg></body></html>`;
}

// ---------- shared with render-1ab.js ----------
module.exports = { chromium, P, DISC, CM, DPI_SCALE, CREAM, INK, GOLD, EMBER, T_OUT, T_FLAME, T_SEED, mascot, rectsSVG, tee, shade, OUT };

// ---------- run ----------
if (require.main === module) (async () => {
  const browser = await chromium.launch();
  const helper = await browser.newPage();
  const ctx = { comet: await buildComet(helper) };
  for (const [n, c] of Object.entries(concepts)) {
    if (ONLY && ONLY !== n) continue;
    const sizes = {};
    for (const [side, make] of Object.entries(c.prints)) {
      const page = await browser.newPage({ deviceScaleFactor: DPI_SCALE, viewport: { width: 1500, height: 2000 } });
      await page.setContent(`<html><head>${FONTS}<style>html,body{margin:0;background:transparent}</style></head><body><div id="art" style="display:inline-block">${make(ctx)}</div></body></html>`);
      await page.evaluate(async () => {
        await document.fonts.load('700 100px Kodchasan'); await document.fonts.load('700 100px Kodchasan', 'ไฟติดแล้ว');
        await document.fonts.load("700 20px 'Space Mono'"); await document.fonts.ready;
        for (const el of document.querySelectorAll('.fit')) {
          const target = +el.dataset.w, fsz = parseFloat(getComputedStyle(el).fontSize);
          el.style.fontSize = (fsz * target / el.getBoundingClientRect().width) + 'px';
        }
      });
      await page.waitForTimeout(250);
      const box = await page.locator('#art').boundingBox();
      await page.locator('#art').screenshot({ path: `${OUT}concept-${n}-${side}.png`, omitBackground: true });
      sizes[side] = { w: box.width / CM, h: box.height / CM };
      console.log(`concept-${n}-${side}.png`, sizes[side].w.toFixed(1) + ' x ' + sizes[side].h.toFixed(1) + ' cm');
      await page.close();
    }
    const html = OUT + `.mockup-${n}.html`;
    fs.writeFileSync(html, mockupHTML(n, c, sizes));
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
