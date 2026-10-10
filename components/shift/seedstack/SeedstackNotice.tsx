import { INK } from "@/components/shift/poster/riso";
import { SEEDSTACK_NOTICE } from "@/lib/seedstack/consent";

const paper = (alpha: string) => `${INK.paper}${alpha}`;

function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** The PDPA notice, shown identically to students and parents. */
export function SeedstackNotice() {
  const n = SEEDSTACK_NOTICE;
  return (
    <section
      className="space-y-4 rounded-xl p-5 text-sm leading-relaxed"
      style={{ backgroundColor: paper("0d"), boxShadow: `inset 0 0 0 1px ${paper("26")}`, color: paper("cc") }}
    >
      <h2 className="font-kodchasan text-base font-bold" style={{ color: INK.paper }}>
        {n.title}
      </h2>
      <p>{n.why}</p>
      <List items={n.collect} />
      <List items={n.notCollect} />
      <p><strong style={{ color: INK.paper }}>ต้องเชื่อมไหม:</strong> {n.basis}</p>
      <p><strong style={{ color: INK.paper }}>ใครเห็น:</strong> {n.who}</p>
      <p><strong style={{ color: INK.paper }}>เก็บนานแค่ไหน:</strong> {n.retention}</p>
      <p><strong style={{ color: INK.paper }}>สิทธิ์ของเรา:</strong> {n.rights}</p>
      <p><strong style={{ color: INK.paper }}>ผู้ปกครอง:</strong> {n.parents}</p>
      <p>{n.contact}</p>
    </section>
  );
}
