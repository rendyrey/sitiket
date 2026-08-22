"use client";

import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { useState } from "react";
import cn from "@/utils/class-names";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  options: readonly SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Shown while nothing is selected, e.g. "Select province" / "Loading…". */
  placeholder?: string;
  disabled?: boolean;
  /** Forwarded to the input so getElementById-based scroll/focus targeting works. */
  id?: string;
  /** Extra classes for the input, e.g. "h-11" or "!border-red-500". */
  className?: string;
};

/**
 * Searchable replacement for native <select> fields — click to see every
 * option, type to filter, pick with mouse or keyboard. Same string
 * value/onChange contract as a native select, styled like `.text-field`.
 * An option with value "" plays the role of the old empty <option>.
 */
export default function SearchableSelect({ className, disabled, id, onChange, options, placeholder, value }: SearchableSelectProps) {
  const [query, setQuery] = useState("");

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed ? options.filter((option) => option.label.toLowerCase().includes(trimmed)) : options;

  return (
    <Combobox
      immediate
      value={value}
      disabled={disabled}
      onChange={(next) => onChange(next ?? "")}
      onClose={() => setQuery("")}
    >
      <div className="relative mt-2">
        <ComboboxInput
          id={id}
          autoComplete="off"
          placeholder={placeholder}
          displayValue={(current: string) => options.find((option) => option.value === current)?.label ?? ""}
          onChange={(event) => setQuery(event.target.value)}
          className={cn(
            "text-field mt-0 pr-11 disabled:cursor-not-allowed disabled:bg-paper disabled:text-black/40",
            className,
          )}
        />
        <ComboboxButton className="absolute inset-y-0 right-0 grid w-11 place-items-center text-black/40" aria-label="Show options">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
            <path d="M2 5.5 8 11.5 14 5.5z" />
          </svg>
        </ComboboxButton>
        <ComboboxOptions
          anchor="bottom start"
          className="z-[80] max-h-64 w-[var(--input-width)] overflow-y-auto border-2 border-ink bg-white shadow-[4px_4px_0_0_#0a0a0a] [--anchor-gap:4px]"
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm font-semibold text-black/40">No matches.</div>
          ) : (
            filtered.map((option) => (
              <ComboboxOption
                key={option.value}
                value={option.value}
                className="cursor-pointer border-b border-black/10 px-4 py-2.5 text-sm font-medium last:border-b-0 data-[focus]:bg-lime data-[selected]:font-black"
              >
                {option.label}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}
