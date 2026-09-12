import { NextRequest, NextResponse } from "next/server";
import { getMyOrdersExport, getSellingMerchOrdersExport } from "@/features/admin/lib/api";
import { ApiError } from "@/lib/api/errors";
import { addMerchOrdersSheet, addTicketOrdersSheet, DATE_RE, newReportWorkbook, xlsxResponse } from "@/lib/reports/xlsx";

/**
 * GET /api/admin/reports/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Streams an .xlsx workbook with two sheets — "Merch Orders" and "Ticket
 * Orders" — covering every order the signed-in admin owns in that date
 * range. Runs server-side only; the backend's own `requireRole` on
 * `/api/merch-orders/export` and `/api/orders/export` is what actually
 * enforces "admin/super_admin only" — this route just relays the session
 * cookie and turns the JSON result into a downloadable file.
 */
export async function GET(request: NextRequest) {
  const startDate = request.nextUrl.searchParams.get("startDate") ?? "";
  const endDate = request.nextUrl.searchParams.get("endDate") ?? "";
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    return NextResponse.json({ error: { code: "INVALID_DATE_RANGE", message: "startDate and endDate must be YYYY-MM-DD" } }, { status: 400 });
  }

  let merchOrders: Awaited<ReturnType<typeof getSellingMerchOrdersExport>>;
  let ticketOrders: Awaited<ReturnType<typeof getMyOrdersExport>>;
  try {
    [merchOrders, ticketOrders] = await Promise.all([
      getSellingMerchOrdersExport({ startDate, endDate }),
      getMyOrdersExport({ startDate, endDate }),
    ]);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    }
    throw error;
  }

  const workbook = newReportWorkbook();
  addMerchOrdersSheet(workbook, merchOrders);
  addTicketOrdersSheet(workbook, ticketOrders);

  return xlsxResponse(workbook, `sales-report-${startDate}_to_${endDate}.xlsx`);
}
