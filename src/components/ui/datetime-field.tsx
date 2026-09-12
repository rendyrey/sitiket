"use client";

import dayjs from "dayjs";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import cn from "@/utils/class-names";

type DateTimeFieldProps = {
  label: string;
  /** `datetime-local`-shaped value, e.g. "2026-09-12T14:30", or "" when empty — matches the app's existing dayjs ISO<->local convention. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  wrapperClassName?: string;
};

/**
 * Styled date + time picker replacing the bare `<input type="datetime-local">`
 * — a calendar + time-list popover on desktop, and a full-width tappable
 * field with the same popover on mobile (react-datepicker positions itself
 * to stay on-screen at any width).
 */
export default function DateTimeField({ label, value, onChange, error, placeholder, wrapperClassName }: DateTimeFieldProps) {
  return (
    <label className={cn("field-label", wrapperClassName)}>
      {label}
      <ReactDatePicker
        selected={value ? dayjs(value).toDate() : null}
        onChange={(date) => onChange(date ? dayjs(date).format("YYYY-MM-DDTHH:mm") : "")}
        showTimeSelect
        timeIntervals={15}
        dateFormat="d MMM yyyy, HH:mm"
        placeholderText={placeholder}
        isClearable
        autoComplete="off"
        className={cn("text-field w-full", error && "!border-red-500")}
        wrapperClassName="block w-full"
      />
      {error && <span className="mt-1.5 block text-xs font-semibold normal-case tracking-normal text-red-600">{error}</span>}
    </label>
  );
}
