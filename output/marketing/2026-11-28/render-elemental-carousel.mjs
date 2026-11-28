/**
 * Renders one Elemental element carousel for Instagram: three slides at 1080x1350.
 *   1 a picture of the problem, 2 why Thailand still has it, 3 the prize and the days left.
 *
 *   node output/marketing/2026-11-28/render-elemental-carousel.mjs elemental-water
 *   DAYS_LEFT=6 node output/marketing/2026-11-28/render-elemental-carousel.mjs elemental-earth
 *
 * Reads <folder>/carousel.json (the element, and slides 1 and 2: photo, corner label, text, credit, and
 * where each fact was checked) and writes <folder>/01.jpg, 02.jpg, 03.jpg and contact.jpg.
 * Slide 3 is the same for every element: the prize, the countdown and the facts row.
 *
 * DAYS_LEFT is the number on slide 3: whole days from the day the post goes out to the first day,
 * 5 Dec 2026. Left out, it is counted from today, so re-render on the posting day.
 *
 * Needs Playwright, which this repo doesn't depend on: run it where `playwright` resolves, or set
 * PLAYWRIGHT to the path of its index.mjs. Fonts load from Google Fonts, so it needs a connection.
 *
 * Event facts on slide 3 (5–12 ธ.ค., online, ม.3–ม.6, prize total) match
 * components/hackathon/poster/elemental/facts.ts and Angpao's 27 Nov post; check there before re-rendering.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const folder = process.argv[2];
if (!folder) {
  console.error("usage: node render-elemental-carousel.mjs <folder with carousel.json>");
  process.exit(1);
}
const DIR = join(HERE, folder);
const { element, slides: [ONE, TWO] } = JSON.parse(readFileSync(join(DIR, "carousel.json"), "utf8"));
const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright");

const b64 = (p, t) => `data:${t};base64,${readFileSync(p).toString("base64")}`;
const jpg = (file) => b64(join(DIR, file), "image/jpeg");
const DAYS_LEFT = Number(process.env.DAYS_LEFT ?? Math.ceil((Date.UTC(2026, 11, 5) - Date.now()) / 86400000));
const CREAM = "#f3efe6", YELLOW = "#ffd067";

const TROPHY = ["###########", "#.#h#####.#", "#.#h#####.#", ".#.h####.#.", "...#####...", "....###....", ".....#.....", ".....#.....", "...bbbbb...", "..bbbbbbb.."];
const ICON = {
  date: ["#.......#", "#########", "#########", "#.......#", "#.#.#.#.#", "#.......#", "#.#.#.#.#", "#.......#", "#########"],
  online: ["..#####..", ".#.....#.", "#..###..#", "..#...#..", ".#..#..#.", "...#.#...", "....#....", ".........", "....#...."],
  school: ["....#....", "...###...", ".#######.", "#########", ".#######.", "#..###...", "#.#...#..", "#..###...", "........."],
};
const px = (rows, cell, fill) => {
  let r = "";
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (c !== ".") r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${typeof fill === "function" ? fill(c) : fill}"/>`; }));
  return `<svg width="${rows[0].length * cell}" height="${rows.length * cell}" viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" style="display:block;flex:none">${r}</svg>`;
};
// The PassionSeed name is the wordmark SVG, cream on these dark slides.
const wordmark = readFileSync(join(ROOT, "public/passionseed-wordmark.svg"), "utf8")
  .replace(/<svg[^>]*>/, `<svg height="24" viewBox="0 0 1299 223" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;color:${CREAM}">`)
  .replace(/fill="#[0-9a-fA-F]{3,8}"/g, `fill="currentColor"`);
const lockup = `<div class="top"><div class="lockup"><img src="${b64(join(ROOT, "public/hackathon/HackLogo.png"), "image/png")}" width="110" height="44" style="filter:brightness(0) invert(1);opacity:.9"><span class="x">×</span><span class="ps"><img src="${b64(join(ROOT, "public/passion-seed-logo.png"), "image/png")}" width="44" height="44">${wordmark}</span></div><p class="kicker">ELEMENTAL HACKATHON</p></div>`;
const tag = `<div class="tag"><i></i>${element.th} <em>${element.en}</em></div>`;
const grain = `<svg class="grain" width="1080" height="1350"><filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="1080" height="1350" filter="url(#g)"/></svg>`;
const fact = (icon, text) => `<span class="fact">${px(ICON[icon], 3.6, CREAM)}<span>${text}</span></span>`;

/**
 * A full-bleed photo with the text over a dark fade at the bottom.
 * variant "title": one headline, plain lines, then a yellow line. variant "question": a two-line
 * headline with the second line big and yellow, then lines (html, <b> turns yellow).
 */
const photoSlide = (s) => `<img class="bg" src="${jpg(s.file)}" style="object-position:${s.position ?? "50% 50%"}">
  <div class="shade-top"></div><div class="shade-bot" style="height:${s.shadeBottom ?? 780}px"></div>
  ${lockup}<div class="place">${s.place}</div>
  <div class="cap ${s.variant}">${tag}
    <h1>${s.h1}</h1>
    ${s.variant === "title" ? `${(s.lines ?? []).map((l) => `<p>${l}</p>`).join("")}<p class="hit">${s.hit}</p>` : `<p class="sub">${s.lines.join("<br>")}</p>`}
  </div>
  <div class="credit">${s.credit}</div>`;

const slides = {
  "01": photoSlide(ONE),
  "02": photoSlide(TWO),
  "03": `<img class="bg" src="${jpg(element.plate)}">
  <div class="shade-top" style="height:900px;background:linear-gradient(to bottom,rgba(12,12,11,.9) 0%,rgba(12,12,11,.82) 58%,rgba(12,12,11,0) 100%)"></div><div class="shade-bot" style="height:330px"></div>
  ${lockup}
  <div class="prize">
    <p class="lead">รับไปเลย</p>
    <div class="num">${px(TROPHY, 11, (c) => (c === "h" ? "#ffffff" : YELLOW))}<b>20,000</b><span>รางวัลรวมมูลค่า<br><strong>บาท</strong></span></div>
    <p class="if">ถ้าคุณแก้ปัญหาเกี่ยวกับ <span class="el">${element.th} <em>${element.en}</em></span> ได้</p>
  </div>
  <div class="left"><div class="days"><b>${DAYS_LEFT}</b><span>วัน<br>ก่อนเริ่ม</span></div><div class="name">Elemental <em>Hackathon</em></div>
    <div class="facts">${fact("date", "5–12 ธ.ค.")}${fact("online", "ออนไลน์")}${fact("school", "ม.3–ม.6 เท่านั้น")}</div></div>`,
};

const css = `*{margin:0;padding:0;box-sizing:border-box}
 .s{position:relative;width:1080px;height:1350px;overflow:hidden;background:#141312;font-family:Trirong,serif;color:${CREAM}}
 .bg{position:absolute;inset:0;width:1080px;height:1350px;object-fit:cover}
 .shade-top{position:absolute;left:0;right:0;top:0;height:250px;background:linear-gradient(to bottom,rgba(12,12,11,.93) 0%,rgba(12,12,11,.86) 62%,rgba(12,12,11,0) 100%)}
 .shade-bot{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(to top,rgba(12,12,11,.96) 0%,rgba(12,12,11,.86) 38%,rgba(12,12,11,0) 100%)}
 .top{position:absolute;left:56px;top:48px}
 .lockup{display:flex;align-items:center;gap:16px}.lockup .x{font:400 18px 'Space Mono',monospace;opacity:.7}.lockup .ps{display:flex;align-items:center;gap:10px}
 .kicker{margin-top:26px;font:400 22px 'Space Mono',monospace;letter-spacing:.08em;opacity:.75}
 .place{position:absolute;right:56px;top:60px;font:400 20px Trirong,serif;letter-spacing:.02em;opacity:.85}
 .tag{display:flex;align-items:center;gap:14px;font-weight:400;font-size:40px;line-height:1.3}.tag i{width:18px;height:18px;background:${element.color};display:block}.tag em{font-weight:200;font-size:34px;opacity:.75}
 .grain{position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:.16}
 .cap{position:absolute;left:56px;right:56px;bottom:104px}
 .cap.title{bottom:96px}.cap.title h1{margin-top:6px;font-weight:300;font-size:84px;line-height:1.35;white-space:nowrap}.cap.title h1 em{font-weight:200;font-size:48px;opacity:.75}
 .cap.title p{font-weight:300;font-size:38px;line-height:1.45}.cap.title p.hit{margin-top:8px;font-weight:500;font-size:44px;color:${YELLOW}}
 .cap.question h1{margin-top:10px;font-weight:300;font-size:74px;line-height:1.32;white-space:nowrap}.cap.question h1 b{font-weight:400;font-size:96px;color:${YELLOW}}
 .cap.question p.sub{margin-top:18px;font-weight:300;font-size:38px;line-height:1.5}.cap.question p.sub b{font-weight:500;color:${YELLOW}}
 .credit{position:absolute;left:56px;right:56px;bottom:48px;font:400 17px Trirong,serif;opacity:.6;white-space:nowrap}
 .prize{position:absolute;left:56px;right:56px;top:196px}
 .prize .lead{font-weight:300;font-size:74px;line-height:1.3}
 .prize .num{display:flex;align-items:center;gap:22px;margin-top:4px}.prize .num b{font-weight:200;font-size:196px;line-height:190px;letter-spacing:-.01em;color:${YELLOW}}
 .prize .num span{font-weight:300;font-size:32px;line-height:42px}.prize .num strong{font-weight:400;font-size:46px;color:${YELLOW}}
 .prize .if{margin-top:22px;font-weight:400;font-size:47px;line-height:1.4;white-space:nowrap}.prize .el{color:${YELLOW}}.prize .el em{font-weight:200}
 .left{position:absolute;left:56px;right:56px;bottom:56px}
 .days{display:flex;align-items:flex-end;gap:14px}.days b{font-weight:200;font-size:150px;line-height:128px;color:${CREAM}}.days span{font-weight:400;font-size:34px;line-height:42px;padding-bottom:6px}
 .name{position:absolute;right:0;bottom:66px;font-weight:300;font-size:58px;line-height:1.2;text-align:right}.name em{font-weight:300}
 .facts{display:flex;gap:30px;margin-top:22px;font-weight:400;font-size:31px;line-height:40px;white-space:nowrap}.fact{display:flex;align-items:center;gap:10px}`;

const html = `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Trirong:ital,wght@0,200;0,300;0,400;0,500;1,200;1,300&family=Space+Mono&display=block" rel="stylesheet"><style>${css}</style></head><body>${Object.entries(slides).map(([id, body]) => `<div class="s" id="s${id}">${body}${grain}</div>`).join("")}</body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const fonts = await page.evaluate(() => ["300 40px Trirong", "400 20px 'Space Mono'"].map((f) => document.fonts.check(f)));
// Anything wider than the 56px margins is an overflow to fix before sending.
const over = await page.evaluate(() => [...document.querySelectorAll(".s")].flatMap((s) => { const S = s.getBoundingClientRect(); return [...s.querySelectorAll("h1,p,.credit,.place,.facts,.num,.name,.days")].map((e) => { const r = e.getBoundingClientRect(); return { slide: s.id, el: e.getAttribute("class") || e.tagName, right: Math.round(r.right - S.left), sw: e.scrollWidth, cw: e.clientWidth }; }).filter((r) => r.right > 1024 || r.sw > r.cw + 1); }));
const shots = [];
for (const id of Object.keys(slides)) {
  const png = await page.locator(`#s${id}`).screenshot();
  await sharp(png).jpeg({ quality: 92, mozjpeg: true }).toFile(join(DIR, `${id}.jpg`));
  shots.push(await sharp(png).resize(540, 675).toBuffer());
}
await browser.close();
await sharp({ create: { width: 3 * 540 + 2 * 10, height: 675, channels: 3, background: "#282828" } })
  .composite(shots.map((input, i) => ({ input, left: i * 550, top: 0 })))
  .jpeg({ quality: 88 })
  .toFile(join(DIR, "contact.jpg"));
console.log(`${folder}: days left ${DAYS_LEFT} | fonts loaded ${fonts.join(",")} | overflow ${JSON.stringify(over)}`);
