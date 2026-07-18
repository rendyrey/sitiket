"use client";

import { useAtomValue } from "jotai";
import { sessionUserAtom } from "./session-atom";

/** Reactive client-side read of the current session — `null` for a guest. */
export const useSession = () => useAtomValue(sessionUserAtom);
