// PS[01] Seed Mode, version D: "Bitmap". One ink, photocopy energy.
// Pipeline: draw the composition clean in greyscale -> downsample to 30 px/inch -> blur +
// grain -> 50% threshold -> scale up x10 (nearest) to 300 dpi -> one ink colour.
// The logo is redrawn from its real vector parts with greys chosen for the threshold:
// disc dark, flame light with an ink keyline, tongues mid-grey so the grain breaks them up.
//   node render-1d.js
const R = require('./render.js');
const { chromium, P, CM, tee, shade, OUT } = R;
const fs = require('fs');

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Kodchasan:wght@700&family=Archivo+Black&family=Space+Mono:wght@700&display=swap" rel="stylesheet">`;
const PPI = 30, UP = 10;                                  // work at 30 ppi, print at 300 dpi
const PXCM = PPI / 2.54;                                  // work px per cm

const VARIANTS = {
  black: { tee: '#eee8da', ink: '#161616', label: 'cream tee, black ink' },
  cobalt: { tee: '#f3f2ee', ink: '#2b55b5', label: 'white tee, cobalt ink' },
};

// Everything below runs in the browser.
function artInBrowser({ P, PXCM, UP, piece, ink }) {
  const SS = 4;                                            // supersample the clean drawing
  const cm = v => v * PXCM * SS;
  const W = Math.round(piece.w * PXCM), H = Math.round(piece.h * PXCM);
  const hi = document.createElement('canvas'); hi.width = W * SS; hi.height = H * SS;
  const g = hi.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, hi.width, hi.height);
  const grey = v => `rgb(${v * 255 | 0},${v * 255 | 0},${v * 255 | 0})`;

  // ---- the logo, in threshold greys ----
  function logo(cx, cy, wCm, rot) {
    const s = cm(wCm) / 925;
    g.save(); g.translate(cm(cx), cm(cy)); g.rotate(rot * Math.PI / 180); g.scale(s, s); g.translate(-502, -480);
    const p = d => new Path2D(d);
    const disc = g.createRadialGradient(380, 330, 60, 520, 520, 520);
    disc.addColorStop(0, grey(0.6)); disc.addColorStop(0.5, grey(0.42)); disc.addColorStop(1, grey(0.2));
    g.fillStyle = disc; g.fill(p(P.clip));
    g.lineJoin = 'round';
    g.lineWidth = 34; g.strokeStyle = grey(0.04); g.stroke(p(P.flame)); P.tongues.forEach(d => g.stroke(p(d)));
    g.fillStyle = grey(0.9); g.fill(p(P.flame));
    P.tongues.forEach(d => { g.fillStyle = grey(0.56); g.fill(p(d)); });
    g.fillStyle = grey(0.02); g.fill(p(P.seed));
    g.lineWidth = 26; g.strokeStyle = grey(0.03); P.eyes.forEach(d => g.stroke(p(d)));
    g.fillStyle = grey(1); P.eyes.forEach(d => g.fill(p(d)));
    g.fillStyle = grey(0.05); P.brows.forEach(d => g.fill(p(d))); P.pupils.forEach(d => g.fill(p(d)));
    g.restore();
  }
  // ---- doodles: speed lines, smoke puffs, sparkles ----
  const pen = (wCm) => { g.lineWidth = cm(wCm); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#000'; };
  function speedLines(x0, y0, x1, y1, n, spread) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * spread, cut = 0.15 + ((i * 37) % 10) / 30;
      pen(i % 2 ? 0.16 : 0.28);
      g.beginPath();
      g.moveTo(cm(x0 + nx * o + dx * cut), cm(y0 + ny * o + dy * cut));
      g.quadraticCurveTo(cm(x0 + nx * o * 1.6 + dx * 0.6), cm(y0 + ny * o * 1.6 + dy * 0.6), cm(x1 + nx * o * 2.2), cm(y1 + ny * o * 2.2));
      g.stroke();
    }
  }
  function puff(x, y, r) {
    pen(0.22); g.fillStyle = '#fff';
    const bumps = [[0, 0, 1], [-0.9, 0.3, 0.75], [0.9, 0.25, 0.8], [-0.4, -0.7, 0.7], [0.5, -0.65, 0.72], [0, 0.75, 0.7]];
    bumps.forEach(([bx, by, br]) => { g.beginPath(); g.arc(cm(x + bx * r), cm(y + by * r), cm(br * r), 0, Math.PI * 2); g.fill(); g.stroke(); });
    bumps.forEach(([bx, by, br]) => { g.beginPath(); g.arc(cm(x + bx * r), cm(y + by * r), cm(br * r) - cm(0.11), 0, Math.PI * 2); g.fill(); });
  }
  function sparkle(x, y, r, rot = 0) {
    pen(0.2); g.fillStyle = '#fff';
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.36 : r;
      g.lineTo(cm(x + Math.cos(a) * rr), cm(y + Math.sin(a) * rr));
    }
    g.closePath(); g.fill(); g.stroke();
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.17 : r * 0.5;
      g.lineTo(cm(x + Math.cos(a) * rr), cm(y + Math.sin(a) * rr));
    }
    g.closePath(); g.stroke();
  }
  function burst(x, y, r, n, a0, a1) {
    pen(0.2);
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * i / (n - 1), r0 = r * (0.45 + (i % 3) * 0.12);
      g.beginPath(); g.moveTo(cm(x + Math.cos(a) * r0), cm(y + Math.sin(a) * r0)); g.lineTo(cm(x + Math.cos(a) * r), cm(y + Math.sin(a) * r)); g.stroke();
    }
  }
  function zigzag(x, y, len, rot) {
    pen(0.16); g.beginPath();
    for (let i = 0; i <= 6; i++) { const t = i / 6; g.lineTo(cm(x + Math.cos(rot) * len * t + (i % 2 ? 0.35 : -0.35) * Math.sin(rot)), cm(y + Math.sin(rot) * len * t - (i % 2 ? 0.35 : -0.35) * Math.cos(rot))); }
    g.stroke();
  }
  function word(text, x, y, wCm, font, skew = 0, rot = 0) {
    g.save(); g.translate(cm(x), cm(y)); g.rotate(rot * Math.PI / 180); g.transform(1, 0, -skew, 1, 0, 0);
    g.font = `${font.weight} 100px ${font.family}`; const m = g.measureText(text).width;
    const size = 100 * cm(wCm) / m; g.font = `${font.weight} ${size}px ${font.family}`;
    g.fillStyle = '#000'; g.textBaseline = 'alphabetic'; g.fillText(text, -cm(wCm) / 2, 0);
    g.restore();
  }
  piece.draw({ logo, speedLines, puff, sparkle, burst, zigzag, word, pen, g, cm });

  // ---- rasterize: downsample, blur, grain, threshold ----
  const lo = document.createElement('canvas'); lo.width = W; lo.height = H;
  const l = lo.getContext('2d'); l.imageSmoothingQuality = 'high';
  l.filter = `blur(${piece.blur}px)`; l.drawImage(hi, 0, 0, W, H); l.filter = 'none';
  const img = l.getImageData(0, 0, W, H), d = img.data;
  let seed = 9; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const out = document.createElement('canvas'); out.width = W * UP; out.height = H * UP;
  const o = out.getContext('2d'); o.fillStyle = ink;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = d[(y * W + x) * 4] / 255 + (rnd() - 0.5) * piece.grain;
    if (v < 0.5) o.fillRect(x * UP, y * UP, UP, UP);
  }
  return out.toDataURL('image/png');
}

const PIECES = {
  back: {
    w: 30, h: 30, blur: 0.55, grain: 0.34,
    draw: ({ logo, speedLines, puff, sparkle, burst, zigzag, word }) => {
      speedLines(29.4, 0.5, 22.6, 6.6, 5, 0.7);                  // trail from the top right
      puff(28.2, 1.7, 1.05);
      logo(16.6, 10.2, 13.5, -18);                                 // the seed comes in hot
      word('PassionSeed', 15, 22.4, 28.5, { family: 'Kodchasan', weight: 700 }, 0.12, -7);
      burst(7.2, 12.8, 2.8, 7, Math.PI * 0.95, Math.PI * 1.55);
      sparkle(3.6, 7.4, 1.5, 0.2); sparkle(27.2, 13.4, 1.15, 0.5); sparkle(4.2, 26.6, 0.85, 0.1);
      zigzag(25.4, 8.6, 2.2, 2.1); zigzag(2.4, 16.2, 2, 1.2);
      word('PS[01] SEED MODE', 22.4, 27.6, 11.5, { family: "'Archivo Black'", weight: 400 });
    },
  },
  front: {
    w: 11, h: 9, blur: 0.5, grain: 0.3,
    draw: ({ logo, sparkle, zigzag }) => { logo(5.2, 4.8, 7, -12); sparkle(9.6, 1.6, 0.85, 0.3); zigzag(0.6, 1.2, 1.4, 0.7); },
  },
};

function mockupHTML(variant, files) {
  const v = VARIANTS[variant], Wpx = 2760, Hpx = 1330, top = 150;
  const mk = (side, cx, seed) => tee({ id: side[0] + variant, color: v.tee, side, x: cx, y: top, seed,
    prints: [{ href: files[side].href, w: files[side].w, h: files[side].h, x: files[side].x, y: files[side].y }] });
  const cap = (x, t, sub) => `<text x="${x}" y="${Hpx - 92}" text-anchor="middle" font-family="'Space Mono',monospace" font-weight="700" font-size="21" letter-spacing="3" fill="rgba(20,20,20,0.72)">${t}</text>
    <text x="${x}" y="${Hpx - 60}" text-anchor="middle" font-family="'Space Mono',monospace" font-weight="700" font-size="16" letter-spacing="1" fill="rgba(20,20,20,0.45)">${sub}</text>`;
  const bg = '#d6d3ce';
  return `<html><head>${FONTS}<style>html,body{margin:0}</style></head><body>
  <svg id="art" xmlns="http://www.w3.org/2000/svg" width="${Wpx}" height="${Hpx}" viewBox="0 0 ${Wpx} ${Hpx}" style="display:block">
    <defs><radialGradient id="bg" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="${shade(bg, 0.22)}"/><stop offset="1" stop-color="${shade(bg, -0.1)}"/></radialGradient></defs>
    <rect width="${Wpx}" height="${Hpx}" fill="url(#bg)"/>
    <text x="70" y="78" font-family="'Space Mono',monospace" font-weight="700" font-size="22" letter-spacing="3" fill="rgba(20,20,20,0.72)">PS[01] / SEED MODE / D BITMAP / ${v.label.toUpperCase()}</text>
    ${mk('front', 715, 31)}${mk('back', 2045, 32)}
    ${cap(715, 'FRONT', 'bitmap logo 11 cm, wearer\'s left chest')}${cap(2045, 'BACK', 'one ink, 30 ppi 50% threshold + grain, 30 x 30 cm')}
  </svg></body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<html><head>${FONTS}</head><body></body></html>`);
  await page.evaluate(async () => { await document.fonts.load('700 100px Kodchasan'); await document.fonts.load("400 100px 'Archivo Black'"); await document.fonts.ready; });
  for (const [vname, v] of Object.entries(VARIANTS)) {
    const files = {};
    for (const [side, piece] of Object.entries(PIECES)) {
      const url = await page.evaluate(({ src, args }) => { const fn = new Function('return ' + src)(); const pieceObj = { ...args.piece, draw: new Function('return ' + args.drawSrc)() }; return fn({ ...args, piece: pieceObj }); },
        { src: artInBrowser.toString(), args: { P, PXCM, UP, ink: v.ink, piece: { w: piece.w, h: piece.h, blur: piece.blur, grain: piece.grain }, drawSrc: piece.draw.toString() } });
      const file = `${OUT}concept-1D-${vname}-${side}.png`;
      fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      const NECK = 2.8, COLLAR = 9.8;
      files[side] = side === 'back'
        ? { href: 'file://' + file, w: piece.w, h: piece.h, x: -piece.w / 2, y: NECK + 5 }
        : { href: 'file://' + file, w: piece.w, h: piece.h, x: 9.5 - piece.w / 2, y: COLLAR + 3 };
      console.log(`concept-1D-${vname}-${side}.png`, piece.w + ' x ' + piece.h + ' cm');
    }
    const html = OUT + `.mockup-1D-${vname}.html`;
    fs.writeFileSync(html, mockupHTML(vname, files));
    const mp = await browser.newPage({ viewport: { width: 2760, height: 1330 } });
    await mp.goto('file://' + html);
    await mp.evaluate(async () => { await document.fonts.load("700 20px 'Space Mono'"); await document.fonts.ready; });
    await mp.waitForTimeout(400);
    await mp.locator('#art').screenshot({ path: `${OUT}concept-1D-${vname}-mockup.png` });
    await mp.close(); fs.unlinkSync(html);
  }
  await browser.close();
})();
