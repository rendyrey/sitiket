import cors from "cors";
import express from "express";
import { eventRouter } from "./routes/events.js";
import { orderRouter } from "./routes/orders.js";

export const app = express();

app.use(cors());
app.use(express.json());
app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
app.use("/api/events", eventRouter);
app.use("/api/orders", orderRouter);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: "Something went wrong" });
});
