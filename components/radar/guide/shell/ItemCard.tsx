/**
 * An in-world fact item. Facts never appear as body copy: they show up as an
 * intel card, a phone notification, a terminal line, a chat bubble or a stat
 * readout, always with their source chips. Simulated items carry "จำลอง" and a
 * "ตัวอย่างจำลอง" watermark, and use generic chrome (no app or bank logos).
 * Server component.
 */
import type { CopyText, ItemKind } from "@/lib/radar-guide/guide-types";
import { FactChips } from "./FactChips";
import { WarnGlyph } from "./glyphs";

const KIND_LABEL_TH: Record<ItemKind, string> = {
  intel: "การ์ดข้อมูล",
  notification: "แจ้งเตือน",
  terminal: "เทอร์มินัล",
  chat: "แชต",
  stat: "ตัวเลขจริง",
};

export interface ItemCardProps {
  item: ItemKind;
  text: CopyText;
  titleTh?: string;
  metaTh?: string;
  simulated?: boolean;
}

function TerminalLines({ text }: { text: string }) {
  return (
    <pre className="rg-item__term">
      {text.split("\n").map((line, i) => (
        <span key={i} className="rg-item__termline">
          {line}
        </span>
      ))}
    </pre>
  );
}

export function ItemCard({ item, text, titleTh, metaTh, simulated }: ItemCardProps) {
  return (
    <figure className={`rg-item rg-item--${item}`} data-item={item} data-simulated={simulated ? "true" : undefined}>
      <figcaption className="rg-item__head">
        <span className="rg-item__kind">
          {simulated && item === "stat" ? "ตัวเลขจำลอง" : KIND_LABEL_TH[item]}
        </span>
        {metaTh ? <span className="rg-item__meta">{metaTh}</span> : null}
      </figcaption>
      {titleTh && item !== "stat" ? <p className="rg-item__title">{titleTh}</p> : null}
      {item === "terminal" ? (
        <TerminalLines text={text.th} />
      ) : item === "stat" ? (
        <div className="rg-item__stat">
          <p className="rg-item__statvalue">{text.th}</p>
          {titleTh ? <p className="rg-item__statlabel">{titleTh}</p> : null}
        </div>
      ) : (
        <p className="rg-item__body">{text.th}</p>
      )}
      {simulated ? (
        <span className="rg-item__watermark" aria-hidden="true">
          ตัวอย่างจำลอง
        </span>
      ) : null}
      <FactChips factIds={text.factIds} badge={text.badge} labels={text.labels} simulated={simulated} />
    </figure>
  );
}

/** The fixed legal-lab line on pages that show hacking. Never dismissable. */
export function SafetyCard({ lineTh }: { lineTh: string }) {
  return (
    <aside className="rg-safety" role="note">
      <span className="rg-safety__icon">
        <WarnGlyph />
      </span>
      <p className="rg-safety__line">{lineTh}</p>
    </aside>
  );
}
