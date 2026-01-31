import { createMiddleware } from "hono/factory";
import { auth } from "../lib/auth";
import type { AuthType } from "../lib/auth";
import { UnauthorizedError } from "../lib/errors";

export type AuthVariables = {
  user: AuthType["user"];
  session: AuthType["session"];
};

/**
 * Loads the current session from the request (cookies/headers) and sets
 * `user` and `session` on the context. Does not block unauthenticated requests.
 */
export const authMiddleware = createMiddleware<{
  Variables: AuthVariables;
}>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

/**
 * Requires an authenticated user. Use after authMiddleware.
 * Returns 401 if no user is set on the context.
 */
export const requireAuth = createMiddleware<{
  Variables: AuthVariables;
}>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    throw new UnauthorizedError();
  }
  await next();
});
