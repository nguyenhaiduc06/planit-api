import type { Context, Next } from "hono";

import {
  ConfigurationError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";
import { planService } from "@/services/plan";
import { roleErrorMessages, roleHierarchy, type PlanRole } from "@/types";

// Plan context attached after planAccessMiddleware runs
export interface PlanContext {
  id: string;
  role: PlanRole;
}

// Extend Hono context with plan variable
declare module 'hono' {
  interface ContextVariableMap {
    plan: PlanContext;
  }
}

/**
 * Middleware that checks if the authenticated user has access to a plan.
 * Expects :id param in route and user to be authenticated.
 * Attaches plan context with role to request.
 */
export async function planAccessMiddleware(c: Context, next: Next) {
  const planId = c.req.param('id');
  const user = c.get('user');

  if (!planId) {
    throw new ConfigurationError('planAccessMiddleware requires :id route parameter');
  }

  const { exists, role } = await planService.getUserRole(planId, user.id);

  if (!exists) {
    throw new NotFoundError('Plan');
  }

  if (!role) {
    throw new ForbiddenError("You don't have access to this plan");
  }

  // Attach plan context for use in route handlers
  c.set('plan', { id: planId, role });

  await next();
}

/**
 * Middleware factory that checks if user has at least the minimum required role.
 * Must be used after planAccessMiddleware.
 */
export function requireRole(minRole: PlanRole) {
  return async (c: Context, next: Next) => {
    const plan = c.get('plan');

    if (!plan) {
      throw new ConfigurationError('requireRole must be used after planAccessMiddleware');
    }

    if (roleHierarchy[plan.role] < roleHierarchy[minRole]) {
      throw new ForbiddenError(roleErrorMessages[minRole]);
    }

    await next();
  };
}
