"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PreferenceCombobox } from "@/components/admin/team-matching/PreferenceCombobox";
import type { SimUser } from "@/components/admin/team-matching/types";

const MAX_PREFS = 5;
const DEBOUNCE_MS = 600;

type Participant = { id: string; name: string };

type Props = {
  participant: Participant;
  onBack: () => void;
};

type Status = "loading" | "not-opted-in" | "opted-in";

export default function TeamFinderView({ participant, onBack }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [others, setOthers] = useState<Participant[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [joining, setJoining] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/hackathon/team-finder/status");
    if (!res.ok) return;
    const data = await res.json();
    setOthers(data.participants);
    setPreferences(data.preferences);
    setStatus(data.isOptedIn ? "opted-in" : "not-opted-in");
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleJoin = async () => {
    setJoining(true);
    const res = await fetch("/api/hackathon/team-finder/join", { method: "POST" });
    setJoining(false);
    if (res.ok) {
      await fetchStatus();
    }
  };

  const savePreferences = useCallback(async (prefs: string[]) => {
    setSaveMsg("กำลังบันทึก...");
    const res = await fetch("/api/hackathon/team-finder/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: prefs }),
    });
    setSaveMsg(res.ok ? "บันทึกแล้ว" : "บันทึกไม่สำเร็จ");
    setTimeout(() => setSaveMsg(""), 2000);
  }, []);

  const setPreference = (index: number, userId: string | null) => {
    const next = [...preferences];
    if (userId === null) {
      next.splice(index, 1);
    } else {
      next[index] = userId;
    }
    setPreferences(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => savePreferences(next), DEBOUNCE_MS);
  };

  const optionsFor = (index: number): SimUser[] => {
    const otherSelected = preferences.filter((_, j) => j !== index);
    return others
      .filter((p) => !otherSelected.includes(p.id))
      .map((p) => ({ id: p.id, name: p.name, preferences: [] }));
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-white font-[family-name:var(--font-mitr)]">
        <p className="text-gray-400">กำลังโหลด...</p>
      </div>
    );
  }

  if (status === "not-opted-in") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 font-[family-name:var(--font-mitr)]">
        <div className="bg-[#1a1a2e]/80 border border-[#6a9ac4]/30 rounded-3xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-medium text-white mb-2">หาทีม</h2>
          <p className="text-gray-400 text-sm mb-6">
            เข้าร่วมเพื่อดูคนอื่นที่กำลังหาทีมและเลือกคนที่คุณอยากร่วมทีมด้วย
          </p>
          <p className="text-[#8abade] font-medium mb-6">{participant.name}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onBack}
              className="px-6 py-2 rounded-xl border border-[#444] text-gray-400 hover:text-white transition-colors text-sm"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="px-6 py-2 rounded-xl bg-[#6a9ac4] hover:bg-[#8abade] text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {joining ? "กำลังเข้าร่วม..." : "เข้าร่วมหาทีม"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // opted-in
  return (
    <div className="min-h-screen px-4 py-8 font-[family-name:var(--font-mitr)] text-white max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-medium">หาทีม</h2>
          <p className="text-gray-400 text-sm mt-1">
            {others.length + 1} คนกำลังหาทีม
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          ออก
        </button>
      </div>

      <div className="bg-[#1a1a2e]/80 border border-[#6a9ac4]/30 rounded-2xl p-6">
        <p className="text-sm text-gray-400 mb-4">
          เลือกคนที่คุณอยากร่วมทีมด้วย (สูงสุด {MAX_PREFS} คน, เรียงตามลำดับความต้องการ)
        </p>
        <div className="flex flex-col gap-2">
          {Array.from({ length: MAX_PREFS }).map((_, i) => (
            <PreferenceCombobox
              key={i}
              value={preferences[i] ?? null}
              onChange={(val) => setPreference(i, val)}
              options={optionsFor(i)}
              placeholder={`อันดับ ${i + 1}...`}
            />
          ))}
        </div>
        {saveMsg && (
          <p className="text-xs text-gray-400 mt-3 text-right">{saveMsg}</p>
        )}
      </div>

      <div className="mt-6">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">
          ทุกคนที่หาทีม ({others.length} คน)
        </p>
        <div className="flex flex-wrap gap-2">
          {others.map((p) => (
            <span
              key={p.id}
              className="text-sm px-3 py-1 rounded-full bg-[#1a1a2e] border border-[#333] text-gray-300"
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
