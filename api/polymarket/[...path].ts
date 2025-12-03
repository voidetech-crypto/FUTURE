// Vercel API Route - handles all /api/polymarket/* requests
import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/vercel";
import polymarketRouter from "../../src/react-app/api/polymarket";

const app = new Hono();

// CORS middleware
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Mount API routes
app.route("/api/polymarket", polymarketRouter);

// Export as Vercel Edge Function
export const config = {
  runtime: "edge",
};

export default handle(app);

