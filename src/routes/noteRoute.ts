import { Hono } from "hono";

import { NotFoundError } from "@/lib/errors";
import { validated } from "@/lib/validation";
import {
  authMiddleware,
  noteAccessMiddleware,
  planNotesAccessMiddleware,
  requireAuth,
  requireRole,
  type AuthVariables,
} from "@/middlewares";
import { noteService } from "@/services/note";
import {
  createNoteSchema,
  idParamSchema,
  listQuerySchema,
  updateNoteSchema,
} from "@/types";

export const noteRoute = new Hono<{ Variables: AuthVariables }>()
  .use(authMiddleware)
  .use(requireAuth);

noteRoute.get(
  "/plan/:planId",
  validated("query", listQuerySchema),
  planNotesAccessMiddleware,
  async (c) => {
    const plan = c.get("plan");
    const { type } = c.req.valid("query");

    const notes = await noteService.listByPlan(plan.id, type);

    return c.json({ data: notes });
  },
);

noteRoute.get("/:id", validated("param", idParamSchema), noteAccessMiddleware, async (c) => {
  const note = c.get("note");
  const noteDetails = await noteService.getById(note.id);

  if (!noteDetails) {
    throw new NotFoundError("Note");
  }

  return c.json(noteDetails);
});

noteRoute.post("/", validated("json", createNoteSchema), async (c) => {
  const user = c.get("user")!;
  const data = c.req.valid("json");

  // TODO: Check if user has access to the plan

  const newNote = await noteService.create(data, user.id);
  return c.json(newNote, 201);
});

noteRoute.put(
  "/:id",
  validated("param", idParamSchema),
  validated("json", updateNoteSchema),
  noteAccessMiddleware,
  requireRole("editor"),
  async (c) => {
    const note = c.get("note");
    const data = c.req.valid("json");

    const updated = await noteService.update(note.id, data);

    if (!updated) {
      throw new NotFoundError("Note");
    }

    return c.json(updated);
  },
);

noteRoute.delete("/:id", validated("param", idParamSchema), noteAccessMiddleware, requireRole("editor"), async (c) => {
  const note = c.get("note");

  await noteService.delete(note.id);

  return c.json({ success: true });
});
