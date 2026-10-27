import { ChevronDown, ChevronRight } from "lucide-react";

interface SetupGuideProps {
  /** API base URL the extension talks to. Used verbatim in the copy step. */
  apiBase: string;
}

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

function Step({ number, title, children }: StepProps) {
  return (
    <details className="group rounded-lg border bg-card text-card-foreground open:bg-muted/30" open>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/40 active:bg-muted/40 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
          {number}
        </span>
        <span className="flex-1">{title}</span>
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="space-y-3 px-4 pb-4 pl-[3.25rem] text-sm text-foreground/90">{children}</div>
    </details>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="block break-all rounded border bg-background px-3 py-2 font-mono text-xs leading-relaxed">
      {children}
    </code>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
      {children}
    </ul>
  );
}

/**
 * Operator-facing setup guide rendered on /admin/dm-leads/copilot.
 *
 * Lives next to the token list so the operator can mint, paste, install, and
 * verify in the same screen. Each step is a <details> so the page stays
 * skimmable but the full procedure is one click away.
 */
export function CopilotSetupGuide({ apiBase }: SetupGuideProps) {
  return (
    <section className="space-y-3 rounded-lg border bg-muted/10 p-4">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-base font-semibold">Setup guide · ใช้เวลาประมาณ 5 นาที</h2>
        </div>
        <P>
          DM Copilot เป็น Chrome extension ที่อ่าน DM ที่เปิดอยู่บน IG แล้วแสดง draft + ราคาให้กดวางในช่องแชท ไม่มีการกดส่งแทน
          และไม่ใช้ session cookie ของ admin แต่ใช้ bearer token ที่ mint จากหน้านี้
        </P>
      </header>

      <div className="space-y-2">
        <Step number={1} title="Bundle the extension TypeScript (ทำครั้งเดียวต่อ checkout)">
          <P>
            Chrome โหลดเฉพาะ <code>.js</code> ไม่รู้จัก <code>.ts</code> โดยตรง ใช้ esbuild ที่มีอยู่แล้วในโปรเจกต์:
          </P>
          <Code>{`npx esbuild \\
  extension/background/service-worker.ts \\
  extension/content/instagram.ts \\
  extension/content/copilot.ts \\
  extension/popup/settings.ts \\
  --outdir=extension/dist --bundle --format=esm --target=chrome120`}</Code>
          <P>
            หลัง bundle แล้ว <code>manifest.json</code> ต้องชี้ไปที่ <code>extension/dist/*.js</code> แทนไฟล์ <code>.ts</code>{" "}
            ถ้ายังไม่ได้แก้ ให้เปลี่ยน path ใน <code>background.service_worker</code>, <code>content_scripts[*].js</code>,{" "}
            และ <code>web_accessible_resources</code> ให้ลงท้ายด้วย <code>.js</code>
          </P>
        </Step>

        <Step number={2} title="Load the extension in Chrome">
          <Ul>
            <li>
              เปิด <code>chrome://extensions</code>
            </li>
            <li>
              สลับ <strong>Developer mode</strong> ที่มุมขวาบน
            </li>
            <li>
              คลิก <strong>Load unpacked</strong> แล้วเลือกโฟลเดอร์ <code>extension/</code> ของ repo นี้
            </li>
            <li>
              ถ้ายังไม่มีไอคอน ให้ใช้ favicon เดิมของโปรเจกต์ชั่วคราว:
              <Code>{`cp public/favicon-32x32.webp extension/icons/16.png
cp public/favicon-32x32.webp extension/icons/48.png
cp public/android-chrome-192x192.webp extension/icons/128.png`}</Code>
            </li>
            <li>
              กด <strong>Pin</strong> ที่ไอคอน extension เพื่อให้ popup เข้าถึงง่าย
            </li>
          </Ul>
        </Step>

        <Step number={3} title="Mint a token (ทำใหม่ต่อเครื่อง)">
          <P>
            เลื่อนลงไปที่ <strong>สร้าง token ใหม่</strong> ใส่ชื่อ เช่น <code>boon macbook</code> แล้วกดปุ่ม
            token ที่ได้จะขึ้นต้นด้วย <code>psdmlp_</code> และแสดงครั้งเดียว copy เก็บไว้ใน password manager
            หรือจะ paste ต่อเลยในขั้นถัดไปก็ได้
          </P>
          <P>
            <strong>Default TTL คือ 90 วัน</strong> เมื่อใกล้หมดอายุหรือต้องการเปลี่ยนเครื่อง กด{" "}
            <strong>revoke</strong> ในรายการด้านล่าง token จะใช้ไม่ได้ทันที
          </P>
        </Step>

        <Step number={4} title="Paste the token into the extension">
          <Ul>
            <li>
              คลิกไอคอน <strong>DM Copilot</strong> ที่ toolbar ของ Chrome
            </li>
            <li>
              วาง token ลงในช่อง <strong>Bearer token</strong> (ขึ้นต้นด้วย <code>psdmlp_</code>)
            </li>
            <li>
              API base ปล่อยเป็น <Code>{apiBase}</Code> ได้เลย ถ้าทดสอบกับ staging ให้ใส่ URL อื่น
            </li>
            <li>
              กด <strong>Save</strong> ขึ้น <code>saved</code> สีเขียว = พร้อมใช้
            </li>
          </Ul>
        </Step>

        <Step number={5} title="Open a DM and use it">
          <Ul>
            <li>
              เปิดแชทใน IG (<code>instagram.com/direct/t/&lt;id&gt;</code>) แผ่น tray จะโผล่ที่มุมล่างขวา
            </li>
            <li>
              chip ที่ขึ้นคือ quick-reply จาก <code>lib/dm-leads/quick-replies.ts</code> เดียวกับที่ admin inbox ใช้
              กด chip → body ถูก paste ลงช่อง compose ของ IG
            </li>
            <li>
              แก้ข้อความตามต้องการ แล้วกดส่งใน IG ปกติ ไม่มีข้อความไหนถูกส่งอัตโนมัติ
            </li>
            <li>
              หลังส่ง <code>/api/copilot/log</code> จะเขียน row ใน <code>dm_messages</code> ให้อัตโนมัติ ทำให้ bucket,
              score, และ log ใน <code>/admin/dm-leads</code> ตรงกับสิ่งที่ส่งจริง
            </li>
          </Ul>
          <P>
            <strong>สัญญาณ window</strong>: 🟢 = &lt;24h, ส่งได้ทั้ง API และ IG · 🟡 = 24h-7d, IG block API แต่ tray ยังใช้ได้ ·
            🔴 = เกิน 7 วัน, IG เองก็ตอบไม่ได้จนกว่าน้องจะทักมาใหม่ chip จะถูก disable
          </P>
        </Step>

        <Step number={6} title="ถ้ามีปัญหา">
          <Ul>
            <li>
              <strong>tray ขึ้น "token หายหรือหมดอายุ"</strong>: token ถูก revoke แล้ว หรือ popup ลบ token ออก
              กลับไปขั้น 3-4 แล้ว mint ใหม่
            </li>
            <li>
              <strong>tray ขึ้น "Compose box ไม่พร้อม"</strong>: IG ยังโหลด thread ไม่เสร็จ รอให้แชทขึ้นครบก่อนแล้วลองอีกครั้ง
            </li>
            <li>
              <strong>API คืน 401</strong>: token ถูก revoke หรือหมดอายุ ดู audit log ใน{" "}
              <code>dm_copilot_audit_log</code> จะบอกว่า bearer ไหนถูก reject เมื่อไหร่
            </li>
            <li>
              <strong>API คืน 400 invalid_conversation_id</strong>: lead ที่เปิดอยู่ไม่มีใน <code>dm_conversations</code>{" "}
              (cold thread ที่ยังไม่เคยตอบ) tray ยังโชว์ chip อยู่ แต่ log call จะ skip อัตโนมัติ
            </li>
            <li>
              <strong>leak</strong>: เปิดหน้านี้แล้วกด <strong>revoke</strong> token ทันที bearer เก่าใช้ไม่ได้ใน request ถัดไป
            </li>
          </Ul>
        </Step>
      </div>
    </section>
  );
}
