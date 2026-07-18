import FormField from "@/components/ui/form-field";
import CheckoutPanel from "./checkout-panel";

export type AttendeeDetailsValues = {
  name: string;
  email: string;
  phone: string;
};

type AttendeeDetailsProps = {
  disabled?: boolean;
  onChange: (values: AttendeeDetailsValues) => void;
  values: AttendeeDetailsValues;
};

export default function AttendeeDetails({ disabled = false, onChange, values }: AttendeeDetailsProps) {
  const phoneMissing = !values.phone.trim();

  return (
    <CheckoutPanel step="02" title="Your details">
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <FormField
          wrapperClassName="sm:col-span-2"
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Your full name"
          value={values.name}
          disabled={disabled}
          onChange={(event) => onChange({ ...values, name: event.target.value })}
          required
        />
        <FormField
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          disabled={disabled}
          onChange={(event) => onChange({ ...values, email: event.target.value })}
          required
        />
        <FormField
          label="Phone number"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+62 812 3456 7890"
          value={values.phone}
          onChange={(event) => onChange({ ...values, phone: event.target.value })}
          required
        />
      </div>
      {disabled && (
        <p className="mt-4 text-xs font-semibold text-black/40">
          Signed in — name and email locked to your account.
        </p>
      )}
      {disabled && phoneMissing && (
        <p className="mt-3 border-2 border-amber-500/60 bg-amber-500/10 p-3 text-xs font-semibold text-amber-700">
          Your account has no phone number on file — add one below to continue.
        </p>
      )}
    </CheckoutPanel>
  );
}
