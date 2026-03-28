import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";

/** 家計グループ所属必須。未所属は /household/setup へ */
export function HouseholdRequiredLayout() {
  const { loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();

  if (authLoading || householdLoading) {
    return (
      <div className="screen">
        <p className="muted">読み込み中…</p>
      </div>
    );
  }

  if (!household) {
    return <Navigate to="/household/setup" replace />;
  }

  return <Outlet />;
}
