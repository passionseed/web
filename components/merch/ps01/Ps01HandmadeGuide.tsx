import Image from "next/image";
import {
  BADGE,
  COST,
  COST_TOTAL,
  IRON_ON,
  KEYCHAIN_LEGEND,
  MESSAGE_TO_SHOP,
  PRINT_FILES,
  STEPS,
  keychainYarnKey,
} from "@/lib/content/ps01-handmade";
import { ChartLegend, PixelChart } from "./PixelChart";
import { ShirtPreview } from "./ShirtPreview";
import styles from "./ps01.module.css";

function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.lockup}>
        <Image src="/passion-seed-logo.png" alt="" width={56} height={56} unoptimized />
        <span>PassionSeed</span>
      </div>
      <h1 className={styles.title}>
        PS[01] <span>LIGHTS ON</span>
      </h1>
      <p className={styles.lede}>
        The first 10 shirts for the team and mentors. A navy tee is the night; the lit windows are people building. Two prints, one print shop, about a week.
      </p>
      <div className={styles.stats}>
        <div><b>10</b>shirts + 1 test</div>
        <div><b>2</b>print files</div>
        <div><b>฿{COST_TOTAL.replace("~", "")}</b>total, estimate</div>
      </div>
    </header>
  );
}

function Files() {
  return (
    <section>
      <h2 className={styles.h2}>THE TWO PRINT FILES</h2>
      <p className={styles.muteSmall}>PNG, transparent background, 300 dpi, already at print size. Send these exact files to the shop.</p>
      <div className={styles.files}>
        {PRINT_FILES.map((f) => (
          <div key={f.id} className={styles.file}>
            <div className={styles.fileArt}>
              <Image src={f.file} alt={`${f.label} print`} width={400} height={400} unoptimized />
            </div>
            <h3>{f.label}</h3>
            <p className={styles.fileSize}>{f.size}</p>
            <p className={styles.muteSmall}>{f.placement}</p>
            <a className={styles.download} href={f.file} download>
              Download PNG
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

function Steps() {
  return (
    <section>
      <h2 className={styles.h2}>THREE STEPS</h2>
      <ol className={styles.steps}>
        {STEPS.map((s) => (
          <li key={s.title}>
            <span className={styles.when}>{s.when}</span>
            <h3>{s.title}</h3>
            {s.body}
          </li>
        ))}
      </ol>
      <div className={styles.note}>
        <p className={styles.noteLabel}>Message for the shop (LINE)</p>
        <p lang="th" className={styles.thai}>{MESSAGE_TO_SHOP}</p>
      </div>
    </section>
  );
}

function IronOn() {
  return (
    <section>
      <h2 className={styles.h2}>IF YOU PRESS THEM YOURSELF</h2>
      <p className={styles.muteSmall}>Only if the shop hands you the transfers instead of pressing them.</p>
      <ol className={styles.tips}>
        {IRON_ON.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
    </section>
  );
}

function Cost() {
  return (
    <section>
      <h2 className={styles.h2}>COST</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <tbody>
            {COST.map((c) => (
              <tr key={c.item}>
                <td>{c.item}</td>
                <td className={styles.num}>฿{c.thb}</td>
              </tr>
            ))}
            <tr>
              <td><b>Total</b></td>
              <td className={styles.num}><b>฿{COST_TOTAL}</b></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.muteSmall}>Estimates. Ask the shop for a real price before ordering.</p>
    </section>
  );
}

function Keychain() {
  return (
    <section>
      <h2 className={styles.h2}>OPTIONAL: CROCHET KEYCHAIN</h2>
      <p>
        A handmade extra with your 4ply yarn: crochet the pixel logo as a keychain, one square per single crochet,
        bottom row up. About 7–8 cm on a 2.5 mm hook. Crochet a front and a back, stuff lightly, add a chain loop.
      </p>
      <div className={styles.chart}>
        <PixelChart rows={BADGE} legend={KEYCHAIN_LEGEND} keyFor={keychainYarnKey} />
        <ChartLegend legend={KEYCHAIN_LEGEND} />
      </div>
    </section>
  );
}

export function Ps01HandmadeGuide() {
  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <Header />
        <div className={styles.preview}>
          <figure>
            <ShirtPreview side="front" />
            <figcaption>Front · logo + PassionSeed, left chest</figcaption>
          </figure>
          <figure>
            <ShirtPreview side="back" />
            <figcaption>Back · PassionSeed over a pixel city, a few windows lit</figcaption>
          </figure>
        </div>
        <Steps />
        <Files />
        <IronOn />
        <Cost />
        <Keychain />
        <footer className={styles.footer}>PS[01] · first 10 · PassionSeed</footer>
      </div>
    </main>
  );
}
