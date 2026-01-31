import { and, count, eq } from "drizzle-orm";

import { db, pendingInvitationTable, planMemberTable, userTable } from "@/db";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  QuotaExceededError,
} from "@/lib/errors";
import type {
  InviteMemberInput,
  InviteResult,
  InviteRole,
  Member,
  MemberRole,
  MembersWithInvitations,
  PendingInvitation,
  PlanRole,
} from "@/types";


export const memberService = {
  /**
   * List all members and pending invitations for a plan
   */
  async listByPlan(planId: string): Promise<MembersWithInvitations> {
    // Get all members with user info
    const members = await db
      .select({
        userId: planMemberTable.userId,
        email: userTable.email,
        name: userTable.name,
        role: planMemberTable.role,
        joinedAt: planMemberTable.createdAt,
      })
      .from(planMemberTable)
      .innerJoin(userTable, eq(userTable.id, planMemberTable.userId))
      .where(eq(planMemberTable.planId, planId));

    // Get pending invitations
    const pending = await db
      .select({
        email: pendingInvitationTable.email,
        role: pendingInvitationTable.role,
        invitedAt: pendingInvitationTable.createdAt,
      })
      .from(pendingInvitationTable)
      .where(eq(pendingInvitationTable.planId, planId));

    return {
      members: members as Member[],
      pendingInvitations: pending as PendingInvitation[],
    };
  },

  /**
   * Invite a user to a plan by email
   * - If user exists: add them as a member
   * - If user doesn't exist: create pending invitation
   */
  async invite(
    planId: string,
    data: InviteMemberInput,
    invitedBy: string
  ): Promise<InviteResult> {
    // Check quota - max 20 members per plan
    const memberCount = await this.countMembers(planId);
    if (memberCount >= 20) {
      throw new QuotaExceededError('members', 20, memberCount);
    }

    // Check if user exists by email
    const [existingUser] = await db
      .select({ id: userTable.id, email: userTable.email, name: userTable.name })
      .from(userTable)
      .where(eq(userTable.email, data.email))
      .limit(1);

    if (existingUser) {
      // Check if already a member
      const [existingMember] = await db
        .select()
        .from(planMemberTable)
        .where(and(
          eq(planMemberTable.planId, planId),
          eq(planMemberTable.userId, existingUser.id)
        ))
        .limit(1);

      if (existingMember) {
        throw new ConflictError('User is already a member of this plan');
      }

      // Add as member
      const [newMember] = await db
        .insert(planMemberTable)
        .values({
          planId,
          userId: existingUser.id,
          role: data.role,
        })
        .returning();

      return {
        type: 'member',
        member: {
          userId: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          role: data.role,
          joinedAt: newMember.createdAt,
        },
      };
    } else {
      // Check if already invited
      const [existingInvite] = await db
        .select()
        .from(pendingInvitationTable)
        .where(and(
          eq(pendingInvitationTable.planId, planId),
          eq(pendingInvitationTable.email, data.email)
        ))
        .limit(1);

      if (existingInvite) {
        throw new ConflictError('User has already been invited');
      }

      // Create pending invitation
      await db
        .insert(pendingInvitationTable)
        .values({
          planId,
          email: data.email,
          role: data.role,
          invitedBy,
        });

      return {
        type: 'pending',
        pending: {
          status: 'pending',
          email: data.email,
          role: data.role,
          message: 'Invitation will be activated when user signs up',
        },
      };
    }
  },

  /**
   * Update a member's role
   */
  async updateRole(
    planId: string,
    targetUserId: string,
    newRole: InviteRole
  ): Promise<Member | null> {
    // Check if member exists and get current role
    const [member] = await db
      .select({
        userId: planMemberTable.userId,
        role: planMemberTable.role,
      })
      .from(planMemberTable)
      .where(and(
        eq(planMemberTable.planId, planId),
        eq(planMemberTable.userId, targetUserId)
      ))
      .limit(1);

    if (!member) {
      return null;
    }

    // Cannot change owner's role
    if (member.role === 'owner') {
      throw new ForbiddenError("Cannot change the owner's role");
    }

    // Update the role
    await db
      .update(planMemberTable)
      .set({ role: newRole })
      .where(and(
        eq(planMemberTable.planId, planId),
        eq(planMemberTable.userId, targetUserId)
      ));

    // Get updated member with user info
    const [updated] = await db
      .select({
        userId: planMemberTable.userId,
        email: userTable.email,
        name: userTable.name,
        role: planMemberTable.role,
        joinedAt: planMemberTable.createdAt,
      })
      .from(planMemberTable)
      .innerJoin(userTable, eq(userTable.id, planMemberTable.userId))
      .where(and(
        eq(planMemberTable.planId, planId),
        eq(planMemberTable.userId, targetUserId)
      ))
      .limit(1);

    return updated as Member;
  },

  /**
   * Remove a member from a plan
   * - Owner can remove anyone except themselves
   * - Members can remove themselves (leave)
   */
  async remove(
    planId: string,
    targetUserId: string,
    requestingUserId: string,
    requestingUserRole: PlanRole
  ): Promise<boolean> {
    // Get the target member
    const [member] = await db
      .select({ role: planMemberTable.role })
      .from(planMemberTable)
      .where(and(
        eq(planMemberTable.planId, planId),
        eq(planMemberTable.userId, targetUserId)
      ))
      .limit(1);

    if (!member) {
      throw new NotFoundError('Member');
    }

    // Cannot remove the owner
    if (member.role === 'owner') {
      throw new ForbiddenError('Owner cannot leave the plan');
    }

    // Check permissions
    const isSelf = targetUserId === requestingUserId;
    const isOwner = requestingUserRole === 'owner';

    if (!isSelf && !isOwner) {
      throw new ForbiddenError('Only the owner can remove members');
    }

    // Remove the member
    const result = await db
      .delete(planMemberTable)
      .where(and(
        eq(planMemberTable.planId, planId),
        eq(planMemberTable.userId, targetUserId)
      ))
      .returning({ id: planMemberTable.id });

    return result.length > 0;
  },

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(planId: string, email: string): Promise<boolean> {
    const result = await db
      .delete(pendingInvitationTable)
      .where(and(
        eq(pendingInvitationTable.planId, planId),
        eq(pendingInvitationTable.email, email)
      ))
      .returning({ id: pendingInvitationTable.id });

    return result.length > 0;
  },

  /**
   * Count members in a plan (for quota)
   */
  async countMembers(planId: string): Promise<number> {
    const [{ value }] = await db
      .select({ value: count() })
      .from(planMemberTable)
      .where(eq(planMemberTable.planId, planId));

    return Number(value);
  },

  /**
   * Process pending invitations when a user signs up.
   * Converts all pending invitations for the email into actual memberships.
   * Called from auth signup hook.
   */
  async processPendingInvitations(userId: string, email: string): Promise<number> {
    // Find all pending invitations for this email
    const invitations = await db
      .select()
      .from(pendingInvitationTable)
      .where(eq(pendingInvitationTable.email, email));

    if (invitations.length === 0) {
      return 0;
    }

    // Process all invitations in a transaction for data consistency
    let processed = 0;

    await db.transaction(async (tx) => {
      for (const invitation of invitations) {
        // Add user as member
        await tx
          .insert(planMemberTable)
          .values({
            planId: invitation.planId,
            userId,
            role: invitation.role,
          })
          .onConflictDoNothing(); // In case they're already a member somehow

        // Delete the pending invitation
        await tx
          .delete(pendingInvitationTable)
          .where(eq(pendingInvitationTable.id, invitation.id));

        processed++;
      }
    });

    return processed;
  },
};
