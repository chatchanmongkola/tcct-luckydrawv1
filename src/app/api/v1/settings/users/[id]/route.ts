import bcrypt from "bcryptjs";

import { auth } from "@/lib/auth";
import { createAccessLogSafe } from "@/lib/access-logs";
import { fail, ok } from "@/lib/api-response";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { ensureUserManagementColumns } from "@/lib/user-management";
import { updateUserSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
    try {
        const session = await auth();
        if (!session?.user) {
            return fail("Unauthorized.", "UNAUTHORIZED", { status: 401 });
        }
        if (!isAdminRole(session.user.role)) {
            return fail("Forbidden.", "FORBIDDEN", { status: 403 });
        }

        await ensureUserManagementColumns();

        const { id } = await params;
        const body = await request.json();
        const parsed = updateUserSchema.safeParse(body);
        if (!parsed.success) {
            return fail("Invalid input.", "VALIDATION_ERROR", { status: 400 });
        }

        const existing = await db.user.findUnique({
            where: { id },
            select: { id: true, username: true, role: true, isDeleted: true },
        });

        if (!existing || existing.isDeleted) {
            return fail("User not found.", "USER_NOT_FOUND", { status: 404 });
        }

        const updateData: {
            username?: string;
            email?: string;
            role?: string;
            password?: string;
        } = {};

        if (parsed.data.username) {
            const username = parsed.data.username.trim().toLowerCase();
            const email = `${username}@luckydraw.local`;

            const duplicate = await db.user.findFirst({
                where: {
                    id: { not: id },
                    OR: [{ username }, { email }],
                },
                select: { id: true },
            });
            if (duplicate) {
                return fail("Username already exists.", "USERNAME_EXISTS", {
                    status: 409,
                });
            }

            updateData.username = username;
            updateData.email = email;
        }

        if (parsed.data.role) {
            updateData.role = parsed.data.role;
        }

        if (parsed.data.password) {
            updateData.password = await bcrypt.hash(parsed.data.password, 12);
        }

        if (Object.keys(updateData).length > 0) {
            await db.user.update({
                where: { id },
                data: updateData,
            });
        }

        if (Object.prototype.hasOwnProperty.call(parsed.data, "expiresAt")) {
            const expiresAt = parsed.data.expiresAt
                ? new Date(parsed.data.expiresAt)
                : null;
            await db.$executeRawUnsafe(
                `UPDATE "users" SET "expires_at" = $2 WHERE "id" = $1`,
                id,
                expiresAt,
            );
        }

        const updated = (await db.$queryRawUnsafe(
            `
            SELECT
                u."id",
                u."username",
                u."role",
                u."is_deleted" AS "isDeleted",
                u."created_at" AS "createdAt",
                u."updated_at" AS "updatedAt",
                u."expires_at" AS "expiresAt"
            FROM "users" u
            WHERE u."id" = $1
            LIMIT 1
            `,
            id,
        )) as Array<{
            id: string;
            username: string;
            role: string;
            isDeleted: boolean;
            createdAt: Date;
            updatedAt: Date;
            expiresAt: Date | null;
        }>;

        const row = updated[0];

        await createAccessLogSafe({
            actorId: session.user.id,
            action: "USER_UPDATE",
            targetType: "user",
            targetId: id,
            metadata: {
                username: row.username,
                role: row.role,
                expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
                passwordUpdated: Boolean(parsed.data.password),
            },
        });

        return ok({
            ...row,
            expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
        });
    } catch (error) {
        console.error("Failed to update user", error);
        return fail("Failed to update user.", "USER_UPDATE_FAILED", {
            status: 500,
        });
    }
}

export async function DELETE(_request: Request, { params }: Params) {
    try {
        const session = await auth();
        if (!session?.user) {
            return fail("Unauthorized.", "UNAUTHORIZED", { status: 401 });
        }
        if (!isAdminRole(session.user.role)) {
            return fail("Forbidden.", "FORBIDDEN", { status: 403 });
        }

        const { id } = await params;
        const existing = await db.user.findUnique({
            where: { id },
            select: { id: true, username: true, role: true, isDeleted: true },
        });

        if (!existing || existing.isDeleted) {
            return fail("User not found.", "USER_NOT_FOUND", { status: 404 });
        }

        await db.user.update({
            where: { id },
            data: { isDeleted: true },
        });

        await createAccessLogSafe({
            actorId: session.user.id,
            action: "USER_DELETE",
            targetType: "user",
            targetId: id,
            metadata: {
                username: existing.username,
                role: existing.role,
            },
        });

        return ok({ id, deleted: true });
    } catch (error) {
        console.error("Failed to delete user", error);
        return fail("Failed to delete user.", "USER_DELETE_FAILED", {
            status: 500,
        });
    }
}
