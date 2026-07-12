import type { InputHTMLAttributes } from "react";
import cn from "@/utils/class-names";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  wrapperClassName?: string;
};

export default function FormField({
  className,
  label,
  wrapperClassName,
  ...inputProps
}: FormFieldProps) {
  return (
    <label className={cn("field-label", wrapperClassName)}>
      {label}
      <input className={cn("text-field", className)} {...inputProps} />
    </label>
  );
}
