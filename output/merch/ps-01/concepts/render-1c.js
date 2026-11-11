// PS[01] Seed Mode, version C: the logo itself stitched in sashiko.
// Every shape of the real logo becomes running stitches: the disc is filled with
// hitomezashi (the grid stitch, which is also a pixel grid), the flame with rising
// diagonal stitches, the tongues in orange, the seed outlined in cream. Eyes stay solid
// white with black pupils so the face reads exactly like the logo.
//   node render-1c.js
const R = require('./render.js');
const { chromium, P, CM, DPI_SCALE, CREAM, mascot, tee, shade, OUT } = R;
const fs = require('fs');

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Kodchasan:wght@700&family=Space+Mono:wght@700&display=swap" rel="stylesheet">`;
const TEE = '#161616';
const c = v => +(v * CM).toFixed(2);

// ---------- logo space ----------
const VB = [40, 5, 925, 950];          // logo units shown
const LOGO_W = 22;                     // cm on the shirt
const U = VB[2] / LOGO_W;              // logo units per cm
const mm = v => (v / 10) * U;          // mm -> logo units

// Thread colours, brightened from the logo so they read on black fabric.
const THREAD = { disc: '#e0457b', discDeep: '#a8285e', flame: '#ffc33e', tongue: '#ff8f19', seed: CREAM };
const ST = { w: mm(1.8), dash: mm(4.2), gap: mm(2.1) };   // stitch thickness, length, gap
const solid = (color, w = ST.w) => `fill="none" stroke="${color}" stroke-width="${w.toFixed(2)}" stroke-linecap="round"`;
const dashed = (color, w = ST.w) => `${solid(color, w)} stroke-dasharray="${ST.dash.toFixed(2)} ${ST.gap.toFixed(2)}"`;

function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/** Hitomezashi: on/off running stitches on a grid. Each row and column starts on or off at random. */
function hitomezashi(x0, y0, x1, y1, s, seed) {
  const rnd = mulberry(seed), pad = mm(0.9), segs = [];
  for (let y = y0; y <= y1; y += s) { const b = rnd() < 0.5 ? 0 : 1;
    for (let x = x0 + b * s; x < x1; x += 2 * s) segs.push([x + pad, y, x + s - pad, y]); }
  for (let x = x0; x <= x1; x += s) { const b = rnd() < 0.5 ? 0 : 1;
    for (let y = y0 + b * s; y < y1; y += 2 * s) segs.push([x, y + pad, x, y + s - pad]); }
  return segs.map(([a, b, c2, d]) => `<line x1="${a.toFixed(1)}" y1="${b.toFixed(1)}" x2="${c2.toFixed(1)}" y2="${d.toFixed(1)}"/>`).join('');
}
/** Parallel lines across a box at an angle, for dashed fills. */
function hatch(cx, cy, r, angleDeg, spacing, offset = 0) {
  const a = angleDeg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx, out = [];
  for (let t = -r + offset; t <= r; t += spacing) {
    const px = cx + nx * t, py = cy + ny * t;
    out.push(`<line x1="${(px - dx * r).toFixed(1)}" y1="${(py - dy * r).toFixed(1)}" x2="${(px + dx * r).toFixed(1)}" y2="${(py + dy * r).toFixed(1)}"/>`);
  }
  return out.join('');
}

function stitchedLogo() {
  const big = `x="-300" y="-300" width="1600" height="1600"`;
  const inset = mm(2.2) * 2;            // keep fill stitches this far from outlines
  const flameish = [P.flame, ...P.tongues];
  const defs = `<defs>
    <mask id="mDisc" maskUnits="userSpaceOnUse" ${big}>
      <path d="${P.clip}" fill="#fff" stroke="#000" stroke-width="${inset}"/>
      ${flameish.map(d => `<path d="${d}" fill="#000" stroke="#000" stroke-width="${inset}"/>`).join('')}
    </mask>
    <mask id="mDiscLine" maskUnits="userSpaceOnUse" ${big}><rect ${big} fill="#fff"/>
      ${flameish.map(d => `<path d="${d}" fill="#000" stroke="#000" stroke-width="${mm(2.4)}"/>`).join('')}
    </mask>
    <mask id="mFlame" maskUnits="userSpaceOnUse" ${big}>
      <path d="${P.flame}" fill="#fff" stroke="#000" stroke-width="${inset}"/>
      ${[...P.tongues, P.seed, ...P.eyes].map(d => `<path d="${d}" fill="#000" stroke="#000" stroke-width="${inset}"/>`).join('')}
    </mask>
    ${P.tongues.map((d, i) => `<mask id="mT${i}" maskUnits="userSpaceOnUse" ${big}><path d="${d}" fill="#fff" stroke="#000" stroke-width="${mm(2)}"/></mask>`).join('')}
  </defs>`;
  const [x, y, w, h] = VB;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${c(LOGO_W)}" height="${c(LOGO_W * h / w)}" viewBox="${x} ${y} ${w} ${h}" style="display:block;overflow:visible">
    ${defs}
    <!-- disc: hitomezashi grid in two plums, outline as a double running stitch -->
    <g mask="url(#mDisc)" ${solid(THREAD.disc)}>${hitomezashi(30, 30, 980, 980, mm(6.5), 11)}</g>
    <g mask="url(#mDiscLine)">
      <path d="${P.clip}" ${dashed(THREAD.disc)}/>
      <path d="${P.clip}" ${dashed(THREAD.discDeep)} transform="translate(500 497) scale(0.968) translate(-500 -497)"/>
    </g>
    <!-- flame: rising diagonal running stitches, yellow outline -->
    <g mask="url(#mFlame)" ${dashed(THREAD.flame)}>${hatch(560, 420, 700, -62, mm(4))}</g>
    <path d="${P.flame}" ${dashed(THREAD.flame, mm(2.2))}/>
    <!-- tongues: orange, stitched across the grain -->
    ${P.tongues.map((d, i) => `<g mask="url(#mT${i})" ${dashed(THREAD.tongue)}>${hatch(560, 420, 700, 28, mm(3.2), i * 7)}</g><path d="${d}" ${dashed(THREAD.tongue)}/>`).join('')}
    <!-- seed: the shirt is the black, outlined in cream -->
    <path d="${P.seed}" fill="#000"/>
    <path d="${P.seed}" ${dashed(THREAD.seed, mm(2))}/>
    <!-- face: solid, exactly the logo -->
    ${P.eyes.concat(P.brows).map(d => `<path d="${d}" fill="#fff"/>`).join('')}
    ${P.pupils.map(d => `<path d="${d}" fill="#000"/>`).join('')}
  </svg>`;
}

const back = () => {
  const gap = 1.4;
  return `<div style="display:flex;flex-direction:column;align-items:center;width:${c(LOGO_W)}px">
    ${stitchedLogo()}
    <div style="height:${c(gap)}px"></div>
    <span class="fit" data-w="${c(LOGO_W)}" style="display:inline-block;font:700 100px/0.9 Kodchasan,sans-serif;letter-spacing:-0.01em;color:${CREAM};white-space:nowrap">PassionSeed</span>
  </div>`;
};
const front = () => mascot({ w: c(16), id: 'ec', only: 'eyes', vb: [248, 396, 452, 286] });

function mockupHTML(sizes) {
  const Wpx = 2760, Hpx = 1330, top = 150, NECK = 2.8, COLLAR = 9.8;
  const place = { front: { top: COLLAR + 4 }, back: { top: NECK + 5.5 } };
  const mk = (side, cx, seed) => tee({ id: side[0] + 'c', color: TEE, side, x: cx, y: top, seed,
    prints: [{ href: `file://${OUT}concept-1C-${side}.png`, w: sizes[side].w, h: sizes[side].h, x: -sizes[side].w / 2, y: place[side].top }] });
  const cap = (x, t, sub) => `<text x="${x}" y="${Hpx - 92}" text-anchor="middle" font-family="'Space Mono',monospace" font-weight="700" font-size="21" letter-spacing="3" fill="rgba(20,20,20,0.72)">${t}</text>
    <text x="${x}" y="${Hpx - 60}" text-anchor="middle" font-family="'Space Mono',monospace" font-weight="700" font-size="16" letter-spacing="1" fill="rgba(20,20,20,0.45)">${sub}</text>`;
  const bg = '#dcd9d4';
  return `<html><head>${FONTS}<style>html,body{margin:0}</style></head><body>
  <svg id="art" xmlns="http://www.w3.org/2000/svg" width="${Wpx}" height="${Hpx}" viewBox="0 0 ${Wpx} ${Hpx}" style="display:block">
    <defs><radialGradient id="bg" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="${shade(bg, 0.22)}"/><stop offset="1" stop-color="${shade(bg, -0.1)}"/></radialGradient></defs>
    <rect width="${Wpx}" height="${Hpx}" fill="url(#bg)"/>
    <text x="70" y="78" font-family="'Space Mono',monospace" font-weight="700" font-size="22" letter-spacing="3" fill="rgba(20,20,20,0.72)">PS[01] / SEED MODE / C SASHIKO LOGO</text>
    ${mk('front', 715, 21)}${mk('back', 2045, 22)}
    ${cap(715, 'FRONT', 'eyes 16 cm, white with black pupils')}${cap(2045, 'BACK', `the logo stitched in sashiko, ${LOGO_W} cm, + PassionSeed`)}
  </svg></body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const sizes = {};
  for (const [side, make] of Object.entries({ front, back })) {
    const page = await browser.newPage({ deviceScaleFactor: DPI_SCALE, viewport: { width: 1500, height: 2000 } });
    await page.setContent(`<html><head>${FONTS}<style>html,body{margin:0;background:transparent}</style></head><body><div id="art" style="display:inline-block">${make()}</div></body></html>`);
    await page.evaluate(async () => {
      await document.fonts.load('700 100px Kodchasan'); await document.fonts.ready;
      for (const el of document.querySelectorAll('.fit')) {
        const fsz = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = (fsz * (+el.dataset.w) / el.getBoundingClientRect().width) + 'px';
      }
    });
    await page.waitForTimeout(250);
    const box = await page.locator('#art').boundingBox();
    await page.locator('#art').screenshot({ path: `${OUT}concept-1C-${side}.png`, omitBackground: true });
    sizes[side] = { w: box.width / CM, h: box.height / CM };
    console.log(`concept-1C-${side}.png`, sizes[side].w.toFixed(1) + ' x ' + sizes[side].h.toFixed(1) + ' cm');
    await page.close();
  }
  const html = OUT + '.mockup-1C.html';
  fs.writeFileSync(html, mockupHTML(sizes));
  const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 2760, height: 1330 } });
  await page.goto('file://' + html);
  await page.evaluate(async () => { await document.fonts.load("700 20px 'Space Mono'"); await document.fonts.ready; });
  await page.waitForTimeout(400);
  await page.locator('#art').screenshot({ path: `${OUT}concept-1C-mockup.png` });
  await page.close();
  fs.unlinkSync(html);
  await browser.close();
})();
