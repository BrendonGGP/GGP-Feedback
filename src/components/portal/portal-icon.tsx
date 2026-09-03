import type { ReactNode, SVGProps } from "react";

export type PortalIconName =
  | "admin"
  | "arrow"
  | "bell"
  | "calendar"
  | "check"
  | "clock"
  | "dashboard"
  | "feedback"
  | "logout"
  | "menu"
  | "search"
  | "team"
  | "user";

type PortalIconProps = Omit<SVGProps<SVGSVGElement>, "children"> &
  Readonly<{ name: PortalIconName }>;

const paths: Record<PortalIconName, ReactNode> = {
  admin: (
    <>
      <path d="M12 3 4.8 6.2v5.1c0 4.4 3 8.4 7.2 9.7 4.2-1.3 7.2-5.3 7.2-9.7V6.2L12 3Z" />
      <path d="m9.2 12 1.8 1.8 3.9-4" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h13" />
      <path d="m14 7 5 5-5 5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
      <path d="M10 21h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  feedback: (
    <>
      <path d="M21 14a4 4 0 0 1-4 4H9l-5 3v-3a4 4 0 0 1-2-3.5V7a4 4 0 0 1 4-4h11a4 4 0 0 1 4 4v7Z" />
      <path d="M7 9h10M7 13h6" />
    </>
  ),
  logout: (
    <>
      <path d="M10 5H5v14h5" />
      <path d="M13 8l4 4-4 4M8 12h9" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20v-2a6 6 0 0 1 12 0v2M15 15a5 5 0 0 1 6 4.9" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};

export function PortalIcon({ name, ...props }: PortalIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
