import { z } from 'zod';

export type PlanRole = "owner" | "editor" | "viewer";

export interface PlanWithRole {
  id: string;
  title: string;
  description: string | null;
  userId: string;
  role: PlanRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanMember {
  userId: string;
  email: string;
  name: string | null;
  role: PlanRole;
}

export interface PlanNote {
  id: string;
  type: string;
  content: unknown;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanDetails extends PlanWithRole {
  notes: PlanNote[];
  members: PlanMember[];
}

export const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type ListQueryInput = z.infer<typeof listQuerySchema>;

export const idParamSchema = z.object({
  id: z.uuid(),
});

export const createPlanSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500).optional(),
});

export const updatePlanSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

/**
 * Role hierarchy for permission checks.
 * Higher number = more permissions.
 * - owner (3): Full access, can delete plan and manage members
 * - editor (2): Can create/edit notes and plan details
 * - viewer (1): Read-only access
 */
export const roleHierarchy: Record<PlanRole, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

/**
 * Role-specific error messages for permission denials
 */
export const roleErrorMessages: Record<PlanRole, string> = {
  owner: 'Only the owner can perform this action',
  editor: 'Viewers cannot perform this action',
  viewer: 'You need at least viewer access',
};

export * from "@/types/member";
export * from "@/types/note";