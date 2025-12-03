// Vercel API Route - handles all /api/polymarket/* requests
import { Hono } from "hono";
import { cors } from "hono/cors";
import polymarketRouter from "../../src/worker/api/polymarket";

const app = new Hono();

// CORS middleware
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Mount API routes at root since Vercel already handles /api/polymarket prefix
app.route("/", polymarketRouter);

// Export as Vercel Edge Function
export const runtime = "edge";

export default app;

