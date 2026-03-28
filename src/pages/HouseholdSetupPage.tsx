import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useHousehold } from "../contexts/HouseholdContext";

/** グループ未所属のときの案内 */
export function HouseholdSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading, error } = useHousehold();

  if (authLoading || householdLoading) {
    return (
      <div className="screen">
        <p className="muted">読み込み中…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (household) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="screen login-screen">
      <header className="login-header">
        <h1 className="title">家計グループ</h1>
        <p className="subtitle">まずはグループを作成するか、招待コードで参加してください</p>
      </header>

      {error ? (
        <p className="error card" role="alert">
          {error}
        </p>
      ) : null}

      <div className="card stack-gap">
        <p className="muted block-m0">
          2人で同じ家計を共有するには、どちらか一方がグループを作成し、もう一方が招待コードで参加します。
        </p>
        <Link to="/household/create" className="btn primary">
          グループを作成する
        </Link>
        <Link to="/household/join" className="btn secondary">
          招待コードで参加する
        </Link>
      </div>
    </div>
  );
}
