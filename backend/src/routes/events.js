import { Router } from "express";

export const eventRouter = Router();

// Replace with a controller and database query when the backend is connected.
eventRouter.get("/", (_request, response) => response.json({ data: [] }));
eventRouter.get("/:slug", (request, response) => response.status(501).json({ message: `Event ${request.params.slug} is not connected yet` }));
