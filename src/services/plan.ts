import { and, count, desc, eq, or, sql } from "drizzle-orm";

import { db, noteTable, planMemberTable, planTable, userTable } from "@/db";
import type {
  CreatePlanInput,
  PlanDetails,
  PlanMember,
  PlanNote,
  PlanRole,
  PlanWithRole,
  UpdatePlanInput,
} from "@/types";

export const planService = {
  /**
   * List all plans where user is owner OR member, with pagination
   */
  async listByUser(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: PlanWithRole[]; total: number }> {
    const offset = (page - 1) * limit;

    // Get plans where user is owner or member
    const plansWithRole = await db
      .select({
        id: planTable.id,
        title: planTable.title,
        description: planTable.description,
        userId: planTable.userId,
        createdAt: planTable.createdAt,
        updatedAt: planTable.updatedAt,
        role: sql<PlanRole>`
          CASE 
            WHEN ${planTable.userId} = ${userId} THEN 'owner'
            ELSE ${planMemberTable.role}
          END
        `.as('role'),
      })
      .from(planTable)
      .leftJoin(planMemberTable, and(
        eq(planMemberTable.planId, planTable.id),
        eq(planMemberTable.userId, userId)
      ))
      .where(
        or(
          eq(planTable.userId, userId),
          eq(planMemberTable.userId, userId)
        )
      )
      .orderBy(desc(planTable.updatedAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(planTable)
      .leftJoin(planMemberTable, and(
        eq(planMemberTable.planId, planTable.id),
        eq(planMemberTable.userId, userId)
      ))
      .where(
        or(
          eq(planTable.userId, userId),
          eq(planMemberTable.userId, userId)
        )
      );

    return {
      data: plansWithRole as PlanWithRole[],
      total: Number(total),
    };
  },

  /**
   * Get a single plan with all its notes and members
   */
  async getById(planId: string): Promise<PlanDetails | null> {
    // Get the plan
    const [plan] = await db
      .select()
      .from(planTable)
      .where(eq(planTable.id, planId))
      .limit(1);

    if (!plan) {
      return null;
    }

    // Get all notes for this plan
    const planNotes = await db
      .select({
        id: noteTable.id,
        type: noteTable.type,
        content: noteTable.content,
        userId: noteTable.userId,
        createdAt: noteTable.createdAt,
        updatedAt: noteTable.updatedAt,
      })
      .from(noteTable)
      .where(eq(noteTable.planId, planId))
      .orderBy(desc(noteTable.createdAt));

    // Get all members (including owner)
    const members = await db
      .select({
        userId: planMemberTable.userId,
        email: userTable.email,
        name: userTable.name,
        role: planMemberTable.role,
      })
      .from(planMemberTable)
      .innerJoin(userTable, eq(userTable.id, planMemberTable.userId))
      .where(eq(planMemberTable.planId, planId));

    // The owner's role comes from the plan itself, not plan_members
    // We'll set the role when returning based on who's requesting
    return {
      id: plan.id,
      title: plan.title,
      description: plan.description,
      userId: plan.userId,
      role: 'owner', // Will be overwritten by caller with actual role
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      notes: planNotes as PlanNote[],
      members: members as PlanMember[],
    };
  },

  /**
   * Create a new plan and add the creator as owner in plan_members
   */
  async create(data: CreatePlanInput, userId: string): Promise<PlanWithRole> {
    // Insert the plan
    const [planData] = await db
      .insert(planTable)
      .values({
        userId,
        title: data.title,
        description: data.description ?? null,
      })
      .returning();

    // Add creator as owner in plan_members
    await db
      .insert(planMemberTable)
      .values({
        planId: planData.id,
        userId,
        role: 'owner',
      });

    return {
      id: planData.id,
      title: planData.title,
      description: planData.description,
      userId: planData.userId,
      role: 'owner',
      createdAt: planData.createdAt,
      updatedAt: planData.updatedAt,
    };
  },

  /**
   * Update a plan's title and/or description
   */
  async update(planId: string, data: UpdatePlanInput): Promise<PlanWithRole | null> {
    const [updated] = await db
      .update(planTable)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        updatedAt: new Date(),
      })
      .where(eq(planTable.id, planId))
      .returning();

    if (!updated) {
      return null;
    }

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      userId: updated.userId,
      role: 'owner', // Will be set correctly by caller
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  },

  /**
   * Delete a plan (cascades to notes and members via FK constraints)
   */
  async delete(planId: string): Promise<boolean> {
    const result = await db
      .delete(planTable)
      .where(eq(planTable.id, planId))
      .returning({ id: planTable.id });

    return result.length > 0;
  },

  /**
   * Count plans owned by a user (for quota enforcement)
   */
  async countByUser(userId: string): Promise<number> {
    const [{ value }] = await db
      .select({ value: count() })
      .from(planTable)
      .where(eq(planTable.userId, userId));

    return Number(value);
  },

  /**
   * Get user's role for a plan
   * Returns null if plan doesn't exist or user has no access
   */
  async getUserRole(planId: string, userId: string): Promise<{ exists: boolean; role: PlanRole | null }> {
    // Check if plan exists
    const [planData] = await db
      .select({ userId: planTable.userId })
      .from(planTable)
      .where(eq(planTable.id, planId))
      .limit(1);

    if (!planData) {
      return { exists: false, role: null };
    }

    // If user is the owner
    if (planData.userId === userId) {
      return { exists: true, role: 'owner' };
    }

    // Check if user is a member
    const [member] = await db
      .select({ role: planMemberTable.role })
      .from(planMemberTable)
      .where(and(
        eq(planMemberTable.planId, planId),
        eq(planMemberTable.userId, userId)
      ))
      .limit(1);

    if (member) {
      return { exists: true, role: member.role as PlanRole };
    }

    // Plan exists but user has no access
    return { exists: true, role: null };
  },
};
