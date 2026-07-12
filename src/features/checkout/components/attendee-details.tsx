import FormField from "@/components/ui/form-field";
import CheckoutPanel from "./checkout-panel";

export default function AttendeeDetails() {
  return (
    <CheckoutPanel step="02" title="Your details">
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <FormField label="First name" name="firstName" autoComplete="given-name" placeholder="Your first name" />
        <FormField label="Last name" name="lastName" autoComplete="family-name" placeholder="Your last name" />
        <FormField wrapperClassName="sm:col-span-2" label="Email address" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
        <FormField wrapperClassName="sm:col-span-2" label="Phone number" name="phone" type="tel" autoComplete="tel" placeholder="+62 812 3456 7890" />
      </div>
    </CheckoutPanel>
  );
}
