import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// Typographic artwork, preserving the supplied anonymous quotes exactly.
GlobalFonts.registerFromPath(fileURLToPath(new URL("../../../lib/og/fonts/Kodchasan-Bold.ttf", import.meta.url)), "Kodchasan");
const output = fileURLToPath(new URL(".", import.meta.url));
const W = 1200;
const cards = [
  {
    file: "linkedin-shift-quote-01.png",
    accent: "#7fe3ff",
    lines: ["วันแรกไม่ค่อยกล้า", "คุยกับคนแปลกหน้า", "แต่ตอนนี้กล้าคุยกับ", "คนแปลกหน้ามากขึ้น"],
    highlighted: [2, 3],
    size: 70,
    start: 465,
    index: "01",
  },
  {
    file: "linkedin-shift-quote-02.png",
    accent: "#ffd29a",
    lines: ["การยอมรับว่า", "ทุกไอเดียของเรา", "ไม่ได้ดีเสมอไป"],
    highlighted: [2],
    size: 84,
    start: 485,
    index: "02",
  },
];

for (const card of cards) {
  const canvas = createCanvas(W, W);
  const c = canvas.getContext("2d");
  c.fillStyle = "#03040b";
  c.fillRect(0, 0, W, W);
  const glow = c.createRadialGradient(1010, 1090, 20, 1010, 1090, 950);
  glow.addColorStop(0, card.index === "01" ? "#15233e" : "#2d1931");
  glow.addColorStop(1, "#03040b");
  c.fillStyle = glow;
  c.fillRect(0, 0, W, W);

  // A quiet, deterministic field of stars, matching SHIFT's cosmos palette.
  let seed = Number(card.index) * 3781;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 90; i++) {
    c.fillStyle = `rgba(244,246,255,${0.08 + random() * 0.22})`;
    c.beginPath();
    c.arc(random() * W, random() * W, 0.5 + random() * 1.15, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = card.index === "01" ? "#7fe3ff19" : "#ffd29a19";
  c.lineWidth = 1.5;
  c.beginPath();
  c.ellipse(1230, 1170, 650, 380, -0.7, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.ellipse(1230, 1170, 700, 430, -0.7, 0, Math.PI * 2);
  c.stroke();

  c.textBaseline = "alphabetic";
  c.fillStyle = "#f4f6ff";
  c.font = "bold 33px Kodchasan";
  c.fillText("PassionSeed", 88, 115);
  c.fillStyle = "#a9adc2";
  c.font = "bold 19px Kodchasan";
  c.textAlign = "right";
  c.fillText(`STUDENT VOICES / ${card.index}`, 1112, 112);
  c.textAlign = "left";
  c.strokeStyle = "#f4f6ff33";
  c.beginPath(); c.moveTo(88, 155); c.lineTo(1112, 155); c.stroke();

  c.font = "italic bold 100px Kodchasan";
  c.fillStyle = "#f4f6ff";
  c.fillText("SHIFT", 84, 300);
  c.font = "bold 145px Kodchasan";
  c.fillStyle = card.accent;
  c.fillText("“", 82, 438);

  c.font = `bold ${card.size}px Kodchasan`;
  for (const [i, line] of card.lines.entries()) {
    if (c.measureText(line).width > 1024) throw new Error(`Quote overflows: ${line}`);
    c.fillStyle = card.highlighted.includes(i) ? card.accent : "#f4f6ff";
    c.fillText(line, 88, card.start + i * 110);
  }

  c.fillStyle = card.accent;
  c.fillRect(88, 947, 42, 3);
  c.font = "bold 24px Kodchasan";
  c.fillStyle = "#f4f6ff";
  c.fillText("Anonymous participant", 88, 1008);
  c.font = "bold 20px Kodchasan";
  c.fillStyle = "#a9adc2";
  c.fillText("SHIFT[2] · Student feedback", 88, 1048);
  c.fillStyle = "#a9adc2";
  c.font = "bold 19px Kodchasan";
  c.fillText("passionseed.org/shift", 88, 1130);
  c.textAlign = "right";
  c.fillStyle = card.accent;
  c.fillText("IN THEIR OWN WORDS", 1112, 1130);
  writeFileSync(join(output, card.file), canvas.toBuffer("image/png"));
  console.log(card.file);
}
