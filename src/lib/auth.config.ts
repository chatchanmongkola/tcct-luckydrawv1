import type { NextAuthConfig } from "next-auth";

import { isExpiredAt } from "@/lib/expiry";

export const authConfig: NextAuthConfig = {
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: { strategy: "jwt" },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const pathname = nextUrl.pathname;
            const isExpired = isExpiredAt(auth?.user?.expiresAt ?? null);

            const isAuthPage = pathname.startsWith("/login");
            const isApiAuth = pathname.startsWith("/api/auth");

            if (isApiAuth) return true;
            if (isExpired) return false;
            if (isAuthPage) return !isLoggedIn;
            return isLoggedIn;
        },
        jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.expiresAt = user.expiresAt ?? null;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role =
                    typeof token.role === "string" ? token.role : "USER";
                session.user.expiresAt =
                    typeof token.expiresAt === "string"
                        ? token.expiresAt
                        : null;
            }
            return session;
        },
    },
    providers: [],
};
