import { NavLink } from "react-router-dom";
const tabs = [
  { to: "/", icon: "⌂", label: "ホーム", end: true },
  { to: "/transactions/new", icon: "＋", label: "収支" },
  { to: "/shopping", icon: "☷", label: "買い物メモ" },
  { to: "/summary/month", icon: "▥", label: "集計" },
  { to: "/settings", icon: "⚙", label: "設定" },
];
export function BottomNav() {
  return <nav className="bottom-nav" aria-label="メインナビゲーション">
    {tabs.map(tab => <NavLink key={tab.to} to={tab.to} end={tab.end} className={({isActive}) => `bottom-nav__link${isActive ? " bottom-nav__link--active" : ""}`}>
      <span className="bottom-nav__icon" aria-hidden="true">{tab.icon}</span>
      <span className="bottom-nav__label">{tab.label}</span>
    </NavLink>)}
  </nav>;
}
