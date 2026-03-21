"use client";

import { useEffect, useMemo, useState } from "react";

import type { CollectedData } from "@/types/onboarding";

interface Props {
  data: CollectedData;
  language: "en" | "th";
  onChange: (updates: Partial<CollectedData>) => void;
  onContinue: () => void;
  onSkip: () => void;
}

interface UniversityResult {
  universityId: string;
  universityName: string;
  universityNameEn: string | null;
}

interface ProgramResult {
  programId: string;
  programName: string;
  programNameEn: string | null;
  facultyName: string | null;
  universityId: string;
}

const COPY = {
  en: {
    eyebrow: "TCAS target",
    title: "If you already know the school or program, add it here",
    body: "This helps us tailor the next steps around a real target. You can still continue without locking it in now.",
    universityLabel: "University",
    universityPlaceholder: "Search universities",
    universityEmpty: "No universities found yet.",
    programLabel: "Program (optional)",
    programPlaceholder: "Search programs in this university",
    programEmpty: "No matching programs found for this university yet.",
    picked: "Current target",
    skip: "Skip for now",
    continue: "Continue",
    selectUniversityFirst: "Pick a university first to browse programs.",
  },
  th: {
    eyebrow: "เป้าหมาย TCAS",
    title: "ถ้าคุณพอรู้แล้วว่าอยากไปที่ไหน เลือกมหาวิทยาลัยหรือสาขาไว้ได้เลย",
    body: "เราจะใช้ข้อมูลนี้ช่วยจัดคำแนะนำให้ตรงกับเป้าหมายมากขึ้น แต่ถ้ายังไม่อยากฟันธงตอนนี้ก็ข้ามก่อนได้",
    universityLabel: "มหาวิทยาลัย",
    universityPlaceholder: "ค้นหามหาวิทยาลัย",
    universityEmpty: "ยังไม่พบมหาวิทยาลัยที่ตรงคำค้น",
    programLabel: "สาขา / โปรแกรม (ไม่บังคับ)",
    programPlaceholder: "ค้นหาสาขาในมหาวิทยาลัยนี้",
    programEmpty: "ยังไม่พบสาขาที่ตรงคำค้นในมหาวิทยาลัยนี้",
    picked: "เป้าหมายตอนนี้",
    skip: "ข้ามไปก่อน",
    continue: "ไปต่อ",
    selectUniversityFirst: "เลือกมหาวิทยาลัยก่อน แล้วค่อยดูสาขาที่เกี่ยวข้อง",
  },
} as const;

export function TcasTargetPicker({
  data,
  language,
  onChange,
  onContinue,
  onSkip,
}: Props) {
  const copy = COPY[language];
  const [universityQuery, setUniversityQuery] = useState(
    data.target_university_name ?? ""
  );
  const [programQuery, setProgramQuery] = useState(
    data.target_program_name ?? ""
  );
  const [universities, setUniversities] = useState<UniversityResult[]>([]);
  const [programs, setPrograms] = useState<ProgramResult[]>([]);
  const [isLoadingUniversities, setIsLoadingUniversities] = useState(false);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);

  useEffect(() => {
    setUniversityQuery(data.target_university_name ?? "");
  }, [data.target_university_name]);

  useEffect(() => {
    setProgramQuery(data.target_program_name ?? "");
  }, [data.target_program_name]);

  useEffect(() => {
    let isCancelled = false;
    const timer = window.setTimeout(async () => {
      setIsLoadingUniversities(true);
      try {
        const response = await fetch(
          `/api/onboarding/tcas?kind=universities&q=${encodeURIComponent(
            universityQuery
          )}`
        );
        if (!response.ok) {
          throw new Error("University search failed");
        }

        const json = (await response.json()) as { items?: UniversityResult[] };
        if (!isCancelled) {
          setUniversities(json.items ?? []);
        }
      } catch {
        if (!isCancelled) {
          setUniversities([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingUniversities(false);
        }
      }
    }, 200);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [universityQuery]);

  useEffect(() => {
    if (!data.target_university_id) {
      setPrograms([]);
      setIsLoadingPrograms(false);
      return;
    }

    let isCancelled = false;
    const timer = window.setTimeout(async () => {
      setIsLoadingPrograms(true);
      try {
        const response = await fetch(
          `/api/onboarding/tcas?kind=programs&universityId=${encodeURIComponent(
            data.target_university_id ?? ""
          )}&q=${encodeURIComponent(programQuery)}`
        );
        if (!response.ok) {
          throw new Error("Program search failed");
        }

        const json = (await response.json()) as { items?: ProgramResult[] };
        if (!isCancelled) {
          setPrograms(json.items ?? []);
        }
      } catch {
        if (!isCancelled) {
          setPrograms([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPrograms(false);
        }
      }
    }, 200);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [data.target_university_id, programQuery]);

  const selectedSummary = useMemo(() => {
    if (!data.target_university_name) {
      return null;
    }

    if (!data.target_program_name) {
      return data.target_university_name;
    }

    return `${data.target_university_name} • ${data.target_program_name}`;
  }, [data.target_program_name, data.target_university_name]);

  const handleUniversitySelect = (item: UniversityResult) => {
    onChange({
      target_university_id: item.universityId,
      target_university_name:
        language === "th"
          ? item.universityName
          : item.universityNameEn ?? item.universityName,
      target_program_id: undefined,
      target_program_name: undefined,
    });
    setUniversityQuery(
      language === "th"
        ? item.universityName
        : item.universityNameEn ?? item.universityName
    );
    setProgramQuery("");
  };

  const handleProgramSelect = (item: ProgramResult) => {
    const programName =
      language === "th"
        ? item.programName
        : item.programNameEn ?? item.programName;
    onChange({
      target_program_id: item.programId,
      target_program_name: item.facultyName
        ? `${programName} (${item.facultyName})`
        : programName,
    });
    setProgramQuery(programName);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-orange-200/55">
          {copy.eyebrow}
        </p>
        <h3 className="text-xl font-semibold leading-tight text-white">
          {copy.title}
        </h3>
        <p className="text-sm leading-6 text-white/68">{copy.body}</p>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/52">
            {copy.universityLabel}
          </span>
          <input
            type="text"
            value={universityQuery}
            onChange={(event) => setUniversityQuery(event.target.value)}
            placeholder={copy.universityPlaceholder}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300/40 focus:bg-white/[0.06]"
          />
        </label>

        <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
          {universities.map((item) => {
            const selected = data.target_university_id === item.universityId;
            return (
              <button
                key={item.universityId}
                type="button"
                onClick={() => handleUniversitySelect(item)}
                className={`ei-card rounded-2xl border px-4 py-3 text-left ${
                  selected
                    ? "border-orange-300/40 bg-orange-400/[0.08]"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <p className="text-sm font-medium text-white">
                  {language === "th"
                    ? item.universityName
                    : item.universityNameEn ?? item.universityName}
                </p>
                {language === "en" &&
                item.universityNameEn &&
                item.universityNameEn !== item.universityName ? (
                  <p className="mt-1 text-xs text-white/45">
                    {item.universityName}
                  </p>
                ) : null}
              </button>
            );
          })}

          {!isLoadingUniversities && universities.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-white/52">
              {copy.universityEmpty}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/52">
            {copy.programLabel}
          </span>
          <input
            type="text"
            value={programQuery}
            onChange={(event) => setProgramQuery(event.target.value)}
            placeholder={copy.programPlaceholder}
            disabled={!data.target_university_id}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300/40 focus:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>

        {!data.target_university_id ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-white/52">
            {copy.selectUniversityFirst}
          </p>
        ) : (
          <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
            {programs.map((item) => {
              const selected = data.target_program_id === item.programId;
              const programName =
                language === "th"
                  ? item.programName
                  : item.programNameEn ?? item.programName;

              return (
                <button
                  key={item.programId}
                  type="button"
                  onClick={() => handleProgramSelect(item)}
                  className={`ei-card rounded-2xl border px-4 py-3 text-left ${
                    selected
                      ? "border-orange-300/40 bg-orange-400/[0.08]"
                      : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <p className="text-sm font-medium text-white">
                    {programName}
                  </p>
                  {item.facultyName ? (
                    <p className="mt-1 text-xs text-white/45">
                      {item.facultyName}
                    </p>
                  ) : null}
                </button>
              );
            })}

            {!isLoadingPrograms && programs.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-white/52">
                {copy.programEmpty}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {selectedSummary ? (
        <div className="rounded-2xl border border-orange-300/20 bg-orange-400/[0.05] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-200/70">
            {copy.picked}
          </p>
          <p className="mt-2 text-sm text-white/90">{selectedSummary}</p>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/60"
        >
          {copy.skip}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="ei-button-dusk justify-center px-5 py-2.5 text-sm font-semibold"
        >
          {copy.continue}
        </button>
      </div>
    </div>
  );
}
