"use client";

import { useId, useState } from "react";
import type { AdminIslandOverview, AdminIslandProject } from "@/lib/supabase/shift-quests/adminTypes";
import { IslandSheet } from "./IslandSheet";
import styles from "./island.module.css";
import world from "./world.module.css";
import admin from "./admin.module.css";

export function AdminProjectDetails({ project }: { project: AdminIslandProject }) {
  return (
    <div className={admin.details}>
      <p><strong>สมาชิก:</strong> {project.members.join(", ") || "ยังไม่มีสมาชิก"}</p>
      {project.ambition ? <p>{project.ambition}</p> : null}
      <dl className={admin.metrics}>
        <div><dt>ผ่านหมุดหมาย</dt><dd>{project.milestones.length}/7</dd></div>
        <div><dt>รอตรวจงาน</dt><dd>{project.waitingReview}</dd></div>
        <div><dt>รอความช่วยเหลือ</dt><dd>{project.openHelp}</dd></div>
        <div><dt>เช็กอิน 7 วัน</dt><dd>{project.checkinsWeek}</dd></div>
      </dl>
      <p className={styles.hint}>อัปเดตล่าสุด: <time dateTime={project.lastActivity}>{new Date(project.lastActivity).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}</time></p>
    </div>
  );
}

export function AdminOverview({ open, onClose, data }: { open: boolean; onClose: () => void; data: AdminIslandOverview | null }) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const needle = query.trim().toLocaleLowerCase();
  const projects = data?.projects.filter((p) => [p.name, String(p.slot), ...p.members].some((s) => s.toLocaleLowerCase().includes(needle))) ?? [];
  return (
    <IslandSheet open={open} onOpenChange={(value) => { if (!value) onClose(); }} title="ภาพรวมเกาะ · Admin">
      <div className={world.sheetStack}>
        <p className={styles.hint}>ข้อมูลสำหรับแอดมิน: ชื่อทีม สมาชิก และความคืบหน้าของทุกแปลง</p>
        {data ? <>
          <p>{data.projects.length} ทีม · {data.projects.reduce((n, p) => n + p.waitingReview, 0)} งานรอตรวจ · {data.projects.reduce((n, p) => n + p.openHelp, 0)} คำขอความช่วยเหลือ</p>
          <label htmlFor={inputId}>ค้นหาทีม สมาชิก หรือเลขแปลง</label>
          <input id={inputId} className={styles.input} type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className={admin.projects}>
            {projects.map((p) => <section className={admin.project} key={p.slot}>
              <h3 className={styles.detailHeading}>แปลง {p.slot} · {p.name}</h3>
              <p className={styles.hint}>{p.route}</p>
              <AdminProjectDetails project={p} />
            </section>)}
          </div>
          {projects.length === 0 ? <p className={styles.quiet}>{needle ? "ไม่พบทีมที่ค้นหา" : "ยังไม่มีทีมบนเกาะ"}</p> : null}
        </> : <p role="status">ยังโหลดข้อมูลแอดมินไม่ได้ ลองรีเฟรชหน้าอีกครั้ง</p>}
      </div>
    </IslandSheet>
  );
}
