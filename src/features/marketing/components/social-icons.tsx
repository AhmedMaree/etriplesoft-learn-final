import type { SVGProps } from "react";

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.5 21v-7.5H16l.5-3H13.5V8.5c0-.87.24-1.46 1.49-1.46H16.5V4.35C16.22 4.31 15.26 4.23 14.15 4.23c-2.32 0-3.9 1.42-3.9 4.02V10.5H7.75v3H10.25V21h3.25Z" />
    </svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M6.94 8.5H4v11h2.94v-11ZM5.47 3.5A1.7 1.7 0 1 0 5.5 6.9a1.7 1.7 0 0 0-.03-3.4ZM20 13.13c0-3.06-1.64-4.49-3.82-4.49a3.3 3.3 0 0 0-3 1.65V8.5H10.24c.04.86 0 11 0 11h2.94v-6.14c0-.33.02-.66.12-.9.27-.66.87-1.35 1.9-1.35 1.34 0 1.87 1.02 1.87 2.51V19.5H20v-6.37Z" />
    </svg>
  );
}
