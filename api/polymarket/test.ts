// Simple test route to verify Edge Functions are working
export const config = {
  runtime: "edge",
};

export default async (request: Request) => {
  return new Response(JSON.stringify({ 
    success: true, 
    message: "Test route works!",
    path: new URL(request.url).pathname
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

