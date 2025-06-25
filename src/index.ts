import * as register from './api/register';

export default {
  async fetch(request: Request, env, ctx) {
    const url = new URL(request.url);
    // Route: POST /api/register
    if (url.pathname === "/api/register" && request.method === "POST") {
      return register.onRequestPost({ request });
    }
    // ...route khác sau này
    return new Response("Not found", { status: 404 });
  },
};
