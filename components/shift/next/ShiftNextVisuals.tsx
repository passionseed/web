import { Check } from "lucide-react";

import styles from "@/components/shift/next/shiftNext.module.css";

/**
 * Small looping illustrations for /shift/next. Pure CSS motion, so they cost
 * nothing to hydrate and freeze under reduced motion.
 */

/** Why: a stack of identical certificates next to a prototype people tap. */
export function CertVsPrototype() {
  return (
    <div
      className={`${styles.glass} ${styles.versus}`}
      data-glass
      data-shift-reveal
      aria-hidden="true"
    >
      <figure className={styles.versusSide}>
        <div className={styles.certStack}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={styles.cert}
              style={{ ["--i" as string]: i }}
            >
              <span className={styles.certTitle}>CERTIFICATE</span>
              <span className={styles.certLine} />
              <span className={styles.certLine} data-short />
              <span className={styles.certSeal} />
            </div>
          ))}
        </div>
        <figcaption>ใบเซอร์ หน้าตาเหมือนกันทุกใบ</figcaption>
      </figure>

      <span className={styles.versusArrow}>→</span>

      <figure className={styles.versusSide}>
        <div className={styles.phone}>
          <span className={styles.phoneBar} />
          <span className={styles.phoneBlock} />
          <span className={styles.phoneBlock} data-short />
          <span className={styles.phoneButton} />
          <span className={styles.tap} />
          <div className={styles.testers}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={styles.tester}
                style={{ ["--i" as string]: i }}
              >
                <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
              </span>
            ))}
          </div>
        </div>
        <figcaption>ต้นแบบ ที่มีคนกดใช้จริง</figcaption>
      </figure>
    </div>
  );
}

function RingStars({ seats }: { seats: number }) {
  return (
    <>
      {Array.from({ length: seats }, (_, i) => (
        <span
          key={i}
          className={styles.ringStar}
          style={{ ["--i" as string]: i }}
        />
      ))}
    </>
  );
}

/** Reserve: stars on a ring light one by one; when the ring closes, the round opens. */
export function QuorumMeter({ seats }: { seats: number }) {
  return (
    <div className={styles.quorum}>
      <div
        className={styles.ring}
        style={{ ["--step" as string]: `${360 / seats}deg` }}
        aria-hidden="true"
      >
        <div className={styles.ringLayer}>
          <RingStars seats={seats} />
        </div>
        <div className={`${styles.ringLayer} ${styles.ringLit}`}>
          <RingStars seats={seats} />
        </div>
        <div className={styles.ringCore}>
          <strong>{seats}</strong>
          <span>คน</span>
        </div>
      </div>
      <p className={styles.quorumLabel}>
        <strong>ครบ {seats} คน เปิดรอบ</strong>
        ทุกคนที่ลงชื่อช่วงเดียวกัน คือดาวอีกดวงบนวงนี้
      </p>
    </div>
  );
}
