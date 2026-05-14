import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { authConfig } from "@/lib/auth.config";
import { isExpiredAt } from "@/lib/expiry";
import { createAccessLog } from "@/lib/access-logs";
import { db } from "@/lib/db";
import { ensureUserManagementColumns } from "@/lib/user-management";
import { loginSchema } from "@/lib/validations";

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            credentials: {
                email: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                try {
                    await ensureUserManagementColumns();

                    const parsed = loginSchema.safeParse(credentials);
                    if (!parsed.success) return null;

                    const { email, password } = parsed.data;
                    const identity = email.trim().toLowerCase();

                    const user = await db.user.findFirst({
                        where: {
                            isDeleted: false,
                            OR: [{ email: identity }, { username: identity }],
                        },
                    });

                    if (!user) {
                        return null;
                    }

                    const isValidPassword = await bcrypt.compare(
                        password,
                        user.password,
                    );
                    if (!isValidPassword) {
                        return null;
                    }

                    const expiryRows = (await db.$queryRawUnsafe(
                        `
                        SELECT "expires_at" AS "expiresAt"
                        FROM "users"
                        WHERE "id" = $1
                        LIMIT 1
                        `,
                        user.id,
                    )) as Array<{ expiresAt: Date | null }>;

                    const expiresAt = expiryRows[0]?.expiresAt ?? null;
                    if (isExpiredAt(expiresAt)) {
                        return null;
                    }

                    await createAccessLog({
                        actorId: user.id,
                        action: "AUTH_LOGIN",
                        targetType: "user",
                        targetId: user.id,
                        metadata: {
                            username: user.username,
                        },
                    });

                    return {
                        id: user.id,
                        name: user.name ?? user.username,
                        email: user.email,
                        role: user.role,
                        expiresAt: expiresAt ? expiresAt.toISOString() : null,
                    };
                } catch (error) {
                    console.error("Credentials authorize failed", error);
                    return null;
                }
            },
        }),
    ],
});
