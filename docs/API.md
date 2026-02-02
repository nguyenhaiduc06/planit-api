# Planit API

API documentation for plans, notes, and plan members.

## OpenAPI spec

Full request/response schemas and all endpoints are in **OpenAPI 3.1** format:

- **`docs/openapi.yaml`** — Use with Swagger UI, Redoc, or any OpenAPI tool.

Example with Swagger UI: paste the contents of `openapi.yaml` into [editor.swagger.io](https://editor.swagger.io) or serve it from your app and point Swagger UI at it.

## Base URL and auth

- **Base URL:** Your deployment root (e.g. `https://api.example.com`).
- **Auth:** [better-auth](https://www.better-auth.com) at `/api/auth/*` (sign-in, sign-up, session, sign-out). Use cookie or Bearer token for authenticated requests.
- **Error format:** All errors return JSON: `{ "code": string, "message": string, "details"?: object }`. See [ERROR_CODES.md](./ERROR_CODES.md) for codes and status codes.

## Endpoints overview

| Resource   | Path | Methods | Description |
|-----------|------|--------|-------------|
| Root      | `/` | GET | Health / hello |
| Auth      | `/api/auth/*` | GET, POST | better-auth (session, sign-in, sign-up, sign-out) |
| Plans     | `/plans` | GET, POST | List my plans (paginated), create plan |
| Plan      | `/plans/:id` | GET, PUT, DELETE | Get/update/delete plan (role-based) |
| Members   | `/plans/:id/members` | GET, POST | List members/invitations, invite (owner only) |
| Member    | `/plans/:id/members/:userId` | PUT, DELETE | Update role (owner), remove/leave |
| Invitation| `/plans/:id/members/invitations/:email` | DELETE | Cancel pending invite (owner only) |
| Notes     | `/notes` | POST | Create note (text, todo, calendar, location) |
| Notes by plan | `/notes/plan/:planId` | GET | List notes for a plan (paginated) |
| Note      | `/notes/:id` | GET, PUT, DELETE | Get/update/delete note (editor+ on plan) |

**Roles:** `owner` (full access, delete plan, manage members) → `editor` (create/edit notes and plan) → `viewer` (read-only).

For full path details, request/response bodies, and error responses, see **`docs/openapi.yaml`**.

> **Note:** Member endpoints are documented in the OpenAPI spec. To expose them, mount the members routes under a plan in your app (e.g. `planRoute.route("/:id/members", membersRoutes)`).
