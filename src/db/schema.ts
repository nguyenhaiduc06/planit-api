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

import { userTable } from "@/db/auth-schema";

// -----------------------------------------------------------------------------
// Plan
// -----------------------------------------------------------------------------

export const planTable = pgTable(
  "plan",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
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

export const noteTable = pgTable(
  "note",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => planTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
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

export const planMemberTable = pgTable(
  "plan_member",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => planTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
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

export const pendingInvitationTable = pgTable(
  "pending_invitation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => planTable.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: pendingInvitationRoleEnum }).notNull(),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
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

export const planRelations = relations(planTable, ({ one, many }) => ({
  user: one(userTable, {
    fields: [planTable.userId],
    references: [userTable.id],
  }),
  notes: many(noteTable),
  planMembers: many(planMemberTable),
  pendingInvitations: many(pendingInvitationTable),
}));

export const noteRelations = relations(noteTable, ({ one }) => ({
  plan: one(planTable, {
    fields: [noteTable.planId],
    references: [planTable.id],
  }),
  user: one(userTable, {
    fields: [noteTable.userId],
    references: [userTable.id],
  }),
}));

export const planMemberRelations = relations(planMemberTable, ({ one }) => ({
  plan: one(planTable, {
    fields: [planMemberTable.planId],
    references: [planTable.id],
  }),
  user: one(userTable, {
    fields: [planMemberTable.userId],
    references: [userTable.id],
  }),
}));

export const pendingInvitationRelations = relations(
  pendingInvitationTable,
  ({ one }) => ({
    plan: one(planTable, {
      fields: [pendingInvitationTable.planId],
      references: [planTable.id],
    }),
    inviter: one(userTable, {
      fields: [pendingInvitationTable.invitedBy],
      references: [userTable.id],
    }),
  })
);
