import SignInForm from "./sign-in-form";
import SignInPromo from "./sign-in-promo";

export default function SignInView({ redirectTo }: { redirectTo?: string }) {
  return (
    <div className="grid min-h-[calc(100vh-100px)] lg:grid-cols-2">
      <SignInPromo />
      <SignInForm redirectTo={redirectTo} />
    </div>
  );
}
