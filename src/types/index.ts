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

import { z } from 'zod';

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