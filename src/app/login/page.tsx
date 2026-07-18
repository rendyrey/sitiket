import { redirect } from "next/navigation";
import { SignInView } from "@/features/auth/components";
import { getCurrentUser } from "@/lib/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect: redirectTo } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(redirectTo || "/account");

  return <SignInView redirectTo={redirectTo} />;
}
