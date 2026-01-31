import { z } from 'zod';

// ============================================
// Note Type
// ============================================

export const noteTypeSchema = z.enum(['text', 'todo', 'calendar', 'location']);

// ============================================
// Content Schemas (for JSONB content field)
// ============================================

// Text note content
export const textNoteContentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  text: z.string().max(10000, 'Content too long').default(''),
});

// Todo item
export const todoItemSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
  text: z.string().min(1, 'Item text is required').max(500, 'Item text too long'),
  completed: z.boolean(),
});

// Todo note content
export const todoNoteContentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  items: z.array(todoItemSchema).max(100, 'Maximum 100 items allowed').default([]),
});

// Calendar note content
export const calendarNoteContentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  allDay: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
  },
  { message: 'End date must be after start date', path: ['endDate'] }
);

// Coordinates
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude'),
  longitude: z.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude'),
});

// Location note content
export const locationNoteContentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  address: z.string().max(500, 'Address too long').optional(),
  coordinates: coordinatesSchema.optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

// Union of all content types
export const noteContentSchema = z.union([
  textNoteContentSchema,
  todoNoteContentSchema,
  calendarNoteContentSchema,
  locationNoteContentSchema,
]);

// ============================================
// Create Note Schemas
// ============================================

export const createTextNoteSchema = z.object({
  planId: z.string().uuid(),
  type: z.literal('text'),
  content: textNoteContentSchema,
});

export const createTodoNoteSchema = z.object({
  planId: z.string().uuid(),
  type: z.literal('todo'),
  content: todoNoteContentSchema,
});

export const createCalendarNoteSchema = z.object({
  planId: z.string().uuid(),
  type: z.literal('calendar'),
  content: calendarNoteContentSchema,
});

export const createLocationNoteSchema = z.object({
  planId: z.string().uuid(),
  type: z.literal('location'),
  content: locationNoteContentSchema,
});

// Generic create note schema (discriminated union)
export const createNoteSchema = z.discriminatedUnion('type', [
  createTextNoteSchema,
  createTodoNoteSchema,
  createCalendarNoteSchema,
  createLocationNoteSchema,
]);

// ============================================
// Update Note Schemas
// ============================================

export const updateTextNoteContentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  text: z.string().max(10000, 'Content too long').optional(),
});

export const updateTodoNoteContentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  items: z.array(todoItemSchema).max(100, 'Maximum 100 items allowed').optional(),
});

export const updateCalendarNoteContentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  allDay: z.boolean().optional(),
});

export const updateLocationNoteContentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long').optional(),
  address: z.string().max(500, 'Address too long').nullable().optional(),
  coordinates: coordinatesSchema.nullable().optional(),
  notes: z.string().max(1000, 'Notes too long').nullable().optional(),
});

export const updateNoteSchema = z.object({
  content: z.union([
    updateTextNoteContentSchema,
    updateTodoNoteContentSchema,
    updateCalendarNoteContentSchema,
    updateLocationNoteContentSchema,
  ]),
});

// ============================================
// Types
// ============================================

export type NoteType = z.infer<typeof noteTypeSchema>;

// Content types
export type TextNoteContent = z.infer<typeof textNoteContentSchema>;
export type TodoItem = z.infer<typeof todoItemSchema>;
export type TodoNoteContent = z.infer<typeof todoNoteContentSchema>;
export type CalendarNoteContent = z.infer<typeof calendarNoteContentSchema>;
export type Coordinates = z.infer<typeof coordinatesSchema>;
export type LocationNoteContent = z.infer<typeof locationNoteContentSchema>;
export type NoteContent = z.infer<typeof noteContentSchema>;

// Create types
export type CreateTextNoteInput = z.infer<typeof createTextNoteSchema>;
export type CreateTodoNoteInput = z.infer<typeof createTodoNoteSchema>;
export type CreateCalendarNoteInput = z.infer<typeof createCalendarNoteSchema>;
export type CreateLocationNoteInput = z.infer<typeof createLocationNoteSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

// Update types
export type UpdateTextNoteContent = z.infer<typeof updateTextNoteContentSchema>;
export type UpdateTodoNoteContent = z.infer<typeof updateTodoNoteContentSchema>;
export type UpdateCalendarNoteContent = z.infer<typeof updateCalendarNoteContentSchema>;
export type UpdateLocationNoteContent = z.infer<typeof updateLocationNoteContentSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

export interface Note {
    id: string;
    planId: string;
    userId: string;
    type: string;
    content: unknown;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface NoteWithPlan {
    id: string;
    planId: string;
    userId: string;
    type: string;
    content: unknown;
    createdAt: Date;
    updatedAt: Date;
  }