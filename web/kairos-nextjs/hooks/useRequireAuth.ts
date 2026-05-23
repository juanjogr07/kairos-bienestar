"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export function useRequireAuth() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    try {
      const supabase = createClient();
      supabase.auth
        .getSession()
        .then(({ data: { session } }: { data: { session: Session | null } }) => {
          if (!mounted) return;
          if (!session) router.replace("/");
          else setChecking(false);
        })
        .catch(() => {
          if (mounted) setChecking(false);
        });
    } catch {
      if (mounted) setChecking(false);
    }
    return () => { mounted = false; };
  }, [router]);

  return { checking };
}
