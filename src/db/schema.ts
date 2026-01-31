import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// -----------------------------------------------------------------------------
// Plan
// -----------------------------------------------------------------------------

export const plan = pgTable(
  "plan",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_plan_user_id").on(table.userId),
    index("idx_plan_created_at").on(table.createdAt),
  ]
);

// -----------------------------------------------------------------------------
// Note
// -----------------------------------------------------------------------------

export const noteTypeEnum = ["text", "todo", "calendar", "location"] as const;

export const note = pgTable(
  "note",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type", { enum: noteTypeEnum }).notNull(),
    content: jsonb("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_note_plan_id").on(table.planId),
    index("idx_note_user_id").on(table.userId),
    index("idx_note_type").on(table.type),
  ]
);

// -----------------------------------------------------------------------------
// Plan member
// -----------------------------------------------------------------------------

export const planMemberRoleEnum = ["owner", "editor", "viewer"] as const;

export const planMember = pgTable(
  "plan_member",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: planMemberRoleEnum }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_plan_member_unique").on(table.planId, table.userId),
  ]
);

// -----------------------------------------------------------------------------
// Pending invitation
// -----------------------------------------------------------------------------

export const pendingInvitationRoleEnum = ["editor", "viewer"] as const;

export const pendingInvitation = pgTable(
  "pending_invitation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: pendingInvitationRoleEnum }).notNull(),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_pending_invitation_unique").on(table.planId, table.email),
    index("idx_pending_invitation_email").on(table.email),
  ]
);

// -----------------------------------------------------------------------------
// Relations
// -----------------------------------------------------------------------------

export const planRelations = relations(plan, ({ one, many }) => ({
  user: one(user, {
    fields: [plan.userId],
    references: [user.id],
  }),
  notes: many(note),
  planMembers: many(planMember),
  pendingInvitations: many(pendingInvitation),
}));

export const noteRelations = relations(note, ({ one }) => ({
  plan: one(plan, {
    fields: [note.planId],
    references: [plan.id],
  }),
  user: one(user, {
    fields: [note.userId],
    references: [user.id],
  }),
}));

export const planMemberRelations = relations(planMember, ({ one }) => ({
  plan: one(plan, {
    fields: [planMember.planId],
    references: [plan.id],
  }),
  user: one(user, {
    fields: [planMember.userId],
    references: [user.id],
  }),
}));

export const pendingInvitationRelations = relations(
  pendingInvitation,
  ({ one }) => ({
    plan: one(plan, {
      fields: [pendingInvitation.planId],
      references: [plan.id],
    }),
    inviter: one(user, {
      fields: [pendingInvitation.invitedBy],
      references: [user.id],
    }),
  })
);
