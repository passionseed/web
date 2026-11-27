import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EL_FIRE, EL_GROUND, EL_PAPER } from "@/components/hackathon/poster/elemental/brand";
import { ICON, UI_ICON, type PixelIconName } from "@/components/hackathon/poster/elemental/pixel-art";
import {
  Body,
  BigCount,
  DarkSlab,
  EditorialLink,
  FactStrip,
  Fine,
  H1,
  H2,
  ItemTitle,
  MeterTitle,
  Page,
  PixelIcon,
  PrimaryButton,
  SecondaryButton,
  SkyBand,
  StickyBar,
  Tag,
  TextInput,
  v,
  type Surface,
} from "@/components/hackathon/elemental/share/ui";
import { demoPagesOn } from "@/lib/hackathon/elemental/share";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Elemental design system", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Development and PR previews only: every primitive of the Elemental share
 * pages' design system (components/hackathon/elemental/share/ui.tsx).
 * /hackathon/join/demo/design (the dark ground) · ?s=paper (the cream pay page, with a DarkSlab).
 * Nothing here is saved or sent.
 */

// copy: placeholder — the words are borrowed from the current screens; Angpao rewrites.
const ICON_NAMES = [...Object.keys(UI_ICON), ...Object.keys(ICON)] as PixelIconName[];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t pt-6" style={{ borderColor: v.rule }}>
      <H2>{title}</H2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Swatch({ color, name }: { color: string; name: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-8 w-8 shrink-0" style={{ backgroundColor: color, boxShadow: `inset 0 0 0 1px ${v.ruleSoft}` }} />
      <span className="min-w-0">
        <Body secondary as="span">
          {name}
        </Body>{" "}
        <Tag bracket={false}>{color}</Tag>
      </span>
    </div>
  );
}

function Primitives({ surface }: { surface: Surface }) {
  const t = surface === "ground" ? EL_GROUND : EL_PAPER;
  return (
    <div className="space-y-10">
      <Section title="ตัวอักษร">
        <H1>แชร์ต่อเลย</H1>
        <H1 board>กระดานทีม</H1>
        <H2>โปสเตอร์ของคุณ</H2>
        <MeterTitle>รวม 12 เครื่อง</MeterTitle>
        <ItemTitle>ทีม ไฟป่า</ItemTitle>
        <Body>QR บนโปสเตอร์คือลิงก์ของคุณ ใครสแกนหรือกดลิงก์ ตัวเลขด้านบนจะขึ้น</Body>
        <Body secondary>นับเป็นเครื่อง เปิดซ้ำจากเครื่องเดิมนับครั้งเดียว</Body>
        <Fine>wifi เดียวกันนับได้ไม่เกิน 5 เครื่อง</Fine>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Tag>เครื่อง</Tag>
          <Tag tone="action">รวม</Tag>
          <Tag tone="text">ปิดนับ 4 ธ.ค.</Tag>
          <Tag bracket={false}>No. 1A2B 3C4D</Tag>
          <Tag bracket={false}>09:39</Tag>
        </div>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <BigCount value={12} goal={50} unit="เครื่อง" />
          <BigCount value={64} unit="เครื่อง" />
        </div>
      </Section>

      <Section title="ปุ่ม">
        <PrimaryButton icon="chat" full arrow>
          ส่งใน LINE
        </PrimaryButton>
        <div className="grid grid-cols-2 gap-2">
          <SecondaryButton icon="copy">คัดลอกลิงก์</SecondaryButton>
          <SecondaryButton icon="download">บันทึกรูป</SecondaryButton>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PrimaryButton disabled>กำลังบันทึก…</PrimaryButton>
          <SecondaryButton disabled>ยกเลิก</SecondaryButton>
        </div>
        <div className="flex flex-wrap items-center gap-x-6">
          <EditorialLink href="/hackathon/elemental/leaderboard/demo">ดูกระดาน</EditorialLink>
          <EditorialLink href="/hackathon/elemental" tone="action">
            สมัคร
          </EditorialLink>
          <EditorialLink href="/hackathon/join/demo" size="sm" arrow={false}>
            ข้าม
          </EditorialLink>
        </div>
      </Section>

      <Section title="ช่องกรอก">
        <TextInput id={`${surface}-name`} label="ชื่อ-นามสกุล" autoComplete="off" />
        <TextInput id={`${surface}-school`} label="โรงเรียน" placeholder="พิมพ์ชื่อโรงเรียน" leading={<PixelIcon name="search" />} autoComplete="off" />
        <TextInput id={`${surface}-contact`} label="อีเมล หรือ LINE ID" hint="ทีมงานใช้ติดต่อ" autoComplete="off" />
        <TextInput id={`${surface}-code`} label="รหัสของเพื่อน" defaultValue="1A2B" error="รหัสนี้ไม่ถูก ลองพิมพ์ใหม่" autoComplete="off" />
      </Section>

      <Section title="แถบข้อมูล">
        <FactStrip
          facts={[
            { icon: "school", tag: "เครื่อง", value: "12" },
            { icon: "ticket", tag: "จ่ายแล้ว", value: "1" },
          ]}
        />
      </Section>

      <Section title="ไอคอน">
        <div className="grid grid-cols-4 gap-x-3 gap-y-5">
          {ICON_NAMES.map((name) => (
            <div key={name} className="flex flex-col items-start gap-2">
              <PixelIcon name={name} size={27} />
              <Fine as="span">{name}</Fine>
            </div>
          ))}
        </div>
      </Section>

      <Section title="สี">
        <div className="grid gap-3">
          <Swatch color={t.bg} name="พื้น" />
          <Swatch color={t.text} name="ตัวอักษร" />
          <Swatch color={t.secondary} name="รอง" />
          <Swatch color={t.action} name="ปุ่มหลัก" />
          <Swatch color={t.error} name="ผิดพลาด" />
        </div>
        <div>
          <Fine>pixel ไฟ ใหม่ถึงเก่า</Fine>
          <div className="mt-2 flex gap-[3px]">
            {EL_FIRE.map((c) => (
              <span key={c} className="h-8 w-8" style={{ backgroundColor: c }} />
            ))}
            <span className="h-8 w-8" style={{ backgroundColor: v.cell }} />
          </div>
        </div>
      </Section>
    </div>
  );
}

export default async function DesignDemoPage({ searchParams }: { searchParams: SearchParams }) {
  if (!demoPagesOn()) notFound();
  const p = await searchParams;
  const surface: Surface = p.s === "paper" ? "paper" : "ground";

  const bar = (
    <StickyBar>
      <PrimaryButton icon="chat" full arrow className="flex-1">
        ส่งใน LINE
      </PrimaryButton>
      <SecondaryButton icon="copy" className="w-[52px] shrink-0 px-0" aria-label="คัดลอกลิงก์">
        <span className="sr-only">คัดลอกลิงก์</span>
      </SecondaryButton>
    </StickyBar>
  );

  if (surface === "paper") {
    return (
      <Page surface="paper" back={{ href: "/hackathon/join/demo" }} bar={bar}>
        <H1>อีกขั้นเดียว</H1>
        <Body secondary className="mt-2">
          หน้าจ่ายเงินอยู่บนกระดาษครีม ชิ้นของงาน (ตั๋ว ลิงก์ของฉัน) เป็นแผ่นสีดำบนกระดาษ
        </Body>
        <DarkSlab className="mt-8">
          <MeterTitle as="h2">รวม 12 เครื่อง</MeterTitle>
          <div className="mt-4 flex items-end justify-between gap-3">
            <Tag>เครื่องที่เปิดลิงก์</Tag>
            <BigCount value={12} goal={50} unit="เครื่อง" />
          </div>
          <Fine className="mt-3">+ จ่ายผ่านลิงก์ 1/3</Fine>
          <div className="mt-5 space-y-3">
            <PrimaryButton icon="chat" full arrow>
              ส่งโปสเตอร์
            </PrimaryButton>
            <EditorialLink href="/hackathon/join/demo/share?s=early" size="sm">
              ดูหน้าแชร์
            </EditorialLink>
          </div>
        </DarkSlab>
        <div className="mt-10">
          <Primitives surface="paper" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      surface="ground"
      back={{ href: "/hackathon/join/demo" }}
      sky={
        <SkyBand
          title={<H1>ส่งโปสเตอร์เข้ากลุ่ม LINE</H1>}
          lead="โรงเรียนเตรียมอุดมศึกษา · กรุงเทพมหานคร"
          facts={[
            { tag: "เครื่อง", value: "12/50" },
            { tag: "จ่ายแล้ว", value: "1/3" },
          ]}
        />
      }
      bar={bar}
    >
      <Primitives surface="ground" />
    </Page>
  );
}
