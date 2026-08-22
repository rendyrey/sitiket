import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { adminApplicationRouter } from "./routes/admin-applications.js";
import { authRouter } from "./routes/auth.js";
import { bankAccountRouter } from "./routes/bank-accounts.js";
import { checkInRouter } from "./routes/check-ins.js";
import { eventAttendanceRouter } from "./routes/event-attendance.js";
import { eventCategoryRouter } from "./routes/event-categories.js";
import { eventImageRouter } from "./routes/event-images.js";
import { eventOrderRouter } from "./routes/event-orders.js";
import { eventStaffRouter } from "./routes/event-staff.js";
import { eventRouter } from "./routes/events.js";
import { merchCategoryRouter } from "./routes/merch-categories.js";
import { merchOrderPaymentNestedRouter } from "./routes/merch-order-payments-nested.js";
import { merchOrderPaymentRouter } from "./routes/merch-order-payments.js";
import { merchOrderRouter } from "./routes/merch-orders.js";
import { merchRouter } from "./routes/merch.js";
import { onsiteSalesRouter } from "./routes/onsite-sales.js";
import { staffInvitationsRouter } from "./routes/staff-invitations.js";
import { notificationRouter } from "./routes/notifications.js";
import { orderPaymentNestedRouter } from "./routes/order-payments-nested.js";
import { productRouter } from "./routes/products.js";
import { orderPaymentRouter } from "./routes/order-payments.js";
import { orderRefundRequestRouter } from "./routes/order-refund-requests.js";
import { orderTicketRouter } from "./routes/order-tickets.js";
import { orderRouter } from "./routes/orders.js";
import { promoCodeRouter } from "./routes/promo-codes.js";
import { qrisConfigRouter } from "./routes/qris-config.js";
import { emailConfigRouter } from "./routes/email-config.js";
import { refundRequestRouter } from "./routes/refund-requests.js";
import { regionRouter } from "./routes/regions.js";
import { shippingOriginRouter } from "./routes/shipping-origin.js";
import { shippingRouter } from "./routes/shipping.js";
import { ticketCategoryRouter } from "./routes/ticket-categories.js";
import { ticketTypeRouter } from "./routes/ticket-types.js";
import { ticketRouter } from "./routes/tickets.js";
import { userRouter } from "./routes/users.js";

export const app = express();
// Trust exactly one reverse proxy: Nginx
app.set('trust proxy', 1);

app.use(cors({ origin: env.FRONTEND_URL }));

app.use(express.json());
app.use("/uploads", express.static(env.UPLOAD_DIR));

app.get("/api/health", (_request, response) => response.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/admin-applications", adminApplicationRouter);
app.use("/api/event-categories", eventCategoryRouter);
app.use("/api/ticket-categories", ticketCategoryRouter);
app.use("/api/bank-accounts", bankAccountRouter);
app.use("/api/qris-config", qrisConfigRouter);
app.use("/api/email-config", emailConfigRouter);

app.use("/api/events/:eventId/attendance", eventAttendanceRouter);
app.use("/api/events/:eventId/onsite-sales", onsiteSalesRouter);
app.use("/api/events/:eventId/images", eventImageRouter);
app.use("/api/events/:eventId/staff", eventStaffRouter);
app.use("/api/staff-invitations", staffInvitationsRouter);
app.use("/api/events/:eventId/ticket-types", ticketTypeRouter);
app.use("/api/events/:eventId/promo-codes", promoCodeRouter);
app.use("/api/events/:eventId/orders", eventOrderRouter);
app.use("/api/events", eventRouter);

app.use("/api/orders/:orderId/payments", orderPaymentNestedRouter);
app.use("/api/orders/:orderId/tickets", orderTicketRouter);
app.use("/api/orders/:orderId/refund-requests", orderRefundRequestRouter);
app.use("/api/orders", orderRouter);

app.use("/api/order-payments", orderPaymentRouter);
app.use("/api/refund-requests", refundRequestRouter);
app.use("/api/tickets", ticketRouter);
app.use("/api/check-ins", checkInRouter);

app.use("/api/regions", regionRouter);
app.use("/api/shipping", shippingRouter);
app.use("/api/shipping-origin", shippingOriginRouter);

app.use("/api/merch-categories", merchCategoryRouter);
app.use("/api/products", productRouter);
app.use("/api/merch", merchRouter);
app.use("/api/merch-orders/:orderId/payments", merchOrderPaymentNestedRouter);
app.use("/api/merch-orders", merchOrderRouter);
app.use("/api/merch-order-payments", merchOrderPaymentRouter);
app.use("/api/notifications", notificationRouter);

app.use(notFoundHandler);
app.use(errorHandler);
