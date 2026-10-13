"use client";

import { useFormStatus } from "react-dom";

export function EnrollmentSubmitButton({ label, pendingLabel, pendingAnnouncement, className = "mk-btn mk-btn--primary" }: {
  label: string;
  className?: string;
  pendingLabel: string;
  pendingAnnouncement: string;
}) {
  const { pending } = useFormStatus();

  return (
    <>
      <button
        className={className}
        type="submit"
        aria-disabled={pending}
        aria-busy={pending}
        data-testid="course-enroll-free"
        onClick={(event) => {
          if (pending) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {pending ? pendingLabel : label}
      </button>
      <span className="mk-visually-hidden visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {pending ? pendingAnnouncement : ""}
      </span>
    </>
  );
}
