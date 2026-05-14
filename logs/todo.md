# Phase 8 Progress Log

Date: 2026-05-14

## Requirements applied
- `expires_at` is optional. If empty, account never expires.
- Existing `USER` role in DB remains valid (no forced migration to STAFF).

## Implemented in this round

### 1) Auth expiration enforcement
- Added runtime column ensure for `users.expires_at` (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
- Login now denies expired accounts.
- Authorized callback now blocks expired sessions from accessing system routes.
- JWT/session now carry `expiresAt`.

### 2) User Management (ADMIN-only)
- Added Settings API for users:
  - `GET /api/v1/settings/users`
  - `POST /api/v1/settings/users`
  - `PATCH /api/v1/settings/users/[id]`
  - `DELETE /api/v1/settings/users/[id]` (soft delete)
- Added validation schema for create/update user.
- Added password policy validation (8+ chars, lower/upper/number/symbol).

### 3) UI and Sidebar integration
- Added `User Management` submenu under Settings Expand (visible to ADMIN only).
- Added admin-only user management page with CRUD form/table:
  - username
  - password (+ Auto gen 8 chars)
  - role selector (STAFF default, ADMIN)
  - expire date optional

### 4) Legacy role behavior
- Updated role helper so `USER` is treated as non-admin/staff-level restrictions.
- Kept DB role value `USER` intact.

## Files changed
- `prisma/schema.prisma`
- `src/lib/user-management.ts`
- `src/lib/auth.ts`
- `src/lib/auth.config.ts`
- `src/types/next-auth.d.ts`
- `src/lib/roles.ts`
- `src/lib/validations.ts`
- `src/components/dashboard/sidebar.tsx`
- `src/app/api/v1/settings/users/route.ts`
- `src/app/api/v1/settings/users/[id]/route.ts`
- `src/app/(dashboard)/settings/users/page.tsx`
- `src/app/(dashboard)/settings/users/users-client.tsx`

## Pending follow-up
- Add Prisma migration file for `expires_at` (if team requires versioned migration in repo).
- Add extra safeguards (prevent deleting last ADMIN / self-demotion) if policy requires strict admin continuity.
