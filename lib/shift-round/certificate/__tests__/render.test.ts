/**
 * @jest-environment node
 *
 * Golden images for the certificate renderer (spec 7.4, E12, DS11, A38).
 * Regenerate after an intentional layout change with:
 *   UPDATE_GOLDEN=1 npx jest lib/shift-round/certificate/__tests__/render.test.ts
 * then look at every PNG in __tests__/golden before committing.
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { buildCertificateContent } from "../content";
import { FIXTURE_PUBLIC_ID, FIXTURE_SNAPSHOTS } from "../fixtures";
import { renderCertificatePng } from "../render";
import { IMAGE_FORMATS, type ImageFormat } from "../types";

jest.setTimeout(60_000);

const GOLDEN_DIR = path.join(__dirname, "golden");
const UPDATE = process.env.UPDATE_GOLDEN === "1";
// Anti-aliasing differs slightly across OS/Skia builds; layout or glyph
// regressions change far more than this.
const MAX_DIFF_RATIO = 0.004;
const BASE = "https://www.passionseed.org";

const cases: [string, ImageFormat][] = Object.keys(FIXTURE_SNAPSHOTS).flatMap((name) =>
  (["story", "square"] as ImageFormat[]).map((format): [string, ImageFormat] => [name, format])
);

describe("certificate renderer golden images", () => {
  it.each(cases)("%s / %s matches its golden PNG", async (name, format) => {
    const content = buildCertificateContent(FIXTURE_SNAPSHOTS[name], FIXTURE_PUBLIC_ID, BASE);
    const png = await renderCertificatePng(content, format);
    const actual = PNG.sync.read(png);
    expect(actual.width).toBe(IMAGE_FORMATS[format].width);
    expect(actual.height).toBe(IMAGE_FORMATS[format].height);

    const goldenPath = path.join(GOLDEN_DIR, `${name}-${format}.png`);
    if (UPDATE) {
      mkdirSync(GOLDEN_DIR, { recursive: true });
      writeFileSync(goldenPath, new Uint8Array(png));
      return;
    }
    if (!existsSync(goldenPath)) {
      throw new Error(`Missing golden ${goldenPath}. Run with UPDATE_GOLDEN=1 and review the image.`);
    }
    const expected = PNG.sync.read(readFileSync(goldenPath));
    const diff = new PNG({ width: actual.width, height: actual.height });
    const changed = pixelmatch(expected.data, actual.data, diff.data, actual.width, actual.height, {
      threshold: 0.1,
    });
    const ratio = changed / (actual.width * actual.height);
    if (ratio > MAX_DIFF_RATIO) {
      const out = path.join(os.tmpdir(), `shift-cert-diff-${name}-${format}.png`);
      writeFileSync(out, new Uint8Array(PNG.sync.write(diff)));
      throw new Error(`${name}/${format}: ${(ratio * 100).toFixed(3)}% pixels differ (diff: ${out})`);
    }
  });

  it("detects a changed name against the golden (the comparison is not too loose)", async () => {
    if (UPDATE) return;
    const other = { ...FIXTURE_SNAPSHOTS.handle, holder: { handle: "ฝั่งปี่", legal_name: null, display: "handle" as const } };
    const png = await renderCertificatePng(buildCertificateContent(other, FIXTURE_PUBLIC_ID, BASE), "square");
    const actual = PNG.sync.read(png);
    const expected = PNG.sync.read(readFileSync(path.join(GOLDEN_DIR, "handle-square.png")));
    const changed = pixelmatch(expected.data, actual.data, null, actual.width, actual.height, { threshold: 0.1 });
    expect(changed / (actual.width * actual.height)).toBeGreaterThan(MAX_DIFF_RATIO);
  });

  it("shows the handle by default and the legal name only when opted in", () => {
    const handle = buildCertificateContent(FIXTURE_SNAPSHOTS.handle, FIXTURE_PUBLIC_ID, BASE);
    expect(handle.holder).toBe("ต้น");
    const legal = buildCertificateContent(FIXTURE_SNAPSHOTS.legal_name, FIXTURE_PUBLIC_ID, BASE);
    expect(legal.holder).toBe("ธนกฤต ศรีสุวรรณวงศ์ไพบูลย์");
    const optedOut = buildCertificateContent(
      { ...FIXTURE_SNAPSHOTS.legal_name, holder: { ...FIXTURE_SNAPSHOTS.legal_name.holder, display: "handle" } },
      FIXTURE_PUBLIC_ID,
      BASE
    );
    expect(optedOut.holder).toBe("ต้น");
  });

  it("states a factual record and never claims admissions endorsement (DS16)", () => {
    const content = buildCertificateContent(FIXTURE_SNAPSHOTS.handle, FIXTURE_PUBLIC_ID, BASE);
    expect(content.statement.en).toBe(
      "This certificate records that ต้น completed all 6 Missions of SHIFT round 4 (10 – 23 Nov 2026) with Passion Seed"
    );
    expect(content.statement.th).toContain("ใบรับรองนี้บันทึกว่า ต้น ทำภารกิจครบทั้ง 6 ใน SHIFT รอบที่ 4");
    const all = `${content.statement.en} ${content.statement.th}`.toLowerCase();
    for (const word of ["admission", "endorse", "certif" + "ies that", "guarantee", "รับรองการรับเข้า"]) {
      expect(all).not.toContain(word);
    }
    expect(content.verifyUrlText).toBe("www.passionseed.org/c/7K2M9QX4T8HBN3PD");
  });
});
