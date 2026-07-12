import { Router } from "express";

export const orderRouter = Router();

// This is intentionally a surface-only endpoint. Add validation, persistence,
// inventory locking, and a payment gateway before accepting real orders.
orderRouter.post("/", (_request, response) => response.status(501).json({ message: "Checkout API is not connected yet" }));
