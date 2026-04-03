import type { MentorSessionType } from "@/types/mentor";

type Props = {
  value: MentorSessionType;
  onChange: (v: MentorSessionType) => void;
};

const OPTIONS: Array<{
  value: MentorSessionType;
  label: string;
  description: string;
  color: string;
  borderColor: string;
  glowColor: string;
}> = [
  {
    value: "healthcare",
    label: "Healthcare Mentor",
    description: "Students book individual 1-on-1 sessions with you",
    color: "#65ABFC",
    borderColor: "rgba(101,171,252,0.5)",
    glowColor: "rgba(101,171,252,0.15)",
  },
  {
    value: "group",
    label: "Group Mentor",
    description: "Admin assigns you to hackathon teams",
    color: "#A594BA",
    borderColor: "rgba(165,148,186,0.5)",
    glowColor: "rgba(165,148,186,0.15)",
  },
];

export default function SessionTypeSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="rounded-2xl p-5 text-left transition-all duration-200"
            style={{
              background: active ? opt.glowColor : "rgba(13,18,25,0.8)",
              border: `2px solid ${active ? opt.borderColor : "rgba(74,107,130,0.25)"}`,
              boxShadow: active ? `0 0 20px ${opt.glowColor}` : "none",
            }}
          >
            <p
              className="font-semibold text-sm font-[family-name:var(--font-bai-jamjuree)]"
              style={{ color: active ? opt.color : "#7a9ab4" }}
            >
              {opt.label}
            </p>
            <p
              className="text-xs mt-1 font-[family-name:var(--font-mitr)]"
              style={{ color: "#5a7a94" }}
            >
              {opt.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
