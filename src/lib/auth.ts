import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { authConfig } from "@/lib/auth.config";
import { db } from "@/lib/db";
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

                    return {
                        id: user.id,
                        name: user.name ?? user.username,
                        email: user.email,
                        role: user.role,
                    };
                } catch (error) {
                    console.error("Credentials authorize failed", error);
                    return null;
                }
            },
        }),
    ],
});
