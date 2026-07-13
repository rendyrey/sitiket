import Link from "next/link";
import FormField from "@/components/ui/form-field";
import { ArrowRight } from "@/components/site/icons";

export default function SignInForm() {
  return (
    <section className="flex items-center bg-paper px-5 py-16 sm:px-12 lg:px-20">
      <div className="mx-auto w-full max-w-md">
        <span className="tag">Welcome back</span>
        <h2 className="mt-5 text-4xl font-black uppercase xs:text-5xl">
          SIGN IN.
        </h2>
        <p className="mt-3 text-black/50">Your next good time is waiting.</p>
        <form className="mt-9 space-y-5">
          <FormField
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            className="bg-white"
            placeholder="you@example.com"
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="bg-white"
            placeholder="••••••••"
          />
          <div className="flex flex-wrap justify-between gap-3 text-xs font-semibold">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="border-black text-black focus:ring-lime"
              />
              Remember me
            </label>
            <a href="#" className="underline">
              Forgot password?
            </a>
          </div>
          <button
            type="submit"
            className="button button-dark button-large w-full"
          >
            Sign in <ArrowRight className="h-5 w-5" />
          </button>
        </form>
        <p className="mt-7 text-center text-sm text-black/50">
          New to SiTIKET?{" "}
          <Link
            href="/events"
            className="font-bold text-black underline decoration-lime decoration-2 underline-offset-4"
          >
            Explore events
          </Link>
        </p>
      </div>
    </section>
  );
}
