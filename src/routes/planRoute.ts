import { Hono } from "hono";
import { authMiddleware, requireAuth, type AuthVariables } from "../middlewares";
import { planService } from "../services";

export const planRoute = new Hono<{ Variables: AuthVariables }>()
  .use(authMiddleware)
  .use(requireAuth);

planRoute.get("/", async (c) => {
  const user = c.get("user")!;
  const page = Number(c.req.query("page")) || 1;
  const limit = Number(c.req.query("limit")) || 20;

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

planRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const planDetails = await planService.getById(id);

  if (!planDetails) {
    return c.json({ error: "Plan not found" }, 404);
  }

  return c.json(planDetails);
});

planRoute.post("/", async (c) => {
  const user = c.get("user")!;
  const data = await c.req.json();

  const newPlan = await planService.create(data, user.id);
  return c.json(newPlan, 201);
});

planRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const data = await c.req.json();

  const updated = await planService.update(id, data);

  if (!updated) {
    return c.json({ error: "Plan not found" }, 404);
  }

  return c.json(updated);
});

planRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await planService.delete(id);
  return c.json({ success: true });
});
