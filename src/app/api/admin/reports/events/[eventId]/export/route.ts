import { NextRequest, NextResponse } from "next/server";
import { getEventOrdersExport } from "@/features/admin/lib/api";
import { ApiError } from "@/lib/api/errors";
import { addTicketOrdersSheet, DATE_RE, newReportWorkbook, xlsxResponse } from "@/lib/reports/xlsx";

/**
 * GET /api/admin/reports/events/:eventId/export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Same Excel sales report as `/api/admin/reports/export`, scoped to one
 * event — a single "Ticket Orders" sheet (merch isn't event-scoped, so it
 * has no place here). The backend's own `requireRole` + event-ownership
 * check on `GET /api/events/:eventId/orders/export` is the real gate; this
 * route just relays the session cookie and turns JSON into a download.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const startDate = request.nextUrl.searchParams.get("startDate") ?? "";
  const endDate = request.nextUrl.searchParams.get("endDate") ?? "";
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    return NextResponse.json({ error: { code: "INVALID_DATE_RANGE", message: "startDate and endDate must be YYYY-MM-DD" } }, { status: 400 });
  }

  let ticketOrders: Awaited<ReturnType<typeof getEventOrdersExport>>;
  try {
    ticketOrders = await getEventOrdersExport(eventId, { startDate, endDate });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    }
    throw error;
  }

  const workbook = newReportWorkbook();
  addTicketOrdersSheet(workbook, ticketOrders);

  return xlsxResponse(workbook, `sales-report-${startDate}_to_${endDate}.xlsx`);
}
