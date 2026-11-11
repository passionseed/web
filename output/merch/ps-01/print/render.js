// PS[01] "Lights On" print files: front lockup and back wordmark + pixel skyline.
// Spec from the Fable 5.2 design review (navy tee, cream type, SHIFT poster palette).
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || '/Users/bunyasit/dev/passionseed/web/output/merch/ps-01/print/';
fs.mkdirSync(OUT, { recursive: true });
const LOGO = 'data:image/png;base64,' + fs.readFileSync('/Users/bunyasit/dev/passionseed/web/public/passion-seed-logo.png').toString('base64');
const CM = 96 / 2.54, SCALE = 300 / 96;
const CREAM = '#f8f5ec', BODY = '#77909e', LIT = '#f6d389', EMBER = '#ef7926';
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Kodchasan:wght@700&family=Space+Mono:wght@700&display=swap" rel="stylesheet">`;

// Skyline: 65 x 16 cells of 4 mm. Buildings [x, width, height]; ground is row 16.
const COLS = 65, ROWS = 16, CELL = 0.4 * CM;
const BUILDINGS = [[0,7,9],[8,6,13],[15,9,7],[25,7,16],[33,8,11],[42,6,14],[49,9,8],[59,6,12]];
const EMBER_AT = { b: 3, floor: 2, col: 1 };
const hash = (...n) => { let h = 2166136261; for (const v of n) { h ^= v + 0x9e3779b9; h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; };
function skyline() {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  BUILDINGS.forEach(([x, w, h], b) => {
    const top = ROWS - h;
    for (let y = top; y < ROWS; y++) for (let c = x; c < x + w; c++) g[y][c] = 'B';
    let floor = 0;
    for (let y = top + 1; y <= ROWS - 2; y += 2, floor++) {
      const litFloor = hash(b, floor) < 0.4;
      let col = 0;
      for (let c = x + 1; c < x + w - 1; c += 2, col++) {
        let v = '.';                                   // unlit: knocked out, the shirt shows
        if (litFloor && hash(b, floor, col) < 0.55) v = 'G';
        if (b === EMBER_AT.b && floor === EMBER_AT.floor && col === EMBER_AT.col) v = 'E';
        g[y][c] = v;
      }
    }
  });
  return g.map(r => r.join(''));
}
function skylineSVG(rows) {
  const col = { B: BODY, G: LIT, E: EMBER };
  let s = '';
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (col[ch]) s += `<rect x="${x*CELL}" y="${y*CELL}" width="${CELL+0.02}" height="${CELL+0.02}" fill="${col[ch]}"/>`; }));
  return `<svg width="${COLS*CELL}" height="${ROWS*CELL}" shape-rendering="crispEdges" style="display:block">${s}</svg>`;
}
// Logo with a 2 mm cream keyline around the disc + flame silhouette.
function keylinedLogo(widthCm) {
  const w = widthCm * CM, k = 0.2 * CM, pad = k * 1.6, size = w + pad * 2;
  return `<svg width="${size}" height="${size}" style="display:block">
    <defs><filter id="kl" x="-20%" y="-20%" width="140%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="${k*0.7}" result="d"/>
      <feGaussianBlur in="d" stdDeviation="${k*0.3}" result="b"/>
      <feComponentTransfer in="b" result="t"><feFuncA type="linear" slope="12" intercept="-4"/></feComponentTransfer>
      <feFlood flood-color="${CREAM}"/><feComposite in2="t" operator="in" result="line"/>
      <feMerge><feMergeNode in="line"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter></defs>
    <image href="${LOGO}" x="${pad}" y="${pad}" width="${w}" height="${w}" filter="url(#kl)"/></svg>`;
}
const pages = {
  front: `<div style="display:flex;flex-direction:column;align-items:center;gap:${0.5*CM}px">
      ${keylinedLogo(6)}
      <span class="fit" data-w="${6*CM}" style="font:700 40px/1 Kodchasan,sans-serif;color:${CREAM};white-space:nowrap">PassionSeed</span></div>`,
  back: `<div style="width:${26*CM}px">
      <div class="fit" data-w="${26*CM}" style="display:inline-block;font:700 100px/1 Kodchasan,sans-serif;letter-spacing:-0.01em;color:${CREAM};white-space:nowrap">PassionSeed</div>
      <div style="height:${1.6*CM}px"></div>
      ${skylineSVG(skyline())}
      <div style="height:${1.2*CM}px"></div>
      <div style="font:700 ${14*96/72}px/1 'Space Mono',monospace;color:${CREAM}">passionseed.org</div></div>`,
};
(async () => {
  const browser = await chromium.launch();
  for (const [name, html] of Object.entries(pages)) {
    const page = await browser.newPage({ deviceScaleFactor: SCALE, viewport: { width: 1200, height: 900 } });
    await page.setContent(`<html><head>${FONTS}<style>html,body{margin:0;background:transparent}</style></head><body><div id="art" style="display:inline-block;padding:2px">${html}</div></body></html>`);
    await page.evaluate(async () => {
      await document.fonts.load("700 100px Kodchasan");
      await document.fonts.load("700 20px 'Space Mono'");
      await document.fonts.ready;
      for (const el of document.querySelectorAll('.fit')) {        // scale type to an exact width
        const target = +el.dataset.w, fs = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = (fs * target / el.getBoundingClientRect().width) + 'px';
      }
    });
    await page.waitForTimeout(200);
    const box = await page.locator('#art').boundingBox();
    await page.locator('#art').screenshot({ path: OUT + `ps01-${name}.png`, omitBackground: true });
    console.log(name, (box.width / CM).toFixed(1) + ' x ' + (box.height / CM).toFixed(1) + ' cm');
    await page.close();
  }
  await browser.close();
})();
