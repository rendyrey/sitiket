import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ApplyAdminForm from "@/features/account/components/apply-admin-form";
import ProfileForm from "@/features/account/components/profile-form";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Profile" };

/**
 * The buyer's editable profile: contact + delivery address (the merch
 * checkout prerequisite — shipping is quoted from the chosen village), plus
 * the become-an-organizer application for regular users.
 */
export default async function AccountProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account/profile");

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Profile</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">
        Your contact details and delivery address. Merch sellers ship orders here, and shipping costs are quoted from
        your village.
      </p>
      <div className="mt-8 max-w-2xl space-y-8">
        <ProfileForm user={user} />
        {user.role === "user" && <ApplyAdminForm />}
      </div>
    </div>
  );
}
