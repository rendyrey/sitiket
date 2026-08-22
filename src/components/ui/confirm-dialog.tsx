"use client";

import { useEffect, type ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  /** Small uppercase tag above the heading, e.g. "Heads up" / "Remove staff". */
  tag?: string;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button red for destructive actions. */
  danger?: boolean;
  /** Disables both buttons while the action runs. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Branded confirmation modal — same look as the checkout's multi-seller
 * prompt (ink overlay, lime-bordered white panel). Escape or a backdrop
 * click cancels; the page behind stays put.
 */
export default function ConfirmDialog({
  busy,
  cancelLabel = "Cancel",
  children,
  confirmLabel = "Confirm",
  danger,
  onCancel,
  onConfirm,
  open,
  tag = "Heads up",
  title,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-ink/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div className="w-full max-w-md border-4 border-lime bg-white p-6 sm:p-8">
        <span className="tag">{tag}</span>
        <h2 id="confirm-dialog-title" className="mt-4 text-2xl font-black uppercase leading-tight">
          {title}
        </h2>
        {children && <div className="mt-3 text-sm text-black/60">{children}</div>}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={onConfirm}
            className={`button disabled:opacity-50 ${danger ? "border-red-600 bg-red-600 text-white hover:border-ink hover:bg-ink" : "button-dark"}`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="button border-black/25 bg-transparent text-black hover:border-black disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
