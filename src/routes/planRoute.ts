import { Hono } from "hono";

import { NotFoundError } from "@/lib/errors";
import { validated } from "@/lib/validation";
import {
  authMiddleware,
  planAccessMiddleware,
  requireAuth,
  requireRole,
  type AuthVariables,
} from "@/middlewares";
import { planService } from "@/services";
import {
  createPlanSchema,
  idParamSchema,
  listQuerySchema,
  updatePlanSchema,
} from "@/types";

export const planRoute = new Hono<{ Variables: AuthVariables }>()
  .use(authMiddleware)
  .use(requireAuth);

planRoute.get("/", validated("query", listQuerySchema), async (c) => {
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
});

planRoute.get(
  "/:id",
  validated("param", idParamSchema),
  planAccessMiddleware,
  async (c) => {
    const plan = c.get("plan");
    const planDetails = await planService.getById(plan.id);

    if (!planDetails) {
      throw new NotFoundError("Plan");
    }

    return c.json({
      ...planDetails,
      role: plan.role,
    });
  },
);

planRoute.post("/", validated("json", createPlanSchema), async (c) => {
  const user = c.get("user")!;
  const data = c.req.valid("json");

  const newPlan = await planService.create(data, user.id);
  return c.json(newPlan, 201);
});

planRoute.put(
  "/:id",
  validated("param", idParamSchema),
  validated("json", updatePlanSchema),
  planAccessMiddleware,
  requireRole("editor"),
  async (c) => {
    const plan = c.get("plan");
    const data = c.req.valid("json");

    const updated = await planService.update(plan.id, data);

    if (!updated) {
      throw new NotFoundError("Plan");
    }

    return c.json({
      ...updated,
      role: plan.role,
    });
  },
);

planRoute.delete(
  "/:id",
  validated("param", idParamSchema),
  planAccessMiddleware,
  requireRole("owner"),
  async (c) => {
    const plan = c.get("plan");
    await planService.delete(plan.id);
    return c.json({ success: true });
  },
);
