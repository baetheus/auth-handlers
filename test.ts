import { Application, Router } from "https://deno.land/x/oak@v7.5.0/mod.ts";
import { createAuthHandlers, createInMemoryAuthClient } from "./mod.ts";

const client = createInMemoryAuthClient();
const handlers = createAuthHandlers(client);

const app = new Application();

const controller = new AbortController();
const { signal } = controller;

// Add some middleware using `app.use()`

const router = new Router();
router
  .post("/register", handlers.register)
  .post("/login", handlers.login);

// Logging
app.use(async (ctx, next) => {
  const requestId = Math.random().toString(32).slice(2);
  ctx.request.headers.set("X-Request-ID", requestId);
  ctx.response.headers.set("X-Request-ID", requestId);
  console.log(`${ctx.request.method} ${ctx.request.url.pathname} ${requestId}`);
  await next();
  const latency = ctx.response.headers.get("X-Response-Time");
  console.log(`${ctx.request.method} ${ctx.request.url.pathname} ${requestId} ${ctx.response.status} in ${latency}`);
});

// Timing
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

app.use(router.routes());
app.use(router.allowedMethods());

const listenPromise = app.listen({ port: 8000, signal });

await listenPromise;
