import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Role = "buyer" | "seller";

interface AuthState {
  user: User | null;
  ready: boolean;
  profile: Tables<"profiles"> | null;
  roles: Role[];
  isBuyer: boolean;
  isSeller: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient, router]);

  const uid = user?.id;
  const profileQ = useQuery({
    queryKey: ["me", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [{ data: profile, error }, { data: roles, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid!),
      ]);
      if (error) throw error;
      if (e2) throw e2;
      return { profile, roles: (roles ?? []).map((r) => r.role as Role) };
    },
  });

  const value = useMemo<AuthState>(() => {
    const roles = profileQ.data?.roles ?? [];
    return {
      user,
      ready: ready && (!uid || !profileQ.isLoading),
      profile: profileQ.data?.profile ?? null,
      roles,
      isBuyer: roles.includes("buyer"),
      isSeller: roles.includes("seller"),
      refreshProfile: async () => {
        await queryClient.invalidateQueries({ queryKey: ["me", uid] });
      },
      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
        navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
      },
    };
  }, [user, ready, uid, profileQ.data, profileQ.isLoading, queryClient, navigate]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
