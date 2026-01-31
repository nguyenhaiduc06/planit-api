import { Hono } from "hono";
import {
  authMiddleware,
  requireAuth,
  type AuthVariables,
} from "../middlewares";
import { planService } from "../services";
import {
  listQuerySchema,
  createPlanSchema,
  updatePlanSchema,
  idParamSchema,
} from "../types";
import { validated } from "../lib/validation";
import { NotFoundError } from "../lib/errors";

export const planRoute = new Hono<{ Variables: AuthVariables }>()
  .use(authMiddleware)
  .use(requireAuth);

planRoute.get(
  "/",
  validated("query", listQuerySchema),
  async (c) => {
    const user = c.get("user")!;
    const { page, limit } = c.req.valid("query");

    const { data, total } = await planService.listByUser(user.id, page, limit);

    return c.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
);

planRoute.get(
  "/:id",
  validated("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const planDetails = await planService.getById(id);

    if (!planDetails) {
      throw new NotFoundError("Plan");
    }

    return c.json(planDetails);
  },
);

planRoute.post(
  "/",
  validated("json", createPlanSchema),
  async (c) => {
    const user = c.get("user")!;
    const data = c.req.valid("json");

    const newPlan = await planService.create(data, user.id);
    return c.json(newPlan, 201);
  },
);

planRoute.put(
  "/:id",
  validated("param", idParamSchema),
  validated("json", updatePlanSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");

    const updated = await planService.update(id, data);

    if (!updated) {
      throw new NotFoundError("Plan");
    }

    return c.json(updated);
  },
);

planRoute.delete(
  "/:id",
  validated("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    await planService.delete(id);
    return c.json({ success: true });
  },
);
