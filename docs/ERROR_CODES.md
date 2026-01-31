# Planit API Error Codes

Standardized error responses for all API endpoints.

## Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| code | string | Machine-readable error code |
| message | string | Human-readable description |
| details | object | Additional context (optional) |

---

## Error Codes

### VALIDATION_ERROR

**HTTP Status:** 400 Bad Request

**When:** Request body or query parameters fail validation.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "title",
        "message": "Title is required",
        "constraint": "required"
      },
      {
        "field": "email",
        "message": "Invalid email format",
        "constraint": "invalid_format"
      }
    ]
  }
}
```

**Constraint types:**
- `required` - Field is required but missing
- `min_length` - Below minimum length
- `max_length` - Exceeds maximum length
- `invalid_format` - Wrong format (email, UUID, datetime)
- `invalid_enum` - Not a valid enum value
- `invalid_range` - Number out of allowed range
- `invalid_type` - Wrong data type

---

### UNAUTHORIZED

**HTTP Status:** 401 Unauthorized

**When:** Authentication is missing or invalid.

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**Specific scenarios:**

| Scenario | Message |
|----------|---------|
| No token | "Authentication required" |
| Invalid token | "Invalid authentication token" |
| Expired token | "Session expired, please login again" |
| Invalid credentials | "Invalid email or password" |

---

### FORBIDDEN

**HTTP Status:** 403 Forbidden

**When:** User is authenticated but lacks permission.

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have permission to perform this action"
  }
}
```

**Specific scenarios:**

| Action | Message |
|--------|---------|
| Viewer editing | "Viewers cannot edit plans" |
| Viewer creating note | "Viewers cannot create notes" |
| Non-owner deleting plan | "Only the owner can delete this plan" |
| Non-owner inviting | "Only the owner can invite members" |
| Non-owner changing roles | "Only the owner can change member roles" |
| Owner leaving | "Owner cannot leave the plan" |
| User removing others | "Only the owner can remove members" |
| No plan access | "You don't have access to this plan" |

---

### NOT_FOUND

**HTTP Status:** 404 Not Found

**When:** Requested resource doesn't exist.

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Plan not found"
  }
}
```

**Specific scenarios:**

| Resource | Message |
|----------|---------|
| Plan | "Plan not found" |
| Note | "Note not found" |
| User | "User not found" |
| Member | "Member not found" |

---

### CONFLICT

**HTTP Status:** 409 Conflict

**When:** Action conflicts with existing state.

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Email already registered"
  }
}
```

**Specific scenarios:**

| Scenario | Message |
|----------|---------|
| Email exists | "Email already registered" |
| Already member | "User is already a member of this plan" |
| Already invited | "User has already been invited" |

---

### QUOTA_EXCEEDED

**HTTP Status:** 429 Too Many Requests

**When:** User has hit a resource limit.

```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Maximum number of plans reached",
    "details": {
      "limit": 50,
      "current": 50,
      "resource": "plans"
    }
  }
}
```

**Specific scenarios:**

| Resource | Message | Limit |
|----------|---------|-------|
| Plans | "Maximum number of plans reached" | 50 |
| Notes | "Maximum number of notes reached for this plan" | 100 |
| Members | "Maximum number of members reached for this plan" | 20 |

---

### INTERNAL_ERROR

**HTTP Status:** 500 Internal Server Error

**When:** Unexpected server error.

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong"
  }
}
```

In development, includes stack trace:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong",
    "details": {
      "stack": "Error: Database connection failed\n    at ..."
    }
  }
}
```

---

## HTTP Status Code Summary

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request data |
| 401 | UNAUTHORIZED | Not authenticated |
| 403 | FORBIDDEN | No permission |
| 404 | NOT_FOUND | Resource doesn't exist |
| 409 | CONFLICT | Duplicate/conflicting state |
| 429 | QUOTA_EXCEEDED | Resource limit hit |
| 500 | INTERNAL_ERROR | Server error |

---

## Implementation

### Error Classes

```typescript
// src/lib/errors.ts

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(details: { field: string; message: string; constraint: string }[]) {
    super('VALIDATION_ERROR', 'Validation failed', 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to perform this action") {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export class QuotaExceededError extends AppError {
  constructor(resource: string, limit: number, current: number) {
    super('QUOTA_EXCEEDED', `Maximum number of ${resource} reached`, 429, {
      limit,
      current,
      resource
    });
  }
}
```

### Error Handler Middleware

```typescript
// src/middleware/error.ts

import { Context } from 'hono';
import { AppError } from '../lib/errors';

export function errorHandler(err: Error, c: Context) {
  console.error(err);

  if (err instanceof AppError) {
    return c.json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details })
      }
    }, err.statusCode as any);
  }

  // Unknown error
  const isDev = process.env.NODE_ENV !== 'production';
  return c.json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      ...(isDev && { details: { stack: err.stack } })
    }
  }, 500);
}
```

### Usage in Routes

```typescript
import { ForbiddenError, NotFoundError, QuotaExceededError } from '../lib/errors';

app.delete('/plans/:id', async (c) => {
  const plan = await planService.get(planId);
  
  if (!plan) {
    throw new NotFoundError('Plan');
  }
  
  if (userRole !== 'owner') {
    throw new ForbiddenError('Only the owner can delete this plan');
  }
  
  await planService.delete(planId);
  return c.json({ success: true });
});

app.post('/plans', async (c) => {
  const count = await planService.countByUser(userId);
  
  if (count >= 50) {
    throw new QuotaExceededError('plans', 50, count);
  }
  
  const plan = await planService.create(data, userId);
  return c.json(plan, 201);
});
```
