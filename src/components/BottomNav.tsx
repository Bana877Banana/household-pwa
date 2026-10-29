import { NavLink } from "react-router-dom";
import { AppIcon } from "./AppIcon";
const tabs = [
  { to: "/", icon: "home", label: "ホーム", end: true },
  { to: "/transactions/new", icon: "pencil", label: "収支" },
  { to: "/shopping", icon: "shopping", label: "買い物メモ" },
  { to: "/summary/month", icon: "chart", label: "集計" },
  { to: "/settings", icon: "settings", label: "設定" },
] as const;
export function BottomNav() {
  return <nav className="bottom-nav" aria-label="メインナビゲーション">
    {tabs.map(tab => <NavLink key={tab.to} to={tab.to} end={"end" in tab ? tab.end : undefined} className={({isActive}) => `bottom-nav__link${isActive ? " bottom-nav__link--active" : ""}`}>
      <span className="bottom-nav__icon"><AppIcon name={tab.icon} size={23}/></span>
      <span className="bottom-nav__label">{tab.label}</span>
    </NavLink>)}
  </nav>;
}
