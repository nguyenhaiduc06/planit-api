import { Hono } from "hono";
import { logger } from 'hono/logger'


import { auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { planRoute, noteRoute, membersRoutes } from "@/routes";

const app = new Hono()

app.use(logger())

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(
      { code: err.code, message: err.message, details: err.details },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500
    )
  }
  return c.json(
    { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    500
  )
})

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))

app.route('/plans', planRoute);
app.route('/notes', noteRoute);
app.route('/plans/:id/members', membersRoutes);

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app