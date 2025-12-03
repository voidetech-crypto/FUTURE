// Vercel API Route - handles all /api/polymarket/* requests
import { Hono } from "hono";
import { cors } from "hono/cors";
import polymarketRouter from "./router.js";

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
// The [...path] means Vercel passes the path as a parameter
export default async (request: Request, context?: { params?: { path?: string[] } }) => {
  try {
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
    
    // Create a new request with the modified path
    // Hono needs a full URL, so construct it properly
    const newUrl = new URL(request.url);
    newUrl.pathname = pathAfterApi;
    
    // Create a new request with the modified URL
    const newRequest = new Request(newUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    
    // Call Hono app with the modified request
    const response = await app.fetch(newRequest);
    
    // Always return JSON, even for 404s
    if (response.status === 404) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Route not found: ${pathAfterApi}`,
        debug: {
          originalPath: url.pathname,
          pathAfterApi,
          search: url.search
        }
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return response;
  } catch (error) {
    console.error('[API Route] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

