"use client";

import { Provider, useSetAtom } from "jotai";
import { useEffect, type ReactNode } from "react";
import type { User } from "@/lib/api/types";
import { sessionUserAtom } from "../lib/session-atom";

function SessionHydrator({ user }: { user: User | null }) {
  const setUser = useSetAtom(sessionUserAtom);
  useEffect(() => {
    setUser(user);
  }, [user, setUser]);
  return null;
}

/**
 * The app's first (and currently only) global provider — mounts a Jotai
 * store and hydrates `sessionUserAtom` from the server-resolved current
 * user, resolved once per request in the root layout via
 * `lib/session.ts` `getCurrentUser()`.
 */
export default function SessionProvider({ user, children }: { user: User | null; children: ReactNode }) {
  return (
    <Provider>
      <SessionHydrator user={user} />
      {children}
    </Provider>
  );
}
