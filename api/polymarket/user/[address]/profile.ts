// Direct route for /api/polymarket/user/:address/profile
import { Hono } from "hono";
import { cors } from "hono/cors";
import polymarketRouter from "../../router.js";

const app = new Hono();

// CORS middleware
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Mount the router
app.route("/", polymarketRouter);

export const config = {
  runtime: "edge",
};

export default async (request: Request) => {
  try {
    const url = new URL(request.url);
    
    // Extract path after /api/polymarket
    // Request comes as /api/polymarket/user/0x123/profile
    // We need /user/0x123/profile
    let pathAfterApi = url.pathname.replace(/^\/api\/polymarket/, '') || '/';
    
    if (!pathAfterApi || pathAfterApi === '') {
      pathAfterApi = '/';
    }
    
    if (!pathAfterApi.startsWith('/')) {
      pathAfterApi = '/' + pathAfterApi;
    }
    
    // Create new request with modified path
    const newUrl = new URL(request.url);
    newUrl.pathname = pathAfterApi;
    
    const newRequest = new Request(newUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    
    const response = await app.fetch(newRequest);
    
    if (response.status === 404) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Route not found: ${pathAfterApi}`,
        debug: {
          originalPath: url.pathname,
          pathAfterApi
        }
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return response;
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

