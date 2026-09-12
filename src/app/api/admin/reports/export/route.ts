import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { getMyOrdersExport, getSellingMerchOrdersExport } from "@/features/admin/lib/api";
import { ApiError } from "@/lib/api/errors";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Bold, dark header row — matches every sheet in the report. */
const styleHeaderRow = (row: ExcelJS.Row) => {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A1A" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });
};

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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SiTIKET";
  workbook.created = new Date();

  const merchSheet = workbook.addWorksheet("Merch Orders");
  merchSheet.columns = [
    { header: "Order ID", key: "id", width: 24 },
    { header: "Date", key: "date", width: 18 },
    { header: "Buyer Name", key: "buyerName", width: 22 },
    { header: "Email", key: "email", width: 26 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Shipping Address", key: "address", width: 40 },
    { header: "Items", key: "items", width: 40 },
    { header: "Subtotal", key: "subtotal", width: 14 },
    { header: "Discount", key: "discount", width: 12 },
    { header: "Shipping Cost", key: "shippingCost", width: 14 },
    { header: "Total", key: "total", width: 14 },
    { header: "Status", key: "status", width: 16 },
  ];
  styleHeaderRow(merchSheet.getRow(1));
  for (const order of merchOrders) {
    merchSheet.addRow({
      id: order.id,
      date: new Date(order.createdAt),
      buyerName: order.buyerName,
      email: order.buyerEmail,
      phone: order.buyerPhone,
      address: [order.shippingAddress, order.shippingDistrict, order.shippingVillage, order.shippingCity, order.shippingProvince, order.shippingPostalCode]
        .filter(Boolean)
        .join(", "),
      items: (order.items ?? []).map((item) => `${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ""} x${item.quantity}`).join("; "),
      subtotal: order.subtotalAmount,
      discount: order.discountAmount,
      shippingCost: order.shippingCost,
      total: order.totalAmount,
      status: order.status,
    });
  }
  merchSheet.getColumn("date").numFmt = "yyyy-mm-dd hh:mm";
  for (const key of ["subtotal", "discount", "shippingCost", "total"]) merchSheet.getColumn(key).numFmt = "#,##0";

  const ticketSheet = workbook.addWorksheet("Ticket Orders");
  ticketSheet.columns = [
    { header: "Order ID", key: "id", width: 24 },
    { header: "Date", key: "date", width: 18 },
    { header: "Event", key: "event", width: 28 },
    { header: "Buyer Name", key: "buyerName", width: 22 },
    { header: "Email", key: "email", width: 26 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Items", key: "items", width: 40 },
    { header: "Subtotal", key: "subtotal", width: 14 },
    { header: "Discount", key: "discount", width: 12 },
    { header: "Total", key: "total", width: 14 },
    { header: "Status", key: "status", width: 16 },
  ];
  styleHeaderRow(ticketSheet.getRow(1));
  for (const order of ticketOrders) {
    ticketSheet.addRow({
      id: order.id,
      date: new Date(order.createdAt),
      event: order.eventName ?? order.eventId,
      buyerName: order.buyerName,
      email: order.buyerEmail,
      phone: order.buyerPhone,
      items: (order.items ?? []).map((item) => `${item.ticketTypeName ?? item.ticketTypeId} x${item.quantity}`).join("; "),
      subtotal: order.subtotalAmount,
      discount: order.discountAmount,
      total: order.totalAmount,
      status: order.status,
    });
  }
  ticketSheet.getColumn("date").numFmt = "yyyy-mm-dd hh:mm";
  for (const key of ["subtotal", "discount", "total"]) ticketSheet.getColumn(key).numFmt = "#,##0";

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sales-report-${startDate}_to_${endDate}.xlsx"`,
    },
  });
}
