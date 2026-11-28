import dayjs from "dayjs";
import { NextResponse } from "next/server";

type CsvColumn<K extends string> = { header: string; key: K };
type CsvValue = string | number | Date | null | undefined;

/** Cells Excel/Sheets would evaluate as a formula — buyer-entered text must never run as one (CSV injection). */
const FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/;

const toCell = (value: CsvValue): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return dayjs(value).format("YYYY-MM-DD HH:mm");
  if (typeof value === "number") return String(value);
  const text = FORMULA_TRIGGER_RE.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** RFC 4180 CSV — header row from `columns`, one line per row, CRLF line endings. */
export const toCsv = <K extends string>(columns: readonly CsvColumn<K>[], rows: readonly Record<K, CsvValue>[]): string =>
  [columns.map((column) => toCell(column.header)), ...rows.map((row) => columns.map((column) => toCell(row[column.key])))]
    .map((cells) => cells.join(","))
    .join("\r\n");

/**
 * Streams CSV text back as a downloadable attachment. The UTF-8 BOM makes
 * Excel read non-ASCII buyer names/addresses correctly instead of as mojibake.
 */
export const csvResponse = (csv: string, filename: string) =>
  new NextResponse(`﻿${csv}\r\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
