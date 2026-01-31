import { z } from 'zod';

// ============================================
// Member Role
// ============================================

export const memberRoleSchema = z.enum(['owner', 'editor', 'viewer']);
export const inviteRoleSchema = z.enum(['editor', 'viewer']); // owner cannot be assigned via invite

// ============================================
// Invite Member Schema
// ============================================

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: inviteRoleSchema,
});

// ============================================
// Update Member Schema
// ============================================

export const updateMemberRoleSchema = z.object({
  role: inviteRoleSchema,
});

// ============================================
// Types
// ============================================

export type MemberRole = z.infer<typeof memberRoleSchema>;
export type InviteRole = z.infer<typeof inviteRoleSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;


export interface Member {
    userId: string;
    email: string;
    name: string | null;
    role: MemberRole;
    joinedAt: Date;
  }
  
  export interface PendingInvitation {
    email: string;
    role: InviteRole;
    invitedAt: Date;
  }
  
  export interface MembersWithInvitations {
    members: Member[];
    pendingInvitations: PendingInvitation[];
  }
  
  export interface InviteResult {
    type: 'member' | 'pending';
    member?: Member;
    pending?: {
      status: 'pending';
      email: string;
      role: string;
      message: string;
    };
  }