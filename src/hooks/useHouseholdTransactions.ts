import { useCallback, useEffect, useState } from "react";
import { fetchMergedTransactionsForHome } from "../api/transactions";
import type { Transaction } from "../types/ledger";

export type UseHouseholdTransactionsResult = {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

/**
 * 家計IDに紐づく収支一覧（計上日の新しい順）。householdId が無いときは空で待機。
 */
export function useHouseholdTransactions(
  householdId: string | undefined
): UseHouseholdTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!householdId) {
        setTransactions([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await fetchMergedTransactionsForHome(householdId);

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setTransactions([]);
      } else {
        setTransactions(data);
      }

      setLoading(false);
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [householdId, reloadToken]);

  const refetch = useCallback(() => {
    setReloadToken((t) => t + 1);
  }, []);

  return { transactions, loading, error, refetch };
}
