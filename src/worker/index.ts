import { Hono } from "hono";
import { cors } from "hono/cors";
import polymarketRouter from "./api/polymarket";

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Health check
app.get("/", (c) => {
  return c.json({ message: "PolyTerminal API is running" });
});

// Mount API routes
app.route("/api/polymarket", polymarketRouter);

export default app;
