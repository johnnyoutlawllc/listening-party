"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function finish() {
      if (supabase) {
        await supabase.auth.getSession();
      }
      if (!cancelled) router.replace("/settings");
    }
    void finish();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="page-shell">
      <div className="page-intro">
        <div>
          <p className="eyebrow">SIGNING YOU IN</p>
          <h1>One moment.</h1>
          <p className="intro-copy">Finishing your sign-in and opening settings.</p>
        </div>
      </div>
    </div>
  );
}
