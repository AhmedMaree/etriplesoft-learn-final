"use client";
import type { ReactNode } from "react";
import { useQuizLock } from "../quiz-lock";

/** A page navigation landmark that becomes inert during an active assessment attempt. */
export function QuizLockNav({
  className,
  label,
  children,
}: {
  className: string;
  label: string;
  children: ReactNode;
}) {
  const locked = useQuizLock();
  return (
    <nav className={className} aria-label={label} inert={locked}>
      {children}
    </nav>
  );
}
