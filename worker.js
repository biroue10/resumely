const ALLOWED_ORIGINS = ["https://applycraft.io", "http://localhost:5173"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/ai") {
      const origin = request.headers.get("Origin") || "";
      const corsHeaders = ALLOWED_ORIGINS.includes(origin)
        ? { "Access-Control-Allow-Origin": origin }
        : {};

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            ...corsHeaders,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
          },
        });
      }

      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      if (!ALLOWED_ORIGINS.includes(origin)) {
        return new Response("Forbidden", { status: 403 });
      }

      const apiKey = env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "AI not configured" }), {
          status: 503,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const body = await request.text();
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body,
      });

      const responseText = await upstream.text();
      return new Response(responseText, {
        status: upstream.status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
