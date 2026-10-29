import { Link } from "react-router-dom";
import { TransactionList } from "../components/TransactionList";
import { useHousehold } from "../contexts/HouseholdContext";
import { useHouseholdTransactions } from "../hooks/useHouseholdTransactions";
export function TransactionsPage() {
  const { household } = useHousehold();
  const { transactions, loading, error, refetch } = useHouseholdTransactions(household?.id);
  return <main className="screen floral-page">
    <header className="floral-page__heading"><h1>収支一覧</h1><p className="muted small">最新100件・固定費を含む直近120日</p></header>
    <Link className="btn primary" to="/transactions/new">＋ 収支を登録</Link>
    <section className="card"><TransactionList transactions={transactions} loading={loading} error={error} onRetry={refetch}/></section>
  </main>;
}
