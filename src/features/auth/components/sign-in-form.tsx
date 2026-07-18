import Link from "next/link";
import { publicEnv } from "@/lib/public-env";
import GoogleSignInButton from "./google-sign-in-button";

export default function SignInForm({ redirectTo }: { redirectTo?: string }) {
  return (
    <section className="flex items-center bg-paper px-5 py-16 sm:px-12 lg:px-20">
      <div className="mx-auto w-full max-w-md">
        <span className="tag">Welcome back</span>
        <h2 className="mt-5 text-4xl font-black uppercase xs:text-5xl">
          SIGN IN.
        </h2>
        <p className="mt-3 text-black/50">Your next good time is waiting.</p>
        <div className="mt-9">
          <GoogleSignInButton clientId={publicEnv.googleClientId} redirectTo={redirectTo} />
        </div>
        <p className="mt-7 text-center text-sm text-black/50">
          Guest checkout also works —{" "}
          <Link
            href="/events"
            className="font-bold text-black underline decoration-lime decoration-2 underline-offset-4"
          >
            explore events
          </Link>{" "}
          without signing in.
        </p>
      </div>
    </section>
  );
}
