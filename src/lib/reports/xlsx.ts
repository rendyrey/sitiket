import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import type { MerchOrder, Order } from "@/lib/api/types";

/** "YYYY-MM-DD" — the query-param shape every report route validates. */
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Bold, dark header row — matches every sheet in every sales-report workbook. */
const styleHeaderRow = (row: ExcelJS.Row) => {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A1A" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });
};

/** Shipping address on one line — "street, district, village, city, province, postal code", blanks skipped. */
const formatMerchShippingAddress = (order: MerchOrder) =>
  [order.shippingAddress, order.shippingDistrict, order.shippingVillage, order.shippingCity, order.shippingProvince, order.shippingPostalCode]
    .filter(Boolean)
    .join(", ");

/** "Hoodie (Black / L) x2; Tote x1" — every line item in one cell. */
const formatMerchItems = (order: MerchOrder) =>
  (order.items ?? []).map((item) => `${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ""} x${item.quantity}`).join("; ");

/** Column layout of the per-order merch export — shared by the "Merch Orders" sheet and the merch CSV. */
export const MERCH_ORDER_COLUMNS = [
  { header: "Order ID", key: "id", width: 24 },
  { header: "Date", key: "date", width: 18 },
  { header: "Buyer Name", key: "buyerName", width: 22 },
  { header: "Email", key: "email", width: 26 },
  { header: "Phone", key: "phone", width: 16 },
  { header: "Shipping Address", key: "address", width: 40 },
  { header: "Courier", key: "courier", width: 18 },
  { header: "Items", key: "items", width: 40 },
  { header: "Subtotal", key: "subtotal", width: 14 },
  { header: "Discount", key: "discount", width: 12 },
  { header: "Shipping Cost", key: "shippingCost", width: 14 },
  { header: "Total", key: "total", width: 14 },
  { header: "Status", key: "status", width: 16 },
] as const;

export type MerchOrderRow = Record<(typeof MERCH_ORDER_COLUMNS)[number]["key"], string | number | Date>;

/** One merch order flattened to the `MERCH_ORDER_COLUMNS` shape. */
export const toMerchOrderRow = (order: MerchOrder): MerchOrderRow => ({
  id: order.id,
  date: new Date(order.createdAt),
  buyerName: order.buyerName,
  email: order.buyerEmail,
  phone: order.buyerPhone,
  address: formatMerchShippingAddress(order),
  courier: order.courierName ?? order.courierCode ?? "",
  items: formatMerchItems(order),
  subtotal: order.subtotalAmount,
  discount: order.discountAmount,
  shippingCost: order.shippingCost,
  total: order.totalAmount,
  status: order.status,
});

/** Adds a "Merch Orders" sheet — one row per order: buyer, shipping address, items, amounts. */
export const addMerchOrdersSheet = (workbook: ExcelJS.Workbook, orders: MerchOrder[]) => {
  const sheet = workbook.addWorksheet("Merch Orders");
  sheet.columns = MERCH_ORDER_COLUMNS.map((column) => ({ ...column }));
  styleHeaderRow(sheet.getRow(1));
  for (const order of orders) sheet.addRow(toMerchOrderRow(order));
  sheet.getColumn("date").numFmt = "yyyy-mm-dd hh:mm";
  for (const key of ["subtotal", "discount", "shippingCost", "total"]) sheet.getColumn(key).numFmt = "#,##0";
};

/**
 * Adds a "Merch Items" sheet — one row per line item (product + variant),
 * so a seller can pivot/sum quantities and revenue per product. Amounts here
 * are line amounts before order-level discount and shipping.
 */
export const addMerchItemsSheet = (workbook: ExcelJS.Workbook, orders: MerchOrder[]) => {
  const sheet = workbook.addWorksheet("Merch Items");
  sheet.columns = [
    { header: "Order ID", key: "orderId", width: 24 },
    { header: "Date", key: "date", width: 18 },
    { header: "Buyer Name", key: "buyerName", width: 22 },
    { header: "Product", key: "product", width: 30 },
    { header: "Variant", key: "variant", width: 18 },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Unit Price", key: "unitPrice", width: 14 },
    { header: "Line Subtotal", key: "lineSubtotal", width: 14 },
    { header: "Order Status", key: "status", width: 16 },
  ];
  styleHeaderRow(sheet.getRow(1));
  for (const order of orders) {
    for (const item of order.items ?? []) {
      sheet.addRow({
        orderId: order.id,
        date: new Date(order.createdAt),
        buyerName: order.buyerName,
        product: item.productName,
        variant: item.variantLabel ?? "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineSubtotal: item.subtotal,
        status: order.status,
      });
    }
  }
  sheet.getColumn("date").numFmt = "yyyy-mm-dd hh:mm";
  for (const key of ["unitPrice", "lineSubtotal"]) sheet.getColumn(key).numFmt = "#,##0";
};

/** Adds a "Ticket Orders" sheet — buyer, event, items, amounts. */
export const addTicketOrdersSheet = (workbook: ExcelJS.Workbook, orders: Order[]) => {
  const sheet = workbook.addWorksheet("Ticket Orders");
  sheet.columns = [
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
  styleHeaderRow(sheet.getRow(1));
  for (const order of orders) {
    sheet.addRow({
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
  sheet.getColumn("date").numFmt = "yyyy-mm-dd hh:mm";
  for (const key of ["subtotal", "discount", "total"]) sheet.getColumn(key).numFmt = "#,##0";
};

/** A new workbook with SiTIKET's report metadata set. */
export const newReportWorkbook = () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SiTIKET";
  workbook.created = new Date();
  return workbook;
};

/** Streams a workbook back as a downloadable `.xlsx` attachment. */
export const xlsxResponse = async (workbook: ExcelJS.Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
};
