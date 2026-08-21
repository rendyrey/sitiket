"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useAtomValue } from "jotai";
import { CartIcon } from "@/components/site/icons";
import { cartAtom, cartCount } from "../lib/cart";

const emptySubscribe = () => () => {};

/**
 * Header cart button with a live line count. The count reads localStorage,
 * so it renders 0 on the server and settles after hydration — gate the badge
 * on `hydrated` (via useSyncExternalStore, the mismatch-safe "am I on the
 * client yet" primitive) to avoid a hydration mismatch.
 */
export default function CartIndicator() {
  const items = useAtomValue(cartAtom);
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const count = hydrated ? cartCount(items) : 0;

  return (
    <Link
      href="/cart"
      className="relative grid h-11 w-11 place-items-center border border-white/30 transition-colors hover:border-lime hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
    >
      <CartIcon className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center bg-lime px-1 text-[10px] font-black tabular-nums text-black">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
