import type { ReactNode } from "react";
import { LearnerShell } from "@/components/layout/learner-shell";

export default function LearnerLayout({ children }: { children: ReactNode }) {
  return <LearnerShell>{children}</LearnerShell>;
}
