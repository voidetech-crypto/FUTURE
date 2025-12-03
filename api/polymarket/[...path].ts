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

// Mount API routes - the path after /api/polymarket is passed directly
app.route("/", polymarketRouter);

// Export as Vercel Edge Function
export const config = {
  runtime: "edge",
};

// Vercel Edge Function export
// Vercel passes the request with the path already stripped of /api/polymarket
export default async (request: Request) => {
  // Create a new request with the path relative to /api/polymarket
  const url = new URL(request.url);
  const pathAfterApi = url.pathname.replace(/^\/api\/polymarket/, '') || '/';
  const newUrl = new URL(pathAfterApi + url.search, url.origin);
  const newRequest = new Request(newUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
  
  return app.fetch(newRequest);
};

