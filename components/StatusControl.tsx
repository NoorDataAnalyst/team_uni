"use client";

import { TASK_LABEL, type TaskStatus } from "@/lib/client";

const ORDER: TaskStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];

export default function StatusControl({
  value,
  onChange,
  disabled,
}: {
  value: TaskStatus;
  onChange: (s: TaskStatus) => void;
  disabled?: boolean;
}) {
  return (
    <div className="seg" role="group" aria-label="Task status">
      {ORDER.map((s) => (
        <button key={s} type="button" data-s={s} aria-pressed={value === s} disabled={disabled} onClick={() => value !== s && onChange(s)}>
          {TASK_LABEL[s]}
        </button>
      ))}
    </div>
  );
}
