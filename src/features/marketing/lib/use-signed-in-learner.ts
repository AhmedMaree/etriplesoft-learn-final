"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type SignedInLearner = { avatarUrl: string | null };

/**
 * Display-only signed-in state for the public header, read in the browser so public
 * pages stay static. Never use it for authorization; the learner routes check on the server.
 */
export function useSignedInLearner(): SignedInLearner | null {
  const [learner, setLearner] = useState<SignedInLearner | null>(null);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }
    let active = true;

    async function load(session: Session | null) {
      if (!session) {
        if (active) setLearner(null);
        return;
      }
      if (active) setLearner((current) => current ?? { avatarUrl: null });
      const userId = session.user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_object_key")
        .eq("id", userId)
        .maybeSingle();
      const key = profile?.avatar_object_key;
      if (!key?.startsWith(`${userId}/`)) return;
      const { data } = await supabase.storage.from("avatars").createSignedUrl(key, 3600);
      if (active && data?.signedUrl) setLearner({ avatarUrl: data.signedUrl });
    }

    // Fires INITIAL_SESSION on subscribe. Supabase calls are deferred out of the callback to avoid its auth lock.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => void load(session), 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return learner;
}
