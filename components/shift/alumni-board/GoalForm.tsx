"use client";

import { useState } from "react";
import { toast } from "sonner";

import { saveGoalAction, setGoalStatusAction } from "@/app/shift/alumni/board/actions";
import { GOAL_FIELDS, STATUS_LABEL, type GoalFields, type GoalStatus } from "@/lib/shift/alumniBoard";

import board from "./board.module.css";
import { useBoardAction } from "./useBoardAction";

/** ✅/❌ check-in for a week goal. Tapping the current one sets it back to open. */
export function GoalStatusButtons({ goalId, status }: { goalId: string; status: GoalStatus }) {
  const { pending, run } = useBoardAction();
  return (
    <div className={`${board.row} ${board.actions}`}>
      {(["done", "not_done"] as const).map((value) => (
        <button
          key={value}
          type="button"
          className={board.ghost}
          aria-pressed={status === value}
          disabled={pending}
          onClick={() => run(() => setGoalStatusAction(goalId, status === value ? "open" : value))}
        >
          {STATUS_LABEL[value]}
        </button>
      ))}
    </div>
  );
}

/** The goal card: long term down to a first step under 10 minutes. */
export function GoalForm({ name, initial }: { name: string; initial: Partial<GoalFields> }) {
  const { pending, run } = useBoardAction();
  const [values, setValues] = useState<Partial<GoalFields>>(initial);
  return (
    <section className={board.card}>
      <h1 className={board.title}>การ์ดเป้าหมายของ {name}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveGoalAction(values), () => toast.success("บันทึกแล้ว"));
        }}
      >
        {GOAL_FIELDS.map((field) => (
          <div key={field.name}>
            <label className={board.label} htmlFor={`goal-${field.name}`}>
              {field.label} <span className={board.hint}>{field.hint}</span>
            </label>
            <textarea
              id={`goal-${field.name}`}
              className={board.input}
              maxLength={500}
              value={values[field.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
            />
          </div>
        ))}
        <button type="submit" className={`${board.button} mt-4`} disabled={pending}>
          บันทึก
        </button>
      </form>
    </section>
  );
}
