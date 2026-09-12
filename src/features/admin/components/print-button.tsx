"use client";

/** Triggers the browser's print dialog — "Save as PDF" there gives the admin a PDF; a physical printer gives a packing label. */
export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="button button-dark">
      Print / Save as PDF
    </button>
  );
}
