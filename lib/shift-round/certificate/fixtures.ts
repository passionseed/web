import type { CertificateSnapshotV1 } from "./types";

/**
 * Fixture snapshots (spec 2.7 v1). Used by cert-health (in-memory render) and
 * the golden-image tests. The long Thai strings stack tone marks on upper
 * vowels and tall consonants, the cases Satori got wrong in the spike.
 */
export const FIXTURE_PUBLIC_ID = "7K2M9QX4T8HBN3PD";

const base: CertificateSnapshotV1 = {
  v: 1,
  issuer: "Passion Seed",
  public_id: FIXTURE_PUBLIC_ID,
  round: {
    number: 4,
    title_th: "ปั้นไอเดียจากปัญหาที่เจอจริง",
    title_en: "Build from a problem you really saw",
    starts_on: "2026-11-10",
    closes_on: "2026-11-23",
  },
  track: "high_school",
  holder: { handle: "ต้น", legal_name: null, display: "handle" },
  missions: ["first_contact", "interviews_problem", "mvp", "testers", "change", "demo_post"],
  counts: { people_talked_to: 9, interviews: 4, testers: 3, changes: 2 },
  issued_at: "2026-11-26T00:05:00+07:00",
};

export const FIXTURE_SNAPSHOTS: Record<string, CertificateSnapshotV1> = {
  handle: base,
  long_thai: {
    ...base,
    round: {
      ...base.round,
      title_th:
        "ผู้ใหญ่ที่น่ารักกิ้งก่าน้ำตาลไหม้ ปั้นปี่ญี่ปุ่นฝั่งป่า กุ้งเกี๊ยวซ่อมกรุ๊ป อึ๋ยฟุ้งฟิ้วฝึ่งฝื้นปิ่นปั้นปี๊ปปุ๋ยปู่",
      title_en: "Long Thai title test",
    },
    holder: { handle: "น้ำผึ้งพี่ปุ๋ย", legal_name: null, display: "handle" },
  },
  english: {
    ...base,
    round: {
      ...base.round,
      number: 12,
      title_th: "Campus Food Waste Tracker",
      title_en: "Campus Food Waste Tracker for every canteen on a busy school day",
    },
    track: "university",
    holder: { handle: "Mint", legal_name: null, display: "handle" },
  },
  mixed: {
    ...base,
    round: {
      ...base.round,
      title_th: "แอป LINE OA ช่วยร้านข้าวมันไก่ลด waste 30%",
      title_en: "A LINE OA app that helps a chicken-rice shop cut waste by 30%",
    },
    holder: { handle: "Fah ฟ้า", legal_name: null, display: "handle" },
  },
  legal_name: {
    ...base,
    holder: { handle: "ต้น", legal_name: "ธนกฤต ศรีสุวรรณวงศ์ไพบูลย์", display: "legal" },
  },
};
