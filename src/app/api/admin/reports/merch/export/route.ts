import { NextRequest, NextResponse } from "next/server";
import { getSellingMerchOrdersExport } from "@/features/admin/lib/api";
import { ApiError } from "@/lib/api/errors";
import type { MerchOrderStatus } from "@/lib/api/types";
import { csvResponse, toCsv } from "@/lib/reports/csv";
import {
  addMerchItemsSheet,
  addMerchOrdersSheet,
  DATE_RE,
  MERCH_ORDER_COLUMNS,
  newReportWorkbook,
  toMerchOrderRow,
  xlsxResponse,
} from "@/lib/reports/xlsx";

const MERCH_ORDER_STATUSES: readonly MerchOrderStatus[] = ["pending_payment", "awaiting_verification", "paid", "expired", "cancelled"];

const isMerchOrderStatus = (value: string): value is MerchOrderStatus => (MERCH_ORDER_STATUSES as readonly string[]).includes(value);

const badRequest = (code: string, message: string) => NextResponse.json({ error: { code, message } }, { status: 400 });

/**
 * GET /api/admin/reports/merch/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD[&status=<MerchOrderStatus>][&format=xlsx|csv]
 *
 * Merch-only export of the signed-in seller's orders placed in that
 * inclusive date range, optionally narrowed to one order status.
 * - `xlsx` (default): "Merch Orders" (one row per order) + "Merch Items"
 *   (one row per line item) sheets.
 * - `csv`: the per-order rows only — CSV has no sheets.
 * The backend's `requireRole` on `/api/merch-orders/export` is the real
 * admin/super_admin gate; the status filter is applied here because that
 * endpoint returns every status.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const startDate = params.get("startDate") ?? "";
  const endDate = params.get("endDate") ?? "";
  const status = params.get("status") || "all";
  const format = params.get("format") || "xlsx";

  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    return badRequest("INVALID_DATE_RANGE", "startDate and endDate must be YYYY-MM-DD");
  }
  if (startDate > endDate) {
    return badRequest("INVALID_DATE_RANGE", "startDate must be on or before endDate");
  }
  if (status !== "all" && !isMerchOrderStatus(status)) {
    return badRequest("INVALID_STATUS", `status must be "all" or one of: ${MERCH_ORDER_STATUSES.join(", ")}`);
  }
  if (format !== "xlsx" && format !== "csv") {
    return badRequest("INVALID_FORMAT", 'format must be "xlsx" or "csv"');
  }

  let orders: Awaited<ReturnType<typeof getSellingMerchOrdersExport>>;
  try {
    orders = await getSellingMerchOrdersExport({ startDate, endDate });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    }
    throw error;
  }
  if (status !== "all") orders = orders.filter((order) => order.status === status);

  const basename = `merch-orders-${status === "all" ? "" : `${status}-`}${startDate}_to_${endDate}`;

  if (format === "csv") {
    return csvResponse(toCsv(MERCH_ORDER_COLUMNS, orders.map(toMerchOrderRow)), `${basename}.csv`);
  }

  const workbook = newReportWorkbook();
  addMerchOrdersSheet(workbook, orders);
  addMerchItemsSheet(workbook, orders);
  return xlsxResponse(workbook, `${basename}.xlsx`);
}
