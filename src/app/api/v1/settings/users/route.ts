import bcrypt from "bcryptjs";

import { auth } from "@/lib/auth";
import { createAccessLogSafe } from "@/lib/access-logs";
import { fail, ok } from "@/lib/api-response";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/roles";
import { ensureUserManagementColumns } from "@/lib/user-management";
import { createUserSchema } from "@/lib/validations";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return fail("Unauthorized.", "UNAUTHORIZED", { status: 401 });
        }
        if (!isAdminRole(session.user.role)) {
            return fail("Forbidden.", "FORBIDDEN", { status: 403 });
        }

        await ensureUserManagementColumns();

        const users = (await db.$queryRawUnsafe(
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
            WHERE u."is_deleted" = false
            ORDER BY u."created_at" DESC
            `,
        )) as Array<{
            id: string;
            username: string;
            role: string;
            isDeleted: boolean;
            createdAt: Date;
            updatedAt: Date;
            expiresAt: Date | null;
        }>;

        return ok(
            users.map((user) => ({
                ...user,
                expiresAt: user.expiresAt ? user.expiresAt.toISOString() : null,
            })),
        );
    } catch (error) {
        console.error("Failed to list users", error);
        return fail("Failed to load users.", "USER_LIST_FAILED", { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return fail("Unauthorized.", "UNAUTHORIZED", { status: 401 });
        }
        if (!isAdminRole(session.user.role)) {
            return fail("Forbidden.", "FORBIDDEN", { status: 403 });
        }

        await ensureUserManagementColumns();

        const body = await request.json();
        const parsed = createUserSchema.safeParse(body);
        if (!parsed.success) {
            return fail("Invalid input.", "VALIDATION_ERROR", { status: 400 });
        }

        const username = parsed.data.username.trim().toLowerCase();
        const email = `${username}@luckydraw.local`;

        const exists = await db.user.findFirst({
            where: {
                OR: [{ username }, { email }],
            },
            select: { id: true },
        });

        if (exists) {
            return fail("Username already exists.", "USERNAME_EXISTS", { status: 409 });
        }

        const hashed = await bcrypt.hash(parsed.data.password, 12);

        const created = await db.user.create({
            data: {
                username,
                email,
                password: hashed,
                role: parsed.data.role,
            },
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
            },
        });

        const expiresAt = parsed.data.expiresAt
            ? new Date(parsed.data.expiresAt)
            : null;

        await db.$executeRawUnsafe(
            `UPDATE "users" SET "expires_at" = $2 WHERE "id" = $1`,
            created.id,
            expiresAt,
        );

        await createAccessLogSafe({
            actorId: session.user.id,
            action: "USER_CREATE",
            targetType: "user",
            targetId: created.id,
            metadata: {
                username: created.username,
                role: created.role,
                expiresAt: expiresAt ? expiresAt.toISOString() : null,
            },
        });

        return ok(
            {
                ...created,
                expiresAt: expiresAt ? expiresAt.toISOString() : null,
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Failed to create user", error);
        return fail("Failed to create user.", "USER_CREATE_FAILED", { status: 500 });
    }
}
