import type { InputHTMLAttributes } from "react";
import cn from "@/utils/class-names";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  wrapperClassName?: string;
  /** Field-level validation message — renders the input with a red border and this text below it. */
  error?: string;
};

export default function FormField({
  className,
  error,
  id,
  label,
  name,
  wrapperClassName,
  ...inputProps
}: FormFieldProps) {
  return (
    <label className={cn("field-label", wrapperClassName)}>
      {label}
      <input
        id={id ?? name}
        name={name}
        className={cn("text-field", error && "!border-red-500", className)}
        aria-invalid={error ? true : undefined}
        {...inputProps}
      />
      {error && <span className="mt-1.5 block text-xs font-semibold normal-case tracking-normal text-red-600">{error}</span>}
    </label>
  );
}
