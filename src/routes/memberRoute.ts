import { Hono } from "hono";

import { NotFoundError, UnauthorizedError } from "@/lib/errors";
import { validated } from "@/lib/validation";
import {
  authMiddleware,
  planAccessMiddleware,
  requireAuth,
  requireRole,
  type AuthVariables,
} from "@/middlewares";
import { memberService } from "@/services/member";
import { inviteMemberSchema, updateMemberRoleSchema } from "@/types/member";

export const membersRoutes = new Hono<{ Variables: AuthVariables }>()
  .use(authMiddleware)
  .use(requireAuth)
  .use(planAccessMiddleware);

membersRoutes.get("/", async (c) => {
  const plan = c.get("plan");
  const result = await memberService.listByPlan(plan.id);
  return c.json(result);
});

membersRoutes.post(
  "/",
  requireRole("owner"),
  validated("json", inviteMemberSchema),
  async (c) => {
    const plan = c.get("plan");
    const user = c.get("user");
    const data = c.req.valid("json");

    if (!user) {
      throw new UnauthorizedError("Unauthorized");
    }

    const result = await memberService.invite(plan.id, data, user.id);

    if (result.type === "member") {
      return c.json(result.member, 201);
    } else {
      return c.json(result.pending, 202);
    }
  },
);

// Update member role - only owner can change roles
membersRoutes.put(
  "/:userId",
  requireRole("owner"),
  validated("json", updateMemberRoleSchema),
  async (c) => {
    const plan = c.get("plan");
    const { userId } = c.req.param();
    const data = c.req.valid("json");

    const updated = await memberService.updateRole(plan.id, userId, data.role);

    if (!updated) {
      throw new NotFoundError("Member");
    }

    return c.json(updated);
  },
);

// Remove member or leave plan
// - Owner can remove anyone except themselves
// - Members can remove themselves (leave)
membersRoutes.delete("/:userId", async (c) => {
  const plan = c.get("plan");
  const user = c.get("user");
  const { userId } = c.req.param();

  if (!user) {
    throw new UnauthorizedError("Unauthorized");
  }

  await memberService.remove(plan.id, userId, user.id, plan.role);

  return c.json({ success: true });
});

// Cancel a pending invitation - only owner can cancel
membersRoutes.delete("/invitations/:email", requireRole("owner"), async (c) => {
  const plan = c.get("plan");
  const { email } = c.req.param();

  const deleted = await memberService.cancelInvitation(
    plan.id,
    decodeURIComponent(email),
  );

  if (!deleted) {
    throw new NotFoundError("Invitation");
  }

  return c.json({ success: true });
});
