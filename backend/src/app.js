import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { adminApplicationRouter } from "./routes/admin-applications.js";
import { authRouter } from "./routes/auth.js";
import { bankAccountRouter } from "./routes/bank-accounts.js";
import { checkInRouter } from "./routes/check-ins.js";
import { eventCategoryRouter } from "./routes/event-categories.js";
import { eventImageRouter } from "./routes/event-images.js";
import { eventOrderRouter } from "./routes/event-orders.js";
import { eventStaffRouter } from "./routes/event-staff.js";
import { eventRouter } from "./routes/events.js";
import { orderPaymentNestedRouter } from "./routes/order-payments-nested.js";
import { orderPaymentRouter } from "./routes/order-payments.js";
import { orderRefundRequestRouter } from "./routes/order-refund-requests.js";
import { orderTicketRouter } from "./routes/order-tickets.js";
import { orderRouter } from "./routes/orders.js";
import { promoCodeRouter } from "./routes/promo-codes.js";
import { refundRequestRouter } from "./routes/refund-requests.js";
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

app.use("/api/events/:eventId/images", eventImageRouter);
app.use("/api/events/:eventId/staff", eventStaffRouter);
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

app.use(notFoundHandler);
app.use(errorHandler);
