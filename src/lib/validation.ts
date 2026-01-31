import { zValidator } from "@hono/zod-validator";
import { flattenError } from "zod";

import { ValidationError } from "@/lib/errors";

/**
 * Maps a Zod error to the ValidationError details shape and throws.
 * Use in zValidator error callbacks so all validation errors are handled by app.onError().
 * Works with both Zod v3 and v4 (uses flattenError for v4's $ZodError).
 */
export function throwValidationError(error: unknown): never {
  const flattened = flattenError(error as Parameters<typeof flattenError>[0]);
  const fieldErrors = (flattened.fieldErrors ?? {}) as Record<string, string[] | undefined>;
  const details = Object.entries(fieldErrors).map(([field, messages]) => ({
    field,
    message: messages?.[0] ?? "Invalid",
    constraint: field,
  }));
  throw new ValidationError(details);
}

/** Hook that throws ValidationError on failure. Used by validated(). */
const validationHook = (result: { success: boolean; error?: unknown }, _c: unknown) => {
  if (!result.success && result.error != null) throwValidationError(result.error);
};

type ZodSchema = Parameters<typeof zValidator>[1];

/**
 * zValidator with the throw-on-error hook applied. Use instead of zValidator when you want
 * validation failures to throw ValidationError and be handled by app.onError().
 */
export function validated<Target extends "query" | "json" | "param" | "header" | "cookie">(
  target: Target,
  schema: ZodSchema
) {
  return zValidator(target, schema, validationHook as Parameters<typeof zValidator>[2]);
}
