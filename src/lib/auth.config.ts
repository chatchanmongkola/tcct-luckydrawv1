import type { NextAuthConfig } from "next-auth";

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

      const isAuthPage = pathname.startsWith("/login");
      const isApiAuth = pathname.startsWith("/api/auth");
      const isDrawPage = pathname.startsWith("/draw/");

      if (isApiAuth || isDrawPage) return true;
      if (isAuthPage) return !isLoggedIn;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = typeof token.role === "string" ? token.role : "USER";
      }
      return session;
    },
  },
  providers: [],
};
