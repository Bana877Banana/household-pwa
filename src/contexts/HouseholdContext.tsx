import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export type Household = {
  id: string;
  name: string;
  inviteCode: string;
};

type HouseholdContextValue = {
  household: Household | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createHousehold: (name: string) => Promise<{ error: string | null }>;
  joinHousehold: (inviteCode: string) => Promise<{ error: string | null }>;
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setHousehold(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: qError } = await supabase
      .from("household_members")
      .select("household_id, households (id, name, invite_code)")
      .eq("user_id", user.id)
      .maybeSingle();

    if (qError) {
      setHousehold(null);
      setError(qError.message);
      setLoading(false);
      return;
    }

    const row = data as {
      household_id: string;
      households: { id: string; name: string; invite_code: string } | null;
    } | null;

    const h = row?.households;
    if (h) {
      setHousehold({
        id: h.id,
        name: h.name,
        inviteCode: h.invite_code,
      });
    } else {
      setHousehold(null);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const createHousehold = useCallback(
    async (name: string) => {
      const { data, error: rpcError } = await supabase.rpc("create_household", {
        p_name: name,
      });

      if (rpcError) {
        return { error: mapRpcError(rpcError.message) };
      }

      const payload = data as { household_id?: string; invite_code?: string } | null;
      if (!payload?.household_id) {
        return { error: "作成に失敗しました" };
      }

      await load();
      return { error: null };
    },
    [load]
  );

  const joinHousehold = useCallback(
    async (inviteCode: string) => {
      const { data, error: rpcError } = await supabase.rpc("join_household", {
        p_invite_code: inviteCode,
      });

      if (rpcError) {
        return { error: mapRpcError(rpcError.message) };
      }

      const payload = data as { household_id?: string } | null;
      if (!payload?.household_id) {
        return { error: "参加に失敗しました" };
      }

      await load();
      return { error: null };
    },
    [load]
  );

  const value = useMemo<HouseholdContextValue>(
    () => ({
      household,
      loading,
      error,
      refresh: load,
      createHousehold,
      joinHousehold,
    }),
    [household, loading, error, load, createHousehold, joinHousehold]
  );

  return (
    <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>
  );
}

function mapRpcError(message: string): string {
  if (message.includes("already_in_household")) {
    return "すでに別の家計グループに所属しています";
  }
  if (message.includes("invite_not_found")) {
    return "招待コードが見つかりません";
  }
  if (message.includes("invalid_invite_code")) {
    return "招待コードの形式が正しくありません";
  }
  if (message.includes("invalid_name")) {
    return "グループ名を入力してください";
  }
  if (message.includes("not_authenticated")) {
    return "ログインが必要です";
  }
  return message;
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useHousehold must be used within HouseholdProvider");
  return ctx;
}
