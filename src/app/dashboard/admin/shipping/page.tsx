import type { Metadata } from "next";
import { ShippingOriginForm } from "@/features/shipping/components";
import { getMyShippingOrigin, listShippingCouriers } from "@/features/shipping/lib/api";

export const metadata: Metadata = { title: "Shipping" };

export default async function AdminShippingPage() {
  const [origin, couriers] = await Promise.all([getMyShippingOrigin(), listShippingCouriers()]);

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Shipping</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">
        The departure address your merch ships from and the couriers you offer. Checkout calculates every buyer&apos;s
        shipping cost between this address and theirs — you can&apos;t sell merch without it.
      </p>
      <div className="mt-8 max-w-3xl">
        <ShippingOriginForm origin={origin} couriers={couriers} />
      </div>
    </div>
  );
}
