import { atom } from "jotai";
import type { User } from "@/lib/api/types";

/** Client-side mirror of the signed-in user, hydrated once per page load by `SessionProvider`. */
export const sessionUserAtom = atom<User | null>(null);
