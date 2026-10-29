import type { SVGProps } from "react";
type Name = "flower" | "settings" | "home" | "pencil" | "list" | "chart" | "shopping" | "chevron";
type Props = SVGProps<SVGSVGElement> & { name: Name; size?: number };
export function AppIcon({ name, size = 22, ...props }: Props) {
  if (name === "flower") return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
    <g fill="#f5a8bb" stroke="#e78aa7" strokeWidth=".8"><ellipse cx="24" cy="13" rx="8.5" ry="12"/><ellipse cx="24" cy="13" rx="8.5" ry="12" transform="rotate(72 24 24)"/><ellipse cx="24" cy="13" rx="8.5" ry="12" transform="rotate(144 24 24)"/><ellipse cx="24" cy="13" rx="8.5" ry="12" transform="rotate(216 24 24)"/><ellipse cx="24" cy="13" rx="8.5" ry="12" transform="rotate(288 24 24)"/></g><circle cx="24" cy="24" r="6.5" fill="#f6ca72"/><circle cx="22" cy="22" r="1.6" fill="#fff7dd"/>
  </svg>;
  const paths: Record<Exclude<Name, "flower">, React.ReactNode> = {
    settings: <><circle cx="12" cy="12" r="3"/><path d="M10 2.8h4l.6 2.2 2 1 2.1-1.1 2.8 2.8-1.1 2.1 1 2 .2 2.2-2.2.6-1 2 1.1 2.1-2.8 2.8-2.1-1.1-2 1-2.2.2-.6-2.2-2-1-2.1 1.1-2.8-2.8 1.1-2.1-1-2-.2-2.2 2.2-.6 1-2-1.1-2.1 2.8-2.8 2.1 1.1 2-1z" transform="translate(0 -1) scale(.92) translate(1 1)"/></>,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></>,
    pencil: <><path d="m4 17-1 4 4-1L20 7l-3-3z"/><path d="m14 7 3 3"/></>,
    list: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M10 8h7M10 12h7M10 16h7M7 8h.1M7 12h.1M7 16h.1"/></>,
    chart: <><rect x="4" y="12" width="3.5" height="9" rx=".6"/><rect x="10.25" y="7" width="3.5" height="14" rx=".6"/><rect x="16.5" y="3" width="3.5" height="18" rx=".6"/></>,
    shopping: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h2m2 0h6M7 14h2m2 0h6"/></>,
    chevron: <path d="m9 5 7 7-7 7"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
