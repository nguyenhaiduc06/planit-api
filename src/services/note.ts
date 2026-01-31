import { eq, desc, and, count } from 'drizzle-orm';
import { db, noteTable } from '../db';
import type { CreateNoteInput, UpdateNoteInput, NoteType, Note, NoteWithPlan } from '../types';


export const noteService = {
  /**
   * List all notes for a plan, optionally filtered by type
   */
  async listByPlan(planId: string, type?: NoteType): Promise<Note[]> {
    const conditions = [eq(noteTable.planId, planId)];
    
    if (type) {
      conditions.push(eq(noteTable.type, type));
    }

    const result = await db
      .select()
      .from(noteTable)
      .where(and(...conditions))
      .orderBy(desc(noteTable.createdAt));

    return result as Note[];
  },

  /**
   * Get a single note by ID
   */
  async getById(noteId: string): Promise<Note | null> {
    const [note] = await db
      .select()
      .from(noteTable)
      .where(eq(noteTable.id, noteId))
      .limit(1);

    return (note as Note) || null;
  },

  /**
   * Get a note with its planId (for access checks)
   */
  async getNoteWithPlan(noteId: string): Promise<NoteWithPlan | null> {
    const [note] = await db
      .select({
        id: noteTable.id,
        planId: noteTable.planId,
        userId: noteTable.userId,
        type: noteTable.type,
        content: noteTable.content,
        createdAt: noteTable.createdAt,
        updatedAt: noteTable.updatedAt,
      })
      .from(noteTable)
      .where(eq(noteTable.id, noteId))
      .limit(1);

    return (note as NoteWithPlan) || null;
  },

  /**
   * Create a new note
   */
  async create(data: CreateNoteInput, userId: string): Promise<Note> {
    const [note] = await db
      .insert(noteTable)
      .values({
        planId: data.planId,
        userId,
        type: data.type,
        content: data.content,
      })
      .returning();

    return note as Note;
  },

  /**
   * Update a note's content
   */
  async update(noteId: string, data: UpdateNoteInput): Promise<Note | null> {
    // Get the existing note to merge content
    const existing = await this.getById(noteId);
    if (!existing) {
      return null;
    }

    // Merge the content update with existing content
    const mergedContent = {
      ...(existing.content as object),
      ...data.content,
    };

    const [updated] = await db
      .update(noteTable)
      .set({
        content: mergedContent,
        updatedAt: new Date(),
      })
      .where(eq(noteTable.id, noteId))
      .returning();

    return (updated as Note) || null;
  },

  /**
   * Delete a note
   */
  async delete(noteId: string): Promise<boolean> {
    const result = await db
      .delete(noteTable)
      .where(eq(noteTable.id, noteId))
      .returning({ id: noteTable.id });

    return result.length > 0;
  },

  /**
   * Count notes in a plan (for quota enforcement)
   */
  async countByPlan(planId: string): Promise<number> {
    const [{ value }] = await db
      .select({ value: count() })
      .from(noteTable)
      .where(eq(noteTable.planId, planId));

    return Number(value);
  },
};
