import Link from "next/link";
import type { ReactNode } from "react";

import { BoardChip, Btn, ExampleTag, Panel, Path, RowSketch, ZoneSketch } from "./replicas";

/**
 * /shift/canvas-guide: how students, mentors and admins use SHIFT project
 * canvases. Thai first; button names are written exactly as they appear.
 */

export const GUIDE_SECTIONS = [
  { id: "students", label: "นักเรียน" },
  { id: "mentors", label: "เมนเทอร์และทีม SHIFT" },
  { id: "admins", label: "แอดมิน" },
  { id: "privacy", label: "ข้อมูลและความเป็นส่วนตัว" },
] as const;

const ZONES = ["🎯 ปัญหา", "👥 กลุ่มเป้าหมาย", "🎤 สัมภาษณ์", "🔍 ตัวอย่าง/คู่แข่ง", "💡 ไอเดีย", "🧪 ทดสอบ", "🔀 เปลี่ยนแผน", "🚀 ปล่อยงาน", "📅 วันที่ 1 ถึง 7"];

function Step({ n, title, children, demoLabel, demo }: { n: number; title: string; children: ReactNode; demoLabel: string; demo: ReactNode }) {
  return (
    <li className="grid gap-5 rounded-2xl border border-orange-300/20 bg-white/[0.03] p-5 md:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      <div className="grid min-w-0 content-start gap-2 text-slate-300">
        <h3 className="flex items-center gap-2.5 font-kodchasan text-lg font-semibold text-white">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-500 font-space-mono text-sm text-orange-950" aria-hidden="true">
            {n}
          </span>
          {title}
        </h3>
        {children}
      </div>
      <div className="grid min-w-0 content-center justify-items-start gap-2.5">
        <p className="font-space-mono text-[11px] uppercase tracking-widest text-slate-400">{demoLabel}</p>
        {demo}
      </div>
    </li>
  );
}

function Section({ id, eyebrow, title, intro, children }: { id: string; eyebrow: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-24 gap-6 pt-12">
      <header className="grid gap-2">
        <p className="font-space-mono text-xs uppercase tracking-[0.14em] text-orange-300">{eyebrow}</p>
        <h2 id={`${id}-title`} className="font-kodchasan text-2xl font-bold text-white sm:text-3xl">
          {title}
        </h2>
        {intro && <p className="max-w-2xl text-slate-300">{intro}</p>}
      </header>
      {children}
    </section>
  );
}

function Tips({ title, items }: { title: string; items: ReactNode[] }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-orange-300/40 bg-orange-500/[0.06] p-5">
      <h3 className="font-kodchasan text-lg font-semibold text-white">{title}</h3>
      <ul className="grid list-disc gap-1 pl-5 text-slate-300">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const B = ({ children }: { children: ReactNode }) => <strong className="font-semibold text-white">{children}</strong>;
const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded border border-orange-300/40 px-1.5 font-space-mono text-xs">{children}</kbd>
);

export function ShiftCanvasGuide() {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="grid gap-3">
        <p className="font-space-mono text-xs uppercase tracking-[0.14em] text-orange-300">PassionSeed · SHIFT</p>
        <h1 className="font-kodchasan text-4xl font-bold text-white sm:text-5xl">คู่มือแคนวาส SHIFT</h1>
        <p className="max-w-2xl text-slate-300">
          แคนวาสโปรเจกต์คือที่ที่นักเรียนเก็บทุกอย่างของโปรเจกต์ไว้บนไวท์บอร์ด ตั้งแต่ปัญหา สัมภาษณ์ ทดสอบ ไปจนถึงปล่อยงาน
          เมนเทอร์เปิดดูทุกแคนวาสได้ในหน้าเดียว และให้ Claude ช่วยสรุปได้ เลือกบทบาทของคุณ
        </p>
      </header>

      <nav aria-label="เลือกบทบาท" className="sticky top-0 z-10 -mx-4 mt-6 flex flex-wrap gap-2 bg-[var(--dusk-space-950)]/90 px-4 py-3 backdrop-blur">
        {GUIDE_SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="inline-flex min-h-11 items-center rounded-full border border-orange-300/30 px-4 text-sm font-medium text-slate-200 hover:border-orange-300 hover:text-white"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <Section
        id="students"
        eyebrow="สำหรับนักเรียน"
        title="ทำโปรเจกต์บนแคนวาส"
        intro="ทุกอย่างอยู่บนไวท์บอร์ดของรอบ SHIFT ของคุณ แคนวาสที่คุณสร้างเป็นของคุณ คุณเลือกเพื่อนเข้าทีมเองได้ คนอื่นในบอร์ดเห็นงานของคุณ แต่แก้ไม่ได้"
      >
        <ol className="grid gap-3.5">
          <Step
            n={1}
            title="สร้างแคนวาส"
            demoLabel="กดตามนี้"
            demo={<Path steps={[<Btn key="kit">▣ Board kit</Btn>, <Btn key="tab">SHIFT</Btn>, <Btn key="add" primary>+ แคนวาสโปรเจกต์ · Project canvas</Btn>]} />}
          >
            <p>
              เปิดบอร์ด กดปุ่ม <B>Board kit</B> (ไอคอนแผงด้านขวา) ที่มุมขวาบน แล้วไปที่แท็บ <B>SHIFT</B> กด <B>+ แคนวาสโปรเจกต์</B>
            </p>
            <p>แคนวาสใหม่จะไปอยู่ทางขวาของทุกอย่างบนบอร์ด จึงไม่ทับงานของใคร</p>
          </Step>
          <Step n={2} title="เพิ่มโน้ต" demoLabel="บนแคนวาส" demo={<ZoneSketch />}>
            <p>
              กด <B>+ เพิ่ม</B> ที่มุมขวาบนของช่องไหนก็ได้ จะได้โน้ตใหม่ในช่องนั้น แล้วพิมพ์ได้เลย ช่องบอกว่าโน้ตเป็นเรื่องอะไร
            </p>
            <ul className="flex flex-wrap gap-1.5" aria-label="ช่องบนแคนวาส">
              {ZONES.map((z) => (
                <li key={z} className="rounded-full border border-orange-300/20 px-2.5 text-sm text-white">
                  {z}
                </li>
              ))}
            </ul>
          </Step>
          <Step
            n={3}
            title="เก็บเวอร์ชันเมื่อความคิดเปลี่ยน"
            demoLabel="ชิปบนการ์ด"
            demo={<Path steps={[<BoardChip key="chip">↺ v2 · แก้อยู่</BoardChip>, <Btn key="save" primary>เก็บเป็น v3 · Save version</Btn>]} />}
          >
            <p>
              การ์ด <B>ปัญหา กลุ่มเป้าหมาย ไอเดีย</B> และ <B>ปล่อยงาน</B> เก็บเวอร์ชันได้ แก้ข้อความบนการ์ดก่อน แล้วเลือกการ์ด กดชิป{" "}
              <B>เก็บเวอร์ชัน</B> (หรือ v1, v2) จากนั้นกด <B>เก็บเป็น vN</B>
            </p>
            <p>
              ใส่ <B>เปลี่ยนเพราะอะไร</B> ด้วยก็ได้ เวอร์ชันเก่าไม่หาย และลบไม่ได้ เพราะมันคือหลักฐานว่าความคิดของคุณเติบโตขึ้น
            </p>
          </Step>
          <Step
            n={4}
            title="บอกว่าเปลี่ยนแผนเพราะอะไร"
            demoLabel="ตัวอย่าง"
            demo={<Path steps={[<BoardChip key="from">🎤 คนแก่ถามซ้ำ</BoardChip>, <BoardChip key="to">🔀 ทำแจ้งเตือนมื้อเย็นแทน</BoardChip>]} />}
          >
            <p>
              ลากลูกศรจากโน้ต <B>สัมภาษณ์</B> หรือ <B>ทดสอบ</B> ไปที่โน้ต <B>เปลี่ยนแผน</B> ลูกศรนี้คือเหตุผลของการเปลี่ยนแผน
              เมนเทอร์และ Claude อ่านมันได้
            </p>
          </Step>
          <Step
            n={5}
            title="ชวนเพื่อนเข้าทีม"
            demoLabel="ป้ายเหนือแคนวาส"
            demo={
              <>
                <BoardChip>👥 ทีม · 2 คน</BoardChip>
                <BoardChip>🔒 ดูอย่างเดียว · ของ มิ้นท์</BoardChip>
                <p className="text-[13px] text-slate-400">ป้ายที่สองคือสิ่งที่คนนอกทีมเห็น</p>
              </>
            }
          >
            <p>
              กดป้าย <B>ทีม</B> เหนือมุมขวาของแคนวาส แล้วติ๊กชื่อเพื่อน เพื่อนในทีมแก้แคนวาสได้เหมือนคุณ
            </p>
            <ul className="grid list-disc gap-1 pl-5">
              <li>
                เพื่อนต้องอยู่ในบอร์ด และแก้บอร์ดได้ก่อน ถ้ายังไม่เห็นชื่อ ขอให้เจ้าของบอร์ดกด <B>ชวนเพื่อนเข้าบอร์ด</B>
              </li>
              <li>
                อยากยกแคนวาสให้เพื่อน กด <B>ให้เป็นเจ้าของ</B> แล้วกดอีกครั้งเพื่อยืนยัน คุณยังอยู่ในทีม
              </li>
            </ul>
          </Step>
        </ol>
        <Tips
          title="เคล็ดลับ"
          items={[
            "ซูมเข้าออกได้ทุกที่บนบอร์ด รวมถึงบนป้ายและชื่อแคนวาส",
            "สติกเกอร์ธรรมดาที่ลากเข้าไปในช่อง ก็นับเป็นโน้ตของช่องนั้น",
            <>
              การ์ดห้องและไลบรารีอยู่ในแท็บ <B>สร้าง</B> ของ Board kit
            </>,
          ]}
        />
      </Section>

      <Section
        id="mentors"
        eyebrow="สำหรับเมนเทอร์และทีม SHIFT"
        title="ดูทุกแคนวาสในหน้าเดียว"
        intro={
          <>
            ใช้ได้ถ้าแอดมินเพิ่มคุณเป็น <B>Mentor</B> หรือ <B>staff</B> ของ SHIFT แล้ว ถ้าเปิดแล้วเห็น &quot;Staff access required&quot; ให้ขอแอดมินเพิ่มสิทธิ์
          </>
        }
      >
        <ol className="grid gap-3.5">
          <Step n={1} title="เปิดหน้าแคนวาส" demoLabel="ลิงก์" demo={<Btn mono>passionseed.org/shift/canvases</Btn>}>
            <p>
              ไปที่{" "}
              <Link href="/shift/canvases" className="font-space-mono text-sm text-orange-300 underline underline-offset-4">
                /shift/canvases
              </Link>{" "}
              แล้วล็อกอินด้วยบัญชี PassionSeed ของคุณ
            </p>
            <p>แต่ละแถวคือหนึ่งแคนวาส เรียงจากที่มีคนแก้ล่าสุด</p>
          </Step>
          <Step
            n={2}
            title="อ่านแต่ละแถว"
            demoLabel="หนึ่งแถว"
            demo={
              <>
                <ExampleTag />
                <RowSketch />
              </>
            }
          >
            <ul className="grid list-disc gap-1 pl-5">
              <li>
                <B>นักเรียนและทีม</B>: ชื่อ ชื่อเล่น และ Discord กด <span className="font-space-mono text-sm">@ชื่อ</span> เพื่อเปิดโปรไฟล์ Discord
              </li>
              <li>
                <B>Beliefs</B>: 🎯 👥 💡 🚀 สว่างเมื่อเขียนแล้ว จางเมื่อยังว่าง
              </li>
              <li>
                <B>Evidence</B>: จำนวนสัมภาษณ์ ตัวอย่าง ทดสอบ และการเปลี่ยนแผน
              </li>
              <li>
                <B>Days</B> วันที่เขียนบันทึก, <B>Versions</B> เวอร์ชันที่เก็บ, <B>Last edit</B> แก้ล่าสุด
              </li>
              <li>ใต้ชื่อแคนวาส คือสิ่งที่เปลี่ยนล่าสุด เขียนโดย Claude Haiku ทุกคืน</li>
            </ul>
          </Step>
          <Step
            n={3}
            title="เปิดแคนวาสหนึ่งอัน"
            demoLabel="ปุ่มบนหน้าแคนวาส"
            demo={<Path steps={[<Btn key="back">← All canvases</Btn>, <Btn key="open">Open board ↗</Btn>]} />}
          >
            <p>กดชื่อแคนวาส จะเห็น</p>
            <ul className="grid list-disc gap-1 pl-5">
              <li>
                <B>Progress by day</B>: ตัวเลขทุกวัน สิ่งที่เพิ่มขึ้น (เช่น <span className="font-space-mono text-sm">+2</span>) และบันทึกว่าเปลี่ยนอะไร
              </li>
              <li>ทุกโน้ตบนแคนวาส พร้อมชื่อคนเขียน ประวัติเวอร์ชัน ลูกศร และคอมเมนต์</li>
              <li>
                <B>Open board</B> เพื่อไปดูบนไวท์บอร์ดจริง
              </li>
            </ul>
          </Step>
          <Step
            n={4}
            title="ให้ Claude ช่วยสรุป"
            demoLabel="กล่อง Ask Claude"
            demo={
              <Panel>
                <span>
                  <Btn primary>✦ Summarize this canvas</Btn>
                </span>
                <p className="border-l-2 border-orange-300/40 pl-2.5 text-[13px] text-slate-300">
                  น้องมิ้นท์ทำปัญหาให้ชัดขึ้นจาก v1 เป็น v2 หลังสัมภาษณ์พี่เภสัช แต่ยังไม่มีการทดสอบ ลองชวนน้องทดสอบกับคนจริงสักคน
                </p>
              </Panel>
            }
          >
            <p>
              กด <B>Summarize this canvas</B> หรือพิมพ์คำถามเอง เป็นภาษาไทยหรืออังกฤษก็ได้ กด <Kbd>Enter</Kbd> เพื่อส่ง <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd>{" "}
              เพื่อขึ้นบรรทัดใหม่
            </p>
            <p>ตัวอย่างคำถาม: &quot;หลักฐานอะไรรองรับปัญหาของน้อง&quot; &quot;น้องเปลี่ยนไอเดียเพราะอะไร&quot; &quot;ควรถามน้องอะไรต่อ&quot;</p>
            <p>
              กด ■ เพื่อหยุด กด <B>Clear</B> เพื่อเริ่มใหม่
            </p>
          </Step>
          <Step
            n={5}
            title="บันทึกลง Tracker"
            demoLabel="ใต้คำตอบ"
            demo={
              <>
                <Btn>✎ Save to Tracker</Btn>
                <p className="text-xs text-emerald-400">✓ Saved to the Tracker for มิ้นท์ ศรีสุข</p>
              </>
            }
          >
            <p>
              ใต้คำตอบเกี่ยวกับแคนวาสหนึ่งอัน กด <B>Save to Tracker</B> ระบบจะบันทึกคำตอบนั้นเป็นโน้ตของสัปดาห์นี้
              ให้นักเรียนทุกคนบนแคนวาสที่อยู่ใน SHIFT Tracker
            </p>
            <p>ถ้าไม่มีใครบนแคนวาสอยู่ใน Tracker ระบบจะบอก</p>
          </Step>
          <Step n={6} title="ถามเรื่องทุกแคนวาสพร้อมกัน" demoLabel="ท้ายหน้ารายการ" demo={<Btn primary>✦ Overview of every canvas</Btn>}>
            <p>
              ที่หน้ารายการ เลื่อนลงไปที่กล่อง Ask Claude แล้วกด <B>Overview of every canvas</B> เหมาะกับคำถามแบบ
              &quot;ใครยังไม่ได้สัมภาษณ์ใครเลย&quot; หรือ &quot;ควรไปช่วยใครก่อน&quot;
            </p>
          </Step>
        </ol>
        <Tips
          title="ใช้ให้ดี"
          items={[
            "Claude อาจผิดได้ ก่อนเอาไปคุยกับน้อง ตรวจกับแคนวาสก่อนเสมอ",
            "คุยกับน้องจากสิ่งที่อยู่บนแคนวาส ชมงาน ไม่ตัดสินตัวคน",
            "แคนวาสคืองานของน้องที่ยังเป็นเด็ก อย่าคัดลอกไปไว้ในที่สาธารณะ",
          ]}
        />
      </Section>

      <Section id="admins" eyebrow="สำหรับแอดมิน" title="ให้สิทธิ์ และดูแลระบบ" intro="แอดมินทำได้ทุกอย่างที่เมนเทอร์ทำ และมีหน้าเดียวกันใน Admin console">
        <ol className="grid gap-3.5">
          <Step
            n={1}
            title="เพิ่มเมนเทอร์"
            demoLabel="ฟอร์มใน Settings"
            demo={
              <Panel>
                <span className="text-[13px] text-slate-400">Email</span>
                <span>
                  <Btn mono>mentor@example.com</Btn>
                </span>
                <Path steps={[<Btn key="role">Role: Mentor ▾</Btn>, <Btn key="grant" primary>＋ Grant</Btn>]} />
              </Panel>
            }
          >
            <p>
              ไปที่ <B>Admin → SHIFT → Rounds</B> เลือกรอบ แล้วเปิด <B>Settings</B> ใส่อีเมลของเมนเทอร์ เลือก <B>Mentor</B> หรือ <B>Round staff</B>{" "}
              แล้วกด <B>Grant</B>
            </p>
            <p>
              คนนั้นเปิด <span className="font-space-mono text-sm">/shift/canvases</span> ได้ทันที เอาสิทธิ์ออกด้วย <B>Remove role</B> ที่เดียวกัน
            </p>
          </Step>
          <Step
            n={2}
            title="หน้า Canvases ในแอดมิน"
            demoLabel="แท็บ SHIFT"
            demo={<Path steps={[<Btn key="t">Tracker</Btn>, <Btn key="c" primary>Canvases</Btn>, <Btn key="v">Voice</Btn>]} />}
          >
            <p>
              อยู่ที่แท็บ <B>Admin → SHIFT → Canvases</B> เหมือนหน้าเมนเทอร์ทุกอย่าง และมีปุ่ม <B>Snapshot now</B>
            </p>
          </Step>
          <Step n={3} title="Snapshot now" demoLabel="มุมขวาบนของหน้า" demo={<Btn>◉ Snapshot now</Btn>}>
            <p>
              ระบบเก็บความคืบหน้าของทุกแคนวาสเองทุกคืน ก่อนเที่ยงคืนเวลาไทย ถ้าอยากเริ่มเก็บทันที เช่นวันแรกของรอบ กด <B>Snapshot now</B>{" "}
              ถ้ากดซ้ำในวันเดียวกัน ระบบจะแทนที่ข้อมูลของวันนั้น
            </p>
          </Step>
          <Step
            n={4}
            title="อ่านโน้ตที่เมนเทอร์บันทึก"
            demoLabel="ใน Tracker"
            demo={
              <p className="border-l-2 border-orange-300/40 pl-2.5 text-[13px] text-slate-300">
                Claude summary of the SHIFT canvas &quot;โปรเจกต์ · มิ้นท์&quot;, saved from the canvases page…
              </p>
            }
          >
            <p>
              โน้ตจาก <B>Save to Tracker</B> อยู่ใน <B>Admin → SHIFT → Tracker</B> ขึ้นต้นว่า &quot;Claude summary of the SHIFT canvas&quot;
              และบอกว่าใครบันทึก เมนเทอร์บันทึกได้ แต่เปิด Tracker ไม่ได้
            </p>
          </Step>
          <Step n={5} title="ดูแลบอร์ด" demoLabel="ในป้ายทีม" demo={<Btn>👤＋ ชวนเพื่อนเข้าบอร์ด</Btn>}>
            <p>เจ้าของบอร์ด และแอดมินที่อยู่ในบอร์ด แก้ได้ทุกแคนวาสบนบอร์ดนั้น และยกแคนวาสให้คนอื่นได้</p>
            <p>
              คนที่ชวนคนเข้าบอร์ดได้มีแค่เจ้าของบอร์ด ผ่านปุ่ม <B>Share</B> หรือ <B>ชวนเพื่อนเข้าบอร์ด</B> ในป้ายทีม
            </p>
          </Step>
        </ol>
      </Section>

      <Section id="privacy" eyebrow="ข้อมูลและความเป็นส่วนตัว" title="อะไรถูกเก็บ และใครเห็นอะไร">
        <div className="grid gap-3.5 md:grid-cols-2">
          <Tips
            title="Claude ตัวไหนทำอะไร"
            items={[
              <>
                <B>Claude Opus 5.5</B> ตอบคำถามในกล่อง Ask Claude
              </>,
              <>
                <B>Claude Haiku 5.5</B> เขียนบันทึกสั้นๆ ทุกคืน ว่าแต่ละแคนวาสเปลี่ยนอะไร ถ้าไม่มีอะไรเปลี่ยน จะไม่เรียก Claude เลย
              </>,
            ]}
          />
          <Tips
            title="อะไรถูกเก็บ"
            items={[
              <>
                แชตกับ Claude ไม่ถูกเก็บ หายเมื่อรีเฟรชหน้า เว้นแต่กด <B>Save to Tracker</B>
              </>,
              "ทุกคืนระบบเก็บตัวเลข เนื้อหาแคนวาส และบันทึกการเปลี่ยนแปลง ไว้ในฐานข้อมูลของ PassionSeed",
              "Anthropic ไม่นำข้อมูลไปเทรนโมเดล และลบภายใน 30 วัน ยกเว้นข้อความที่ระบบความปลอดภัยของ Anthropic ตั้งค่าสถานะว่าผิดนโยบาย",
            ]}
          />
        </div>
        <div className="overflow-x-auto rounded-2xl border border-orange-300/20">
          <table className="w-full min-w-[560px] border-collapse text-left text-[15px]">
            <thead>
              <tr className="border-b border-orange-300/20 font-space-mono text-xs uppercase tracking-wider text-orange-300">
                <th scope="col" className="p-3.5 font-normal">ทำอะไรได้</th>
                <th scope="col" className="p-3.5 font-normal">นักเรียน</th>
                <th scope="col" className="p-3.5 font-normal">เมนเทอร์และทีม SHIFT</th>
                <th scope="col" className="p-3.5 font-normal">แอดมิน</th>
              </tr>
            </thead>
            <tbody className="[&_td]:p-3.5 [&_td]:align-top [&_tr]:border-b [&_tr]:border-orange-300/20 [&_tr:last-child]:border-0">
              {PERMISSIONS.map(([what, ...who]) => (
                <tr key={what}>
                  <td className="text-white">{what}</td>
                  {who.map((cell, i) => (
                    <td key={i} className={cell === "ไม่ได้" ? "text-slate-400" : "text-emerald-400"}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <footer className="mt-12 text-sm text-slate-400">มีคำถามหรือเจอปัญหา บอกทีม PassionSeed ในห้อง Discord ของ SHIFT</footer>
    </div>
  );
}

/** Who can do what: action, then student, mentor and staff, admin. */
const PERMISSIONS: [string, string, string, string][] = [
  ["แก้แคนวาส", "ของตัวเอง และที่อยู่ในทีม", "ที่อยู่ในทีม หรือทุกแคนวาสบนบอร์ดที่ตัวเองเป็นเจ้าของ", "ทุกแคนวาสบนบอร์ดที่อยู่"],
  ["หน้า /shift/canvases", "ไม่ได้", "ได้", "ได้"],
  ["ถาม Claude", "ไม่ได้", "ได้", "ได้"],
  ["Save to Tracker", "ไม่ได้", "ได้", "ได้"],
  ["เปิด SHIFT Tracker", "ไม่ได้", "ไม่ได้", "ได้"],
  ["Snapshot now", "ไม่ได้", "ไม่ได้", "ได้"],
];
