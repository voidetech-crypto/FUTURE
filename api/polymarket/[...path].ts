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
// The [...path] catch-all means the full path is in the URL
export default async (request: Request) => {
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
    
    // Create a new request URL with just the path after /api/polymarket
    // Use the original request URL as base but modify the pathname
    const newUrl = new URL(request.url);
    newUrl.pathname = pathAfterApi;
    
    // Create a new request with the modified URL
    const newRequest = new Request(newUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    
    const response = await app.fetch(newRequest);
    
    // If we get a 404, it means the route wasn't found
    // Log for debugging
    if (response.status === 404) {
      console.error('[API Route] 404 for path:', pathAfterApi, 'Original:', url.pathname);
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

