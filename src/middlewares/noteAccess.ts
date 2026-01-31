import type { Context, Next } from "hono";

import {
  ConfigurationError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";
import { noteService } from "@/services/note";
import { planService } from "@/services/plan";
import type { PlanRole } from "@/types";

export interface NoteContext {
  id: string;
  planId: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    note: NoteContext;
  }
}

/**
 * Middleware for routes with :id param (GET /notes/:id, PUT /notes/:id, DELETE /notes/:id)
 * Looks up the note, checks user has access to the note's plan, and attaches context.
 */
export async function noteAccessMiddleware(c: Context, next: Next) {
  const noteId = c.req.param('id');
  const user = c.get('user');

  if (!noteId) {
    throw new ConfigurationError('noteAccessMiddleware requires :id route parameter');
  }

  const note = await noteService.getNoteWithPlan(noteId);

  if (!note) {
    throw new NotFoundError('Note');
  }

  const { exists, role } = await planService.getUserRole(note.planId, user.id);

  if (!exists) {
    throw new NotFoundError('Plan');
  }

  if (!role) {
    throw new ForbiddenError("You don't have access to this note");
  }

  c.set('note', { id: noteId, planId: note.planId });
  c.set('plan', { id: note.planId, role });

  await next();
}

/**
 * Middleware for routes with :planId param (GET /notes/plan/:planId)
 * Checks user has access to the plan and attaches plan context.
 */
export async function planNotesAccessMiddleware(c: Context, next: Next) {
  const planId = c.req.param('planId');
  const user = c.get('user');

  if (!planId) {
    throw new ConfigurationError('planNotesAccessMiddleware requires :planId route parameter');
  }

  // Check user has access to the plan
  const { exists, role } = await planService.getUserRole(planId, user.id);

  if (!exists) {
    throw new NotFoundError('Plan');
  }

  if (!role) {
    throw new ForbiddenError("You don't have access to this plan");
  }

  // Attach plan context
  c.set('plan', { id: planId, role });

  await next();
}

/**
 * Helper to check plan access for POST /notes (planId comes from request body)
 * Returns the user's role for the plan, or throws appropriate errors.
 */
export async function checkPlanAccess(
  planId: string,
  userId: string
): Promise<PlanRole> {
  const { exists, role } = await planService.getUserRole(planId, userId);

  if (!exists) {
    throw new NotFoundError('Plan');
  }

  if (!role) {
    throw new ForbiddenError("You don't have access to this plan");
  }

  return role;
}
