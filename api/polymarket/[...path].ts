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
// Vercel routes /api/polymarket/* to this file
export default async (request: Request, context: { params?: { path?: string[] } }) => {
  const url = new URL(request.url);
  
  // Extract the path after /api/polymarket
  // For /api/polymarket/user/0x123/profile, pathname is "/api/polymarket/user/0x123/profile"
  // We need "/user/0x123/profile"
  let pathAfterApi = url.pathname.replace(/^\/api\/polymarket/, '') || '/';
  
  // If path is empty, make it "/"
  if (!pathAfterApi || pathAfterApi === '') {
    pathAfterApi = '/';
  }
  
  // Ensure path starts with "/"
  if (!pathAfterApi.startsWith('/')) {
    pathAfterApi = '/' + pathAfterApi;
  }
  
  // Create new URL with the stripped path
  // Use a dummy base URL since we only care about the path
  const baseUrl = 'https://example.com';
  const newUrl = new URL(pathAfterApi + url.search, baseUrl);
  
  // Create a new request with the correct path
  const newRequest = new Request(newUrl.pathname + newUrl.search, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
  
  return app.fetch(newRequest);
};

