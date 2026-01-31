import { Hono } from "hono";
import {
  createNoteSchema,
  updateNoteSchema,
  idParamSchema,
  listQuerySchema,
} from "../types";
import { noteService } from "../services/note";
import { NotFoundError } from "../lib/errors";
import { validated } from "../lib/validation";
import {
  authMiddleware,
  AuthVariables,
  requireAuth,
} from "../middlewares/authMiddleware";

export const noteRoute = new Hono<{ Variables: AuthVariables }>()
  .use(authMiddleware)
  .use(requireAuth);

noteRoute.get(
  "/plan/:planId",
  validated("query", listQuerySchema),
  async (c) => {
    const planId = c.req.param("planId");
    const { type } = c.req.valid("query");

    const notes = await noteService.listByPlan(planId, type);

    return c.json({ data: notes });
  },
);

noteRoute.get("/:id", validated("param", idParamSchema), async (c) => {
  const { id } = c.req.valid("param");
  const note = await noteService.getById(id);

  if (!note) {
    throw new NotFoundError("Note");
  }

  return c.json(note);
});

noteRoute.post("/", validated("json", createNoteSchema), async (c) => {
  const user = c.get("user")!;
  const data = c.req.valid("json");

  const newNote = await noteService.create(data, user.id);
  return c.json(newNote, 201);
});

noteRoute.put(
  "/:id",
  validated("param", idParamSchema),
  validated("json", updateNoteSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");

    const updated = await noteService.update(id, data);

    if (!updated) {
      throw new NotFoundError("Note");
    }

    return c.json(updated);
  },
);

noteRoute.delete("/:id", validated("param", idParamSchema), async (c) => {
  const { id } = c.req.valid("param");
  await noteService.delete(id);

  return c.json({ success: true });
});
